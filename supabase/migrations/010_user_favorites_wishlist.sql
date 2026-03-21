-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: User Favorites & Wishlist
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_favorites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id)  ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own favorites
CREATE POLICY "user_favorites: owner full access"
  ON public.user_favorites FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── user_wishlist ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_wishlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id)  ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own wishlist
CREATE POLICY "user_wishlist: owner full access"
  ON public.user_wishlist FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
