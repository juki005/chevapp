-- ── Migration 012: News posts + weight_kg + is_admin ─────────────────────────
-- Run in the Supabase SQL Editor.

-- 1. Add weight_kg and is_admin to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS is_admin  BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create news_posts table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  image_url  TEXT,
  author_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS on news_posts
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "news_read_all"
  ON public.news_posts FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "news_insert_admin"
  ON public.news_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Only admins can update/delete
CREATE POLICY "news_modify_admin"
  ON public.news_posts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "news_delete_admin"
  ON public.news_posts FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 4. Seed one example post
INSERT INTO public.news_posts (title, content, image_url) VALUES (
  'ChevApp je lansiran! 🔥',
  'Dobrodošli na ChevApp — prvi digitalni vodič za ćevapi na Balkanu. Pronađi restorane, vrti rulet, osvajaj XP i postani Maestro od ćevapa. Hajde da jedemo!',
  NULL
) ON CONFLICT DO NOTHING;
