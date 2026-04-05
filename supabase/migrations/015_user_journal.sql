-- ── 015_user_journal.sql ──────────────────────────────────────────────────────
-- Personal gastro journal with Google Business integration.
-- Separate from journal_entries (which requires a FK to our restaurants table).
-- This table accepts any establishment — verified or unverified — via
-- google_place_id so we have a permanent link to Google Business Profile.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_journal (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Restaurant identity
  restaurant_name  TEXT        NOT NULL,
  city             TEXT        NOT NULL,
  style            TEXT        NOT NULL DEFAULT 'Ostalo',

  -- Visit details
  rating           SMALLINT    NOT NULL DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  note             TEXT,
  visit_date       DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Google Business link (set when user selects via Places Autocomplete)
  google_place_id  TEXT,
  is_verified      BOOLEAN     NOT NULL DEFAULT false
);

-- ── Indexes ───────────────────────────────────────────────────────────────���───
CREATE INDEX IF NOT EXISTS user_journal_user_id_idx      ON public.user_journal (user_id);
CREATE INDEX IF NOT EXISTS user_journal_visit_date_idx   ON public.user_journal (user_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS user_journal_place_id_idx     ON public.user_journal (google_place_id) WHERE google_place_id IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_journal ENABLE ROW LEVEL SECURITY;

-- Users can only see, insert, update and delete their own entries
CREATE POLICY "user_journal_select" ON public.user_journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_journal_insert" ON public.user_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_journal_update" ON public.user_journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_journal_delete" ON public.user_journal
  FOR DELETE USING (auth.uid() = user_id);

-- ── Comment ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.user_journal IS
  'Personal gastro journal entries. google_place_id links to Google Business Profile when set via Places Autocomplete.';
