-- ============================================================
-- ChevApp — Reviews Migration
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  restaurant_id UUID        NOT NULL REFERENCES public.restaurants(id)  ON DELETE CASCADE,

  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Quick-select toggles
  with_onion    BOOLEAN     NOT NULL DEFAULT false,
  with_kajmak   BOOLEAN     NOT NULL DEFAULT false,
  with_ajvar    BOOLEAN     NOT NULL DEFAULT false,

  comment       TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per user per restaurant
  CONSTRAINT reviews_user_restaurant_unique UNIQUE (user_id, restaurant_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read (Finder page, leaderboard, stats)
DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can insert / update / delete only their own rows
DROP POLICY IF EXISTS "reviews_owner_write" ON public.reviews;
CREATE POLICY "reviews_owner_write"
  ON public.reviews FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Ensure profiles is publicly readable for leaderboard ─────────────────────
-- (safe to re-run — drops and recreates)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_owner_write" ON public.profiles;
CREATE POLICY "profiles_owner_write"
  ON public.profiles FOR ALL
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
