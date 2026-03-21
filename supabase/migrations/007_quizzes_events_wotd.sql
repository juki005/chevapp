-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 007: Quizzes, Events, Word-of-the-Day extras
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── Part 1: word_of_the_day — add missing columns, then seed 30 words ────────
-- Production table was created manually without all columns. Add them safely.

ALTER TABLE public.word_of_the_day
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Drop the CURRENT_DATE default so pool words get NULL display_date.
-- (PostgreSQL allows multiple NULL values in a UNIQUE column — only explicit
--  dates need to be unique. Pool rotation uses day-of-year, not display_date.)
ALTER TABLE public.word_of_the_day
  ALTER COLUMN display_date DROP DEFAULT;

-- Re-inserts with ON CONFLICT DO NOTHING so running this twice is safe.
INSERT INTO public.word_of_the_day (word, definition, tags) VALUES

-- Cultural concepts
('Merak',
 'Duhovno zadovoljstvo u malim, jednostavnim stvarima — savršena čaša kafe, miris roštilja, glas prijatelja. Biti u meraku znači biti potpuno prisutan u trenutku.',
 ARRAY['kultura','osjećaj','filozofija']),

('Sevdah',
 'Duboka, melankolična čežnja prepuna osjećaja. Ne samo glazbeni žanr — stanje duše koje istovremeno boli i grije. "Voli me malo, a ne sevdaj mi" — kaže stara bh. izreka.',
 ARRAY['kultura','osjećaj','glazba']),

('Inat',
 'Prkosna tvrdoglavost koja nije mana nego ponos. Raditi nešto upravo zato što ti je rečeno da ne možeš — balkanski motor koji pokreće planine.',
 ARRAY['karakter','kultura','mentalitet']),

('Nafaka',
 'Božijom voljom određena opskrba i sudbina. Hrana na stolu, zdravlje u kući — sve je nafaka. "Ko radi, njegova nafaka ga čeka."',
 ARRAY['filozofija','duhovnost','sudbina']),

('Sevap',
 'Dobro djelo učinjeno iz čiste namjere, bez očekivanja nagrade. Podijeliti hranu s komšijom, pomoći strancu — to je čisti sevap.',
 ARRAY['duhovnost','dobrota','tradicija']),

('Dert',
 'Briga, tuga ili problem koji čovjeka pritišta. "Ima svoga derta" — znači da je nekome teško, ali on to nosi dostojanstveno. Srodan grčkom dertli — čovjeku punom čežnje.',
 ARRAY['osjećaj','svakodnevnica','turski']),

('Ćejf',
 'Čisto blaženstvo mirnog odmora i uživanja. Ležati na tendi, piti kahvu, gledati kako sunce zalazi — to je pravi ćejf. Nije lijenost; to je art.',
 ARRAY['odmor','uživanje','kultura']),

('Rahatluk',
 'Udobnost, tišina i mir od svih briga. "Daj mi malo rahatluka" — balkanski ekvivalent danese hygge filozofije. Postiže se dobrom hranom i dobrim društvom.',
 ARRAY['mir','udobnost','filozofija']),

('Takat',
 'Snaga izdržljivosti, strpljenja i ustrajnosti. "Nema više tatka" — govori se kad je netko dostigao granicu. Pravi majstor roštilja ima neiscrpan takat za savršeni žar.',
 ARRAY['karakter','snaga','mentalitet']),

('Tabijat',
 'Priroda i narav čovjeka koja se ne mijenja. "Takav mu je tabijat" — prihvatanje da je netko takav kakav jest. Niti lošica niti pohvala, samo konstatacija.',
 ARRAY['karakter','narav','identitet']),

-- Food & Gathering
('Teferič',
 'Veselje u prirodi s hranom, pjesmom i pijenjem. Bosanska verzija piknika — ali intenzivnija, bučnija i ukusnija. Bez roštilja nema pravog teferića.',
 ARRAY['hrana','slavlje','tradicija']),

('Akšamluk',
 'Večernje sijelo uz dobru hranu i piće, čarolija zlatnog sata. Dolazi od turske riječi akšam — zalazak sunca. Akšamluk bez mezetluka je kao somun bez kajmaka.',
 ARRAY['hrana','sijelo','tradicija']),

('Sofra',
 'Nizak okrugli stol oko kojeg se jede na podu, ali i simbolično: svaki zajednički obrok. "Dobra sofra — dobre duše." Sjesti za sofru znači prihvatiti i biti prihvaćen.',
 ARRAY['hrana','tradicija','gostoprimstvo']),

('Zijafet',
 'Svečana gozba, raskošno gostovanje. Razlika između večere i zijafeta: na zijafetu se jede dok ne možeš više, a onda se nudi desert.',
 ARRAY['gozba','slavlje','hrana']),

('Meze',
 'Raznovrsna mala predjela koja se posluže uz piće — urnebes, kajmak, masline, suho meso, tvrdo kuhana jaja. Ne naručuješ mezu; meza dolazi sama.',
 ARRAY['hrana','predjelo','dijeljenje']),

('Šerbet',
 'Slatki, aromatični napitak od voćnog soka, šećera i začina. Servira se na svadbi i svečanostima. "Slatko poput šerbeta" — balkanska pohvala.',
 ARRAY['napitak','slatko','tradicija']),

('Musafir',
 'Putnik namjernik, gost koji je stigao nenajavljen. Bosanski zakon kaže: musafira se ne pita koliko će ostati; pita ga se samo što jede. Musafirluk je čast, ne teret.',
 ARRAY['gostoprimstvo','tradicija','kultura']),

-- Craft & Place
('Avlija',
 'Zatvoreno dvorište između kuća, srdce mahale. Djeca se igraju, komšije razgovaraju, a ljeti ovdje gori roštilj. Avlija je intima balkanske arhitekture.',
 ARRAY['prostor','arhitektura','zajednica']),

('Čaršija',
 'Gradski trg i bazaar, živo srce svakog balkanskog grada. Sarajevska Baščaršija je majka svih čaršija. Ići u čaršiju nije kupovina; to je ritual.',
 ARRAY['grad','kultura','arhitektura']),

('Sokak',
 'Uska uličica između kuća, intimnija od ulice. U sokaku se sve čuje i sve vidi. Djeca viču, žene se zovu s prozora, miris kahve pluta zrakom.',
 ARRAY['grad','arhitektura','zajednica']),

('Ćošak',
 'Kut, ugao, zakutak. Ali i omiljeno mjesto u kafiću — ćoški stol je najtraženiji. Pravi mudraci sjede u ćošku i promatraju svijet.',
 ARRAY['prostor','svakodnevnica','kafić']),

('Mangal',
 'Metalna posuda s ugljenom za grijanje ili kuhanje, roštilj praotac. Mangal na avliji zimi — komšije se griju i peku koru kruha na žaru.',
 ARRAY['oprema','roštilj','tradicija']),

('Mašice',
 'Metalne kliješte za roštilj, majstorov produžetak ruke. Pravilno okretanje ćevapa zahtijeva mašice i strpljenje — ni lopaticom, ni vilicom.',
 ARRAY['oprema','roštilj','tehnika']),

-- Coffee Ritual
('Džezva',
 'Bakrena posudica s dugom drškom za kuhanje bosanske kafe. Džezva je simbol domaćinstva — ako je ugasila džezva, ugasilo se i ognjište kuće.',
 ARRAY['kafa','tradicija','oprema']),

('Fildžan',
 'Mala porculanska čašica bez drške za bosansku kahu. Drži se s dva prsta, pije polako. Kafanski sat uz fildžan je sveta institucija.',
 ARRAY['kafa','tradicija','posuđe']),

('Rahat-lokum',
 'Mekani, punomasni slatkiš začinjen ružinom vodom ili pistacijom. Neophodan uz jutarnju kavu. Dolazi s osmanskog dvora — i zadržao se zauvijek.',
 ARRAY['slatkiš','tradicija','kafa']),

-- Character
('Hamajlija',
 'Amulet ili privjesak koji donosi sreću i štiti od uroka. Svaka baka ima hamajliju za unuke. Racionalan čovjek se smije — dok mu ne propadne roštilj.',
 ARRAY['tradicija','praznovjerje','kultura']),

('Nišan',
 'Cilj, mišana, preciznost. "Uzeo si nišan" — pogodio si. Na roštilju: svaki ćevap mora pasti na pravo mjesto. Majstor roštilja ima savršen nišan.',
 ARRAY['vještina','preciznost','sport']),

('Dunđer',
 'Stolar, zanatlija, majstor koji gradi rukama. Ali i svaki čovjek koji nešto radi s ljubavlju i preciznošću. Pravi dunđer roštilja gradi vatru poput arhitekture.',
 ARRAY['zanat','vještina','karakter']),

('Bujrum',
 'Turcizam koji znači "izvoli", "slobodan si", "dobrodošao". Domaćin kaže bujrum i pokazuje na trpezu — to je poziv koji se nikad ne odbija.',
 ARRAY['gostoprimstvo','jezik','tradicija']),

('Pendžer',
 'Prozor, ali i okvir kroz koji se gleda život. Sjediti uz pendžer i gledati sokak — balkanski Netflix. Svaka dobra priča počinje s "gledajući kroz pendžer..."',
 ARRAY['arhitektura','promatranje','svakodnevnica']),

('Jacija',
 'Posljednja večernja molitva po islamskom kalendaru — ali i kolokvijalano: kasna večer. "Osta do jacije" znači ostao je dugo, do kasno u noć, uz dobro društvo.',
 ARRAY['tradicija','duhovnost','svakodnevnica'])

ON CONFLICT (word) DO NOTHING;


-- ── Part 2: quizzes table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🧠',
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward   INTEGER NOT NULL DEFAULT 100,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public read; no anonymous writes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'quizzes_public_read'
  ) THEN
    CREATE POLICY quizzes_public_read ON public.quizzes FOR SELECT USING (true);
  END IF;
END $$;


-- ── Part 3: quiz_questions table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  question_text   TEXT NOT NULL,
  answers         JSONB NOT NULL,   -- [{id, text}, ...]
  correct_id      TEXT NOT NULL,    -- matches answer id
  explanation     TEXT NOT NULL,
  xp              INTEGER NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'quiz_questions_public_read'
  ) THEN
    CREATE POLICY quiz_questions_public_read ON public.quiz_questions FOR SELECT USING (true);
  END IF;
END $$;


-- ── Part 4: seed first quiz + its 8 questions ─────────────────────────────────

INSERT INTO public.quizzes (slug, title, description, emoji, difficulty, xp_reward, sort_order)
VALUES (
  'cevapi-masterclass',
  'Ćevapi Masterclass',
  'Provjeri koliko znaš o pripremi savršenih balkanskih ćevapa — od omjera mesa do temperature roštilja.',
  '🔥',
  'medium',
  100,
  1
)
ON CONFLICT (slug) DO NOTHING;

-- Insert questions (idempotent via temp variable)
DO $$
DECLARE
  v_quiz_id UUID;
BEGIN
  SELECT id INTO v_quiz_id FROM public.quizzes WHERE slug = 'cevapi-masterclass';

  INSERT INTO public.quiz_questions (quiz_id, sort_order, question_text, answers, correct_id, explanation, xp)
  VALUES
    (v_quiz_id, 1,
     'Koji je idealni omjer mesa za Sarajevske ćevape?',
     '[{"id":"a","text":"100% govedina"},{"id":"b","text":"60% junetina + 40% janjetina"},{"id":"c","text":"50% svinjetina + 50% junetina"},{"id":"d","text":"80% janjetina + 20% junetina"}]',
     'b',
     'Klasični sarajevski omjer je 60% junetina i 40% janjetina. Ovaj omjer daje savršenu ravnotežu okusa i teksture.',
     10),

    (v_quiz_id, 2,
     'Zašto se dodaje bikarbonat sode u ćevape?',
     '[{"id":"a","text":"Daje ćevapima žutu boju"},{"id":"b","text":"Ubrzava proces kuhanja"},{"id":"c","text":"Omekšava meso i daje mekoću"},{"id":"d","text":"Pojačava miris"}]',
     'c',
     'Bikarbonat sode (soda bikarbona) podiže pH mesa, što omekšava proteine i rezultira mekanim, sočnim ćevapima.',
     10),

    (v_quiz_id, 3,
     'Na kojoj temperaturi treba biti roštilj za savršene ćevape?',
     '[{"id":"a","text":"Mlak (~100°C)"},{"id":"b","text":"Srednje vruć (~150°C)"},{"id":"c","text":"Jako vruć (~250-300°C)"},{"id":"d","text":"Temperatura ne utječe"}]',
     'c',
     'Roštilj mora biti jako vruć (250-300°C) kako bi ćevapi brzo dobili koricu i zadržali sočnost iznutra. Na hladnom roštilju se lijepe i suše.',
     15),

    (v_quiz_id, 4,
     'Koliko komada ćevapa se poslužuje u Sarajevu kao "pola porcija"?',
     '[{"id":"a","text":"3 komada"},{"id":"b","text":"5 komada"},{"id":"c","text":"8 komada"},{"id":"d","text":"10 komada"}]',
     'b',
     'U Sarajevu, "pola porcija" je 5 ćevapa, a cijela porcija je 10 komada. Banjalučki stil obično ima 5 debljih komada po porciji.',
     10),

    (v_quiz_id, 5,
     'Što je somun i zašto je neophodan uz ćevape?',
     '[{"id":"a","text":"Vrsta mesnog umaka"},{"id":"b","text":"Mekani bosanski kruh za posluživanje"},{"id":"c","text":"Vrsta pikantne paprike"},{"id":"d","text":"Naziv za porciju od 10 komada"}]',
     'b',
     'Somun je tradicionalni bosanski mekani kruh koji se peče na kamenu. Idealan je za ćevape jer upija sokove mesa i kajmaka, a u Sarajevu se ćevapi nikad ne poslužuju bez somuna.',
     10),

    (v_quiz_id, 6,
     'Koji je specifičan stil Banjalučkih ćevapa u usporedbi sa Sarajevskima?',
     '[{"id":"a","text":"Tanje su i kraće"},{"id":"b","text":"Rade se od svinjetine"},{"id":"c","text":"Deblji su, izrađeni samo od junetine, bez ovčijeg mesa"},{"id":"d","text":"Peče se u pećnici, ne na roštilju"}]',
     'c',
     'Banjalučki ćevapi su karakteristično deblji i izrađuju se isključivo od junetine (bez janjetine). Imaju drugačiju teksturu i profil okusa od sarajevskih.',
     15),

    (v_quiz_id, 7,
     'Što je kajmak u kontekstu balkanskih jela?',
     '[{"id":"a","text":"Vrsta ljute papričice"},{"id":"b","text":"Kremasti mliječni namaz od sira/vrhnja"},{"id":"c","text":"Naziv za roštilj pripremu"},{"id":"d","text":"Vrsta somuna s lukom"}]',
     'b',
     'Kajmak je bogati kremasti mliječni namaz koji se tradicionalno pravi od sirovog mlijeka. Urbana verzija koristi masni svježi sir i kiselo vrhnje. Neophodan je prilog uz ćevape.',
     10),

    (v_quiz_id, 8,
     'Koliko dugo treba miješati meso za ćevape?',
     '[{"id":"a","text":"30 sekundi — kratko je dovoljno"},{"id":"b","text":"1-2 minute s mikserom"},{"id":"c","text":"5+ minuta rukama dok nije glatko i ljepljivo"},{"id":"d","text":"Ne miješati — samo oblikovati"}]',
     'c',
     'Ćevapi se moraju miješati rukama minimalno 5 minuta. Ovo razvija proteine (miozin) koji drže meso zajedno i daju karakterističnu teksturu. Mikser to ne može postići isto.',
     15)

  ON CONFLICT DO NOTHING;
END $$;


-- ── Part 5: events table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  location      TEXT NOT NULL,
  event_date    DATE NOT NULL,         -- used for filtering past events
  date_label    TEXT NOT NULL,         -- display string e.g. "15. – 18. kolovoza 2025."
  emoji         TEXT NOT NULL DEFAULT '📅',
  tag           TEXT NOT NULL DEFAULT 'Event',
  tag_color     TEXT NOT NULL DEFAULT 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  external_link TEXT,                  -- optional registration/info URL
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_public_read'
  ) THEN
    CREATE POLICY events_public_read ON public.events FOR SELECT USING (true);
  END IF;
END $$;


-- ── Part 6: seed events (3 from MOCK_EVENTS + 2 extras) ──────────────────────

INSERT INTO public.events (slug, title, description, location, event_date, date_label, emoji, tag, tag_color, sort_order)
VALUES
  (
    'leskovacki-grill-festival-2025',
    'Leskovački Grill Festival 2025',
    'Najveći balkanski festival grilanja s više od 50 natjecatelja. Ćevapi, roštilj, glazba i folklore.',
    'Leskovac, Srbija',
    '2025-08-15',
    '15. – 18. kolovoza 2025.',
    '🔥',
    'Festival',
    'text-red-400 bg-red-400/10 border-red-400/30',
    1
  ),
  (
    'sarajevo-gastro-dani-2025',
    'Sarajevo Gastro Dani',
    'Proljetni gastro događaj u srcu Baščaršije. Radionice kuhanja, degustacije kajmaka i somuna.',
    'Baščaršija, Sarajevo',
    '2025-09-22',
    '22. – 24. rujna 2025.',
    '🕌',
    'Gastro',
    'text-amber-400 bg-amber-400/10 border-amber-400/30',
    2
  ),
  (
    'chevapp-rostilj-meetup-split-2025',
    'ChevApp Zajednica: Roštilj Meetup',
    'Neformalni meetup zajednice — grilanje uz more. Svaki donosi po nešto. Kapacitet 40 osoba.',
    'Split, Hrvatska',
    '2025-07-12',
    '12. srpnja 2025.',
    '🌊',
    'Meetup',
    'text-blue-400 bg-blue-400/10 border-blue-400/30',
    3
  ),
  (
    'mostar-cevap-kup-2026',
    'Mostar Ćevap Kup 2026',
    'Natjecanje u pripremi ćevapa iz cijele regije. Ocjenjuju se okus, tehnika i prezentacija. Prijave otvorene od veljače.',
    'Stari Grad, Mostar',
    '2026-05-10',
    '10. svibnja 2026.',
    '🌉',
    'Natjecanje',
    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    4
  ),
  (
    'banja-luka-food-fest-2026',
    'Banja Luka Food Fest',
    'Gastronomski festival na Kastelu s lokalnim restoranima i tezgama. Banjalučki ćevapi, pite i domаći slatki.',
    'Kastel, Banja Luka',
    '2026-06-20',
    '20. – 22. lipnja 2026.',
    '🏔️',
    'Festival',
    'text-red-400 bg-red-400/10 border-red-400/30',
    5
  )
ON CONFLICT (slug) DO NOTHING;
