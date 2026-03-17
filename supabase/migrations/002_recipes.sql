-- ============================================================
-- ChevApp — Recipes Migration
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE recipe_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recipe_category AS ENUM ('Glavno jelo', 'Prilog', 'Dodatak');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recipes (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT              UNIQUE NOT NULL,          -- stable URL key
  emoji           TEXT              NOT NULL DEFAULT '🍽️',

  -- i18n title & description (add more _xx columns as needed)
  title_hr        TEXT              NOT NULL,
  title_en        TEXT,
  description_hr  TEXT              NOT NULL,
  description_en  TEXT,

  difficulty      recipe_difficulty NOT NULL DEFAULT 'medium',
  category        recipe_category   NOT NULL DEFAULT 'Glavno jelo',

  -- Human-readable time strings displayed in the UI
  prep_time       TEXT              NOT NULL DEFAULT '—',
  cook_time       TEXT              NOT NULL DEFAULT '—',
  -- Total minutes — useful for sorting / filtering
  cooking_time    INTEGER           NOT NULL DEFAULT 0,

  servings        INTEGER           NOT NULL DEFAULT 4 CHECK (servings > 0),
  style           TEXT,                                       -- "Sarajevski", "Prilog", etc.

  -- Structured arrays stored as JSONB
  -- ingredients: [{ "amount": "500g", "item": "junetina" }, ...]
  -- steps:       [{ "step": 1, "text": "..." }, ...]
  -- tips:        ["tip text", ...]
  ingredients     JSONB             NOT NULL DEFAULT '[]',
  steps           JSONB             NOT NULL DEFAULT '[]',
  tips            JSONB             NOT NULL DEFAULT '[]',

  youtube_query   TEXT,
  sort_order      INTEGER           NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at (reuse helper from migration 001 if it already exists)
DROP TRIGGER IF EXISTS recipes_updated_at ON public.recipes;
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Everyone can read recipes (public content)
DROP POLICY IF EXISTS "recipes_public_read" ON public.recipes;
CREATE POLICY "recipes_public_read"
  ON public.recipes FOR SELECT
  USING (true);

-- Only service-role / admin can write (managed via Supabase dashboard)
-- No INSERT/UPDATE/DELETE policy for anon/authenticated users.

-- ── Seed data ─────────────────────────────────────────────────────────────────

INSERT INTO public.recipes
  (slug, emoji, title_hr, title_en, description_hr, description_en,
   difficulty, category, prep_time, cook_time, cooking_time, servings, style,
   ingredients, steps, tips, youtube_query, sort_order)
VALUES

-- 1. Sarajevski Ćevapi
(
  'sarajevski-cevapi', '🕌',
  'Sarajevski Ćevapi',
  'Sarajevo-Style Ćevapi',
  'Klasična mješavina govedine i janjetine s kiselom salamurom i lukom.',
  'Classic blend of beef and lamb with brine and raw onion.',
  'medium', 'Glavno jelo',
  '20 min', '15 min', 35, 4, 'Sarajevski',
  '[
    {"amount":"500g",       "item":"mljevena junetina (85% meso)"},
    {"amount":"300g",       "item":"mljevena janjetina"},
    {"amount":"1 žlica",    "item":"sitno sjeckani luk"},
    {"amount":"1 žličica",  "item":"sol"},
    {"amount":"½ žličice",  "item":"crni papar"},
    {"amount":"½ žličice",  "item":"bikarbonat sode"},
    {"amount":"1 žlica",    "item":"kisela voda (gazirana)"},
    {"amount":"za posluživanje", "item":"somun, sirovi luk, kajmak, ajvar"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Pomiješaj mljevenu junetinu i janjetinu. Dodaj sol, papar i bikarbonat sode."},
    {"step":2,"text":"Dodaj sjeckani luk i kiselu vodu. Miješaj rukama 5 minuta dok smjesa ne postane glatka i ljepljiva."},
    {"step":3,"text":"Poklopi i ostavi u hladnjaku minimalno 2 sata (idealno preko noći)."},
    {"step":4,"text":"Oblikuj ćevape: valjčić dužine ~8-10 cm, promjera ~2 cm. Koristeći navlažene ruke."},
    {"step":5,"text":"Peči na jako vrućem roštilju ili tavi od lijevanog željeza, 2-3 minute s svake strane."},
    {"step":6,"text":"Posluži odmah u somunu s kiselim lukom i kajmakom."}
  ]'::jsonb,
  '["Ključ je u omjeru: 60% junetina, 40% janjetina.","Bikarbonat sode daje mekoću — ne preskači!","Roštilj mora biti VRUĆI da se ne lijepe.","Nikada ne pritiskaj ćevap lopaticom — gubi sočnost."]'::jsonb,
  'sarajevski cevapi recept', 1
),

-- 2. Domaći Somun
(
  'domaci-somun', '🥯',
  'Domaći Somun',
  'Homemade Somun Bread',
  'Mekani, pahuljasti somun koji se peče na kamenu.',
  'Soft, fluffy Bosnian flatbread baked on a stone.',
  'hard', 'Prilog',
  '30 min + 2h dizanje', '20 min', 140, 6, 'Opće',
  '[
    {"amount":"500g",    "item":"bijelo glatko brašno"},
    {"amount":"300ml",   "item":"mlaka voda"},
    {"amount":"7g",      "item":"suhi kvasac (1 vrećica)"},
    {"amount":"1 žličica","item":"šećer"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"2 žlice", "item":"maslinovo ulje"},
    {"amount":"1",       "item":"jaje (za premaz)"},
    {"amount":"po ukusu","item":"nigella sjemenke (crni sezam)"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Otopi kvasac i šećer u mlakoj vodi. Čekaj 10 minuta dok se ne zapjeni."},
    {"step":2,"text":"U veliku zdjelu prosij brašno, dodaj sol. Napravi udubinu u sredini."},
    {"step":3,"text":"Ulij kvasac i ulje. Gnjeci tijesto 10 minuta dok nije glatko i elastično."},
    {"step":4,"text":"Poklopi vlažnom krpom. Ostavi na toplom 1-1.5 sat dok ne udvostruči volumen."},
    {"step":5,"text":"Podijeli na 6 jednakih kuglica. Oblikuj u diskove debljine 1.5 cm."},
    {"step":6,"text":"Premazi jajetom. Pospi nigella sjemenkama. Ostavi 30 minuta."},
    {"step":7,"text":"Peči na 230°C (predgrijana pećnica s kamenom) 15-20 minuta dok nije zlatno smeđ."}
  ]'::jsonb,
  '["Kamen za pečenje daje autentičnu koru — vrijedi investicija.","Vodena para u pećnici čini somun mekanim iznutra.","Somun je gotov kad zvuči šuplje kad kucneš po dnu."]'::jsonb,
  'domaći bosanski somun recept', 2
),

-- 3. Domaći Kajmak
(
  'kajmak', '🧈',
  'Domaći Kajmak',
  'Homemade Kajmak Cream',
  'Kremasti kajmak od svježeg sira i kiselog vrhnja.',
  'Creamy kajmak spread made from fresh cheese and sour cream.',
  'easy', 'Prilog',
  '10 min', '0 min + odmaranje', 10, 8, 'Prilog',
  '[
    {"amount":"200g",       "item":"masni svježi sir (skuta)"},
    {"amount":"100g",       "item":"kiselo vrhnje (20% masti)"},
    {"amount":"50g",        "item":"mascarpone ili Philadelphia"},
    {"amount":"½ žličice",  "item":"sol"},
    {"amount":"po ukusu",   "item":"svježi vlasac (opcijalno)"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Sve sastojke izvadi iz hladnjaka 30 min unaprijed — sobna temperatura je ključ."},
    {"step":2,"text":"Miješaj svježi sir vilicom dok ne postane glatka pasta bez grudica."},
    {"step":3,"text":"Dodaj kiselo vrhnje i mascarpone. Miješaj dok nije kremasto."},
    {"step":4,"text":"Začini solju. Stavi u hladnjak minimalno 1 sat prije posluživanja."},
    {"step":5,"text":"Posluži na sobnoj temperaturi uz somun i ćevape."}
  ]'::jsonb,
  '["Pravi kajmak se pravi od sirovog mlijeka — ovo je urbana verzija.","Što masniji sir, bolji kajmak.","Ne preskači odmaranje u hladnjaku — okusi se spajaju."]'::jsonb,
  'domaći kajmak recept sir', 3
),

-- 4. Domaći Ajvar
(
  'ljuti-ajvar', '🫑',
  'Domaći Ajvar',
  'Homemade Roasted Pepper Relish',
  'Pečene paprike i patlidžan, sporo kuhani do savršenstva.',
  'Roasted peppers and aubergine, slowly cooked to perfection.',
  'medium', 'Prilog',
  '30 min', '1.5h', 120, 10, 'Prilog',
  '[
    {"amount":"1.5 kg",  "item":"crvene babure paprike"},
    {"amount":"500g",    "item":"patlidžan"},
    {"amount":"4 režnja","item":"češnjak"},
    {"amount":"100ml",   "item":"suncokretovo ulje"},
    {"amount":"2 žlice", "item":"ocat (9%)"},
    {"amount":"po ukusu","item":"sol i šećer"},
    {"amount":"1",       "item":"ljuta papričica (opcijalno za ljuti)"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Paprike i patlidžan peći na roštilju ili u pećnici (200°C) dok koža ne pocrkni."},
    {"step":2,"text":"Stavi u vreću 15 minuta — para olakšava guljenje."},
    {"step":3,"text":"Oguli kožu, ukloni sjemenke. Procediti da otiče višak tekućine (30 min)."},
    {"step":4,"text":"Samljej paprike i patlidžan u pastu (ne previše glatko — tekstura je važna)."},
    {"step":5,"text":"U loncu zagrij ulje, dodaj pastu. Kuha se na laganoj vatri 45-60 minuta, miješaj stalno."},
    {"step":6,"text":"Dodaj češnjak, ocat, sol i šećer. Kuhaj još 15 minuta."},
    {"step":7,"text":"Vruće stavi u steriliziranu staklenku. Čuva se do godinu dana."}
  ]'::jsonb,
  '["Što duže kuhanje, gušći ajvar — strpljivost se isplati.","Drvena kuhača je obavezna — metal reagira s kiselinom.","Pravi balkan ajvar nema ljutu papriku — to je osobna preferencija."]'::jsonb,
  'domaći ajvar recept pečene paprike', 4
)

ON CONFLICT (slug) DO NOTHING;  -- idempotent: safe to re-run
