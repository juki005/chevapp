-- ============================================================
-- ChevApp — Gamification Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. user_stats ─────────────────────────────────────────────────────────────
-- Separate from profiles so gamification data can evolve independently.
-- One row per user, created automatically on first XP award.

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total                  INTEGER     NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  current_streak            INTEGER     NOT NULL DEFAULT 0,
  last_activity_date        DATE,
  rank_title                TEXT        NOT NULL DEFAULT 'Početnik',
  daily_challenge_claimed_at DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_stats_updated_at ON public.user_stats;
CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_stats: owner read"   ON public.user_stats;
DROP POLICY IF EXISTS "user_stats: owner write"  ON public.user_stats;
DROP POLICY IF EXISTS "user_stats: public read"  ON public.user_stats;

-- Anyone can read (leaderboard needs this)
CREATE POLICY "user_stats: public read"
  ON public.user_stats FOR SELECT USING (true);

-- Users can only upsert/update their own row
CREATE POLICY "user_stats: owner write"
  ON public.user_stats FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 2. word_of_the_day ────────────────────────────────────────────────────────
-- display_date is nullable — NULL means "available in random pool only"
-- A specific display_date pins the word to that calendar day.

CREATE TABLE IF NOT EXISTS public.word_of_the_day (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  word         TEXT        NOT NULL,
  definition   TEXT        NOT NULL,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  display_date DATE        UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.word_of_the_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "word_of_day: public read" ON public.word_of_the_day;
CREATE POLICY "word_of_day: public read"
  ON public.word_of_the_day FOR SELECT USING (true);

-- Only admins / service role can insert/update words
DROP POLICY IF EXISTS "word_of_day: service write" ON public.word_of_the_day;
CREATE POLICY "word_of_day: service write"
  ON public.word_of_the_day FOR ALL
  USING (auth.role() = 'service_role');


-- ── 3. Seed word_of_the_day pool ─────────────────────────────────────────────
-- These words are in the random pool (display_date = NULL) so they will show up
-- when no specific word is assigned to today.

INSERT INTO public.word_of_the_day (word, definition, tags) VALUES
  ('Ćevapi',      'Ručno oblikovane mesne rolade, grilane na žaru. Simbol balkanske kuhinje.', ARRAY['meso','osnove']),
  ('Somun',       'Mekani bosanski kruh, pečen na kamenu. Neophodan prilog uz ćevape.', ARRAY['kruh','tradicija']),
  ('Kajmak',      'Kremasti mliječni namaz od kuhanja svježeg mlijeka. Bogatog okusa i baršunaste teksture.', ARRAY['mliječno','prilog']),
  ('Ajvar',       'Začinski umak od pečenih crvenih paprika i patlidžana. Balkanski kečap.', ARRAY['umak','vegetarijansko']),
  ('Lepinja',     'Pljosnati, mekani kruh. U nekim regijama zamjena za somun uz ćevape.', ARRAY['kruh','osnove']),
  ('Pljeskavica', 'Velika grilana mesna pljeskavica. Brat ćevapa, veća i ravnija.', ARRAY['meso','roštilj']),
  ('Suho meso',   'Traditionally dried and cured meat, often served as an appetizer alongside ćevapi.', ARRAY['meso','predjelo']),
  ('Roštilj',     'Grill ili žar na drveni ugljen. Srce balkanske kuhinje na otvorenom.', ARRAY['tehnika','oprema']),
  ('Žar',         'Ugasnuta žeravica bez plamena. Savršena temperatura za ćevape — 250-300°C.', ARRAY['tehnika','temperatura']),
  ('Mješano',     'Kombinirana porcija raznih mesnih specijaliteta s roštilja. Za prave gurmane.', ARRAY['meso','specijalitet'])
ON CONFLICT DO NOTHING;


-- ── 4. Helper function: upsert_user_stats ─────────────────────────────────────
-- Called by the app to award XP and update streak in one atomic operation.
-- Returns the updated row.

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_points  INTEGER
)
RETURNS public.user_stats
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  today      DATE := CURRENT_DATE;
  v_row      public.user_stats;
  v_streak   INTEGER;
  v_rank     TEXT;
BEGIN
  -- Upsert row (creates on first call for this user)
  INSERT INTO public.user_stats (user_id, xp_total, current_streak, last_activity_date)
  VALUES (p_user_id, p_points, 1, today)
  ON CONFLICT (user_id) DO UPDATE
    SET xp_total = public.user_stats.xp_total + p_points,
        updated_at = NOW()
  RETURNING * INTO v_row;

  -- Streak logic ────────────────────────────────────────────────────
  IF v_row.last_activity_date IS NULL OR v_row.last_activity_date < today - INTERVAL '1 day' THEN
    -- Gap > 1 day → reset streak to 1
    v_streak := 1;
  ELSIF v_row.last_activity_date = today - INTERVAL '1 day' THEN
    -- Consecutive day → increment
    v_streak := v_row.current_streak + 1;
  ELSE
    -- Same day → no change
    v_streak := v_row.current_streak;
  END IF;

  -- Rank assignment ─────────────────────────────────────────────────
  v_rank := CASE
    WHEN v_row.xp_total >= 4000 THEN 'Maestro'
    WHEN v_row.xp_total >= 2000 THEN 'Šef'
    WHEN v_row.xp_total >= 1000 THEN 'Poznavatelj'
    WHEN v_row.xp_total >= 500  THEN 'Gurman'
    ELSE 'Početnik'
  END;

  -- Write back streak + activity date + rank
  UPDATE public.user_stats
  SET current_streak       = v_streak,
      last_activity_date   = today,
      rank_title           = v_rank
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INTEGER) TO authenticated;


-- ── 5. Helper function: claim_daily_challenge ─────────────────────────────────
-- Returns TRUE if successfully claimed, FALSE if already claimed today.

CREATE OR REPLACE FUNCTION public.claim_daily_challenge(
  p_user_id UUID,
  p_points  INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  v_claimed_at DATE;
BEGIN
  SELECT daily_challenge_claimed_at INTO v_claimed_at
  FROM public.user_stats WHERE user_id = p_user_id;

  -- Already claimed today
  IF v_claimed_at = today THEN
    RETURN FALSE;
  END IF;

  -- Award XP and mark as claimed
  PERFORM public.award_xp(p_user_id, p_points);
  UPDATE public.user_stats
  SET daily_challenge_claimed_at = today
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_challenge(UUID, INTEGER) TO authenticated;
