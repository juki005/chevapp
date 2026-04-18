-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 016: UGC Architecture — Place Reviews, Moderation Queue, Photo Bucket
-- Run in: Supabase Dashboard → SQL Editor → Run
--
-- SCOPE
--   1. public.place_reviews   — user reviews keyed by Google Place ID
--   2. public.restaurants     — add is_approved + submitted_by (moderation queue)
--   3. storage.user_photos    — photo bucket + RLS
--
-- NOTE ON NAMING
--   The existing public.reviews table (migration 003) is FK-keyed to
--   public.restaurants(id). This sprint introduces a SEPARATE table, place_reviews,
--   keyed by Google Place ID string directly — so users can review Google Places
--   results that haven't yet been mirrored into public.restaurants.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1 — public.place_reviews
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.place_reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id      TEXT        NOT NULL,                  -- Google Place ID

  rating_meat   SMALLINT    NOT NULL CHECK (rating_meat  BETWEEN 1 AND 5),
  rating_bread  SMALLINT    NOT NULL CHECK (rating_bread BETWEEN 1 AND 5),
  comment       TEXT                 CHECK (comment IS NULL OR char_length(comment) <= 2000),

  photo_url     TEXT,                                  -- Optional Supabase Storage URL

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ★ ONE review per user per place ★
  CONSTRAINT place_reviews_user_place_unique UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_place_reviews_place_id
  ON public.place_reviews (place_id);

CREATE INDEX IF NOT EXISTS idx_place_reviews_user_id
  ON public.place_reviews (user_id);

-- Auto-bump updated_at on edits
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS place_reviews_touch_updated_at ON public.place_reviews;
CREATE TRIGGER place_reviews_touch_updated_at
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "place_reviews_public_read" ON public.place_reviews;
CREATE POLICY "place_reviews_public_read"
  ON public.place_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "place_reviews_owner_insert" ON public.place_reviews;
CREATE POLICY "place_reviews_owner_insert"
  ON public.place_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_reviews_owner_update" ON public.place_reviews;
CREATE POLICY "place_reviews_owner_update"
  ON public.place_reviews FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_reviews_owner_delete" ON public.place_reviews;
CREATE POLICY "place_reviews_owner_delete"
  ON public.place_reviews FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 2 — Moderation queue on public.restaurants
-- Add is_approved (true for Google-fetched, false for user-submitted)
-- and submitted_by (optional, so we know who submitted it).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS is_approved  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS submitted_by UUID             REFERENCES auth.users(id) ON DELETE SET NULL;

-- Everything already in the table was seeded from Google → keep approved.
UPDATE public.restaurants
SET    is_approved = true
WHERE  is_approved IS NULL;

-- Partial index powers the admin moderation queue (cheap — only indexes pending rows)
CREATE INDEX IF NOT EXISTS idx_restaurants_pending
  ON public.restaurants (created_at DESC)
  WHERE is_approved = false;

-- ── Tighten RLS: only approved rows are world-readable (submitter sees own) ──
-- Note: migration 014 defined the baseline restaurants policies; we replace
-- the public-read one here.
DROP POLICY IF EXISTS "restaurants_public_read" ON public.restaurants;
CREATE POLICY "restaurants_public_read"
  ON public.restaurants FOR SELECT
  USING (
    is_approved = true
    OR auth.uid() = submitted_by
  );

-- Any authenticated user can submit a new place — BUT it lands as pending.
DROP POLICY IF EXISTS "restaurants_auth_submit" ON public.restaurants;
CREATE POLICY "restaurants_auth_submit"
  ON public.restaurants FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND is_approved  = false          -- Force pending on user submission
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 3 — Storage bucket: user_photos
-- Server-side caps: 512 KB hard ceiling, jpeg/png/webp only.
-- Client-side compression (see lib/utils/imageCompression.ts) targets 500 KB.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_photos',
  'user_photos',
  true,                                                 -- Public: URLs work for anon visitors
  524288,                                               -- 512 KB hard ceiling
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS on storage.objects (bucket-scoped) ───────────────────────────────────

-- Anyone (incl. anon) can view photos
DROP POLICY IF EXISTS "user_photos_public_read" ON storage.objects;
CREATE POLICY "user_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user_photos');

-- Authenticated users can upload — BUT only into their own {uid}/ folder.
-- Enforces the path convention: "{auth.uid()}/{place_id}/{uuid}.{ext}"
DROP POLICY IF EXISTS "user_photos_auth_insert" ON storage.objects;
CREATE POLICY "user_photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user_photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own photos only
DROP POLICY IF EXISTS "user_photos_owner_delete" ON storage.objects;
CREATE POLICY "user_photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update (replace) their own photos only
DROP POLICY IF EXISTS "user_photos_owner_update" ON storage.objects;
CREATE POLICY "user_photos_owner_update"
  ON storage.objects FOR UPDATE
  USING      (bucket_id = 'user_photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'user_photos' AND (storage.foldername(name))[1] = auth.uid()::text);
