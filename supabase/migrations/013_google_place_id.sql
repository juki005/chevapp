-- ── Migration 013: Add google_place_id to restaurants ────────────────────────
-- Run in the Supabase SQL Editor.

-- 1. Add google_place_id column (unique so one Google place maps to one row)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;

-- 2. Index for fast lookups during upsert-on-tag
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id
  ON public.restaurants (google_place_id)
  WHERE google_place_id IS NOT NULL;
