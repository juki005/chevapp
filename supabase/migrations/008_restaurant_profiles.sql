-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 008: Restaurant Profile Upgrade
-- Adds slug, rating, review_count, description, tags_style, tags_meat columns
-- to restaurants and creates the restaurant_reviews table.
-- Run in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS guards).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── Part 1: Extend restaurants table ─────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS slug          TEXT,
  ADD COLUMN IF NOT EXISTS rating        FLOAT   NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS review_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS tags_style    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags_meat     TEXT[]  NOT NULL DEFAULT '{}';

-- Generate URL-safe slugs from restaurant names for all existing rows.
-- TRANSLATE handles the most common Croatian diacritics.
-- REGEXP_REPLACE collapses any run of non-alphanumeric chars into a single hyphen.
UPDATE public.restaurants
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(name, 'čćšžđČĆŠŽĐ', 'ccszdccszd'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'   -- trim leading / trailing hyphens
  )
)
WHERE slug IS NULL OR slug = '';

-- If two restaurants produced the same slug, append the first 8 chars of UUID.
-- Running twice is safe; second run finds no NULL slugs.
UPDATE public.restaurants r
SET slug = r.slug || '-' || LEFT(r.id::text, 8)
WHERE r.id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
    FROM public.restaurants
  ) sub
  WHERE rn > 1
);

-- Enforce uniqueness going forward.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurants_slug_unique'
    AND   conrelid = 'public.restaurants'::regclass
  ) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_slug_unique UNIQUE (slug);
  END IF;
END $$;


-- ── Part 2: restaurant_reviews table ─────────────────────────────────────────
-- Separate from the existing `reviews` table (which stores quick emoji scores).
-- This table holds rich, text-based reviews for the profile page.

CREATE TABLE IF NOT EXISTS public.restaurant_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name       TEXT        NOT NULL DEFAULT 'Anonimni gost',
  user_avatar_url TEXT,
  reviewer_tag    TEXT,       -- e.g. 'Dalmatinski gurman', 'Sarajevlija'
  review_text     TEXT        NOT NULL,
  rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Part 3: RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.restaurant_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'restaurant_reviews' AND policyname = 'restaurant_reviews_public_read'
  ) THEN
    CREATE POLICY restaurant_reviews_public_read
      ON public.restaurant_reviews FOR SELECT USING (true);
  END IF;
END $$;

-- Authenticated users can insert their own reviews
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'restaurant_reviews' AND policyname = 'restaurant_reviews_auth_insert'
  ) THEN
    CREATE POLICY restaurant_reviews_auth_insert
      ON public.restaurant_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;


-- ── Part 4: Seed sample reviews (safe with ON CONFLICT DO NOTHING not needed;
--   we check row count to avoid re-seeding)
-- Insert only if the table is empty.

DO $$
DECLARE
  v_id UUID;
BEGIN
  -- Pick the first restaurant to seed reviews for
  SELECT id INTO v_id FROM public.restaurants ORDER BY created_at LIMIT 1;

  IF v_id IS NOT NULL AND (SELECT COUNT(*) FROM public.restaurant_reviews) = 0 THEN
    INSERT INTO public.restaurant_reviews
      (restaurant_id, user_name, reviewer_tag, review_text, rating)
    VALUES
      (v_id, 'MarkoM',    'Sarajevlija',         'Ćevapi su točno onakvi kakvi trebaju biti — sočni, začinjeni i serviani u toplom somunu. Kajmak je bio savršen. Jedini minus je što je red bio dugačak, ali vrijedi svake minute.', 5),
      (v_id, 'SaraK',     'Dalmatinski gurman',  'Bila sam skeptična prema sarajevskom stilu, ali ovo me je potpuno uvjerilo. Meso je mirisno, somun svjež. Vraćam se definitivno!', 5),
      (v_id, 'Grill_Luka','Roštilj entuzijast',  'Solidna porcija, dobar omjer mesa. Usluga je brza, što cijenim. Jedino bih volio malo više cajmaka u somunu.', 4),
      (v_id, 'ZoranB',    'Redoviti posjetitelj', 'Moje omiljeno mjesto u gradu. Uvijek konstantna kvaliteta, što je rijetko. Posebno preporučujem pola porcije s dvostrukim lukom.',   5);

    -- Update the denormalized rating and review_count
    UPDATE public.restaurants
    SET
      rating       = (SELECT AVG(rating)   FROM public.restaurant_reviews WHERE restaurant_id = v_id),
      review_count = (SELECT COUNT(*)       FROM public.restaurant_reviews WHERE restaurant_id = v_id)
    WHERE id = v_id;
  END IF;
END $$;
