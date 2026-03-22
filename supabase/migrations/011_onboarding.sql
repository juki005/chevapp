-- ── Migration 011: Onboarding fields on profiles ─────────────────────────────
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS condiment_pref       TEXT    CHECK (condiment_pref IN ('kajmak', 'ajvar')),
  ADD COLUMN IF NOT EXISTS home_city            TEXT;

-- Back-fill existing users as "already onboarded" so they don't see the flow
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE username IS NOT NULL OR xp_points > 0;
