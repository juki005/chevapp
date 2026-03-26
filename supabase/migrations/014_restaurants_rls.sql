-- ── Migration 014: RLS for restaurants table ─────────────────────────────────
-- The restaurants table was created without RLS configuration.
-- All other tables (reviews, profiles, recipes, etc.) have explicit public-read
-- policies. This migration brings restaurants into parity.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (all statements are idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS (no-op if already enabled)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Public read — anyone (including anonymous/anon key) can SELECT
DROP POLICY IF EXISTS "restaurants: public read" ON public.restaurants;
CREATE POLICY "restaurants: public read"
  ON public.restaurants
  FOR SELECT
  USING (true);

-- 3. Authenticated write — only signed-in users can INSERT/UPDATE/DELETE
--    (tighten further with is_admin check once admin role is enforced)
DROP POLICY IF EXISTS "restaurants: auth write" ON public.restaurants;
CREATE POLICY "restaurants: auth write"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
