-- ============================================================
-- ChevApp — Hardening + Great Gastro Seed
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (idempotent via ON CONFLICT DO NOTHING)
-- ============================================================


-- ── Part 1: UNIQUE Constraints ────────────────────────────────────────────────

-- Prevent duplicate words in the dictionary
DO $$ BEGIN
  ALTER TABLE public.word_of_the_day
    ADD CONSTRAINT word_of_the_day_word_unique UNIQUE (word);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prevent duplicate recipe titles (slug already unique; title adds extra guard)
DO $$ BEGIN
  ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_title_hr_unique UNIQUE (title_hr);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Part 2: Merak Dictionary — 30+ entries ────────────────────────────────────
-- All display_date = NULL → go into the random daily pool.
-- ON CONFLICT (word) DO NOTHING — safe to re-run.

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
 'Nizak okrugli stol oko kojeg se jede na podu, ali i simbolično: svako zajednički obrok. "Dobra sofra — dobre duše." Sjesti za sofru znači prihvatiti i biti prihvaćen.',
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

('Teferiče',
 'Izlet u prirodu radi uživanja — verzija teferića ali intimnija, samo za bliže prijatelje i porodicu. Na teferiče se ne ide bez ražnja i suhe rakije.',
 ARRAY['priroda','slavlje','hrana']),

('Pendžer',
 'Prozor, ali i okvir kroz koji se gleda život. Sjediti uz pendžer i gledati sokak — balkanski Netflix. Svaka dobra priča počinje s "gledajući kroz pendžer..."',
 ARRAY['arhitektura','promatranje','svakodnevnica']),

('Jacija',
 'Posljednja večernja molitva po islamskom kalendaru — ali i kolokvijalano: kasna večer. "Osta do jacije" znači ostao je dugo, do kasno u noć, uz dobro društvo.',
 ARRAY['tradicija','duhovnost','svakodnevnica'])

ON CONFLICT (word) DO NOTHING;


-- ── Part 3: New Recipes ───────────────────────────────────────────────────────
-- slug already UNIQUE (from migration 002). ON CONFLICT (slug) DO NOTHING.

INSERT INTO public.recipes
  (slug, emoji, title_hr, title_en, description_hr, description_en,
   difficulty, category, prep_time, cook_time, cooking_time, servings, style,
   ingredients, steps, tips, youtube_query, sort_order)
VALUES

-- ── ĆEVAPI VARIANTS ──────────────────────────────────────────────────────────

(
  'banjalucki-cevapi', '🏔️',
  'Banjalučki Ćevapi (Pločice)',
  'Banja Luka-Style Flat Ćevapi',
  'Širi, ravni ćevapi karakteristični za Banja Luku — pečeni na lepinja kruhu, bez kajmaka.',
  'Wider, flat ćevapi unique to Banja Luka — served on thin flatbread without kajmak.',
  'medium', 'Glavno jelo',
  '15 min + 1h marinada', '10 min', 85, 4, 'Banjalučki',
  '[
    {"amount":"600g",       "item":"mljevena govedina (80% meso, 20% masnoća)"},
    {"amount":"1 žličica",  "item":"sol"},
    {"amount":"½ žličice",  "item":"crni papar"},
    {"amount":"1 žličica",  "item":"slatka paprika u prahu"},
    {"amount":"2 češnja",   "item":"češnjak (protisnuti)"},
    {"amount":"1 žlica",    "item":"sitno sjeckani peršun"},
    {"amount":"za posluži", "item":"somun ili lepinja, sirovi luk, ajvar"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Mljevenu govedinu začini solju, paprom, paprikom u prahu, češnjakom i peršunom."},
    {"step":2,"text":"Miješaj rukama 5 minuta. Poklopi folijom i ostavi u hladnjaku 1 sat."},
    {"step":3,"text":"Oblikuj pločice: ovalni valjak, spljošteni, dužine ~10 cm i debljine ~1.5 cm. Banjalučki stil je širi i ravniji od sarajevskih."},
    {"step":4,"text":"Peči na jako vrućem roštilju bez pauze: 3-4 minute s jedne strane, okrenuti jednom."},
    {"step":5,"text":"Posluži odmah na somunu s lukom i ajvarom. Bez kajmaka — to je banjalučka tradicija."}
  ]'::jsonb,
  '["Samo govedina, bez janjetine — to je banjalučka razlika.","Ne gnječi previše meso — pločice trebaju biti sočne iznutra.","Roštilj mora biti toliko vruć da ćevapi odmah dobiju karameliziranu koricu.","Lepinja umjesto somuna — tanja i hrskavija."]'::jsonb,
  'banjalučki ćevapi recept pločice', 5
),

(
  'travnicki-cevapi', '🧀',
  'Travnički Ćevapi',
  'Travnik-Style Ćevapi with Vlašić Cheese',
  'Sočni ćevapi obogaćeni tartom notom svježeg vlašićkog sira iz Travnika.',
  'Juicy ćevapi enriched with the tangy note of fresh Vlašić cheese from Travnik.',
  'medium', 'Glavno jelo',
  '20 min + 2h odmor', '12 min', 152, 4, 'Travnički',
  '[
    {"amount":"400g",       "item":"mljevena junetina"},
    {"amount":"200g",       "item":"mljevena janjetina"},
    {"amount":"100g",       "item":"vlašićki ovčji sir (ili feta), sitno izmrvljeni"},
    {"amount":"1 žličica",  "item":"sol"},
    {"amount":"½ žličice",  "item":"bijeli papar"},
    {"amount":"½ žličice",  "item":"bikarbonat sode"},
    {"amount":"1 žlica",    "item":"kisela voda"},
    {"amount":"za posluži", "item":"somun, luk, svježa paprika, kiseli kupus"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Pomiješaj mljevenu junetinu i janjetinu. Dodaj sol, bijeli papar i bikarbonat sode."},
    {"step":2,"text":"Dodaj kiselu vodu i miješaj 5 minuta rukama dok smjesa nije glatka."},
    {"step":3,"text":"Nježno utisni izmrvljeni vlašićki sir u smjesu — ne miješaj previše da sir ostane u komadićima."},
    {"step":4,"text":"Poklopi i ostavi u hladnjaku minimalno 2 sata."},
    {"step":5,"text":"Oblikuj klasične valjke 8-9 cm duge. Peči na vrućem roštilju 3 minute sa svake strane."},
    {"step":6,"text":"Posluži u somunu sa sirovim lukom, svježom paprikom i kiselim kupusom."}
  ]'::jsonb,
  '["Vlašićki sir je duša ovog recepta — feta je prihvatljiva zamjena ali ne isto.","Bijeli papar umjesto crnog daje delikatniji okus.","Kiseli kupus je tradicionalni prilog u Travniku — eksperimentiraj!","Sir ne smije biti presoljen — prilagodi sol u mješavini."]'::jsonb,
  'travnički ćevapi vlašićki sir recept', 6
),

(
  'tuzlanski-cevapi', '🍲',
  'Tuzlanski Ćevapi s Polivkom',
  'Tuzla-Style Ćevapi with Meat Gravy',
  'Ćevapi posuti aromatičnom polivakom — mesnom juhom s lukom, začinima i paprikom.',
  'Ćevapi topped with aromatic meat gravy — a Tuzla tradition unlike any other.',
  'hard', 'Glavno jelo',
  '30 min + 2h odmor', '30 min', 182, 4, 'Tuzlanski',
  '[
    {"amount":"500g",       "item":"mljevena junetina"},
    {"amount":"300g",       "item":"mljevena svinjska lopatica (po tradiciji)"},
    {"amount":"1 žličica",  "item":"sol"},
    {"amount":"½ žličice",  "item":"crni papar"},
    {"amount":"½ žličice",  "item":"bikarbonat sode"},
    {"amount":"1 žlica",    "item":"kisela voda"},
    {"amount":"---",        "item":"POLIVKA:"},
    {"amount":"2 velika",   "item":"luka (sitno narezani)"},
    {"amount":"3 žlice",    "item":"ulje"},
    {"amount":"200ml",      "item":"mesna juha (temeljac)"},
    {"amount":"1 žlica",    "item":"koncentrat rajčice"},
    {"amount":"1 žličica",  "item":"slatka paprika u prahu"},
    {"amount":"sol i papar","item":"po ukusu"},
    {"amount":"za posluži", "item":"somun, sirovi luk"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Smješaj meso: miješaj junetinu i svinjetinu sa solju, paprom, bikarbonatom i kiselom vodom. Odmori 2 sata."},
    {"step":2,"text":"Oblikuj valjke 9-10 cm. Peči na vrućem roštilju 3-4 minute sa svake strane."},
    {"step":3,"text":"POLIVKA: U tavi zagrij ulje, dinštaj luk na laganoj vatri 20 minuta dok ne postane zlatan i mek."},
    {"step":4,"text":"Dodaj koncentrat rajčice, papriku u prahu, miješaj 2 minute."},
    {"step":5,"text":"Dodaj mesnu juhu, začini solju i paprom. Krčkaj 10 minuta do gusto."},
    {"step":6,"text":"Posluži ćevape na somunu i prelijprelijeci vrućom polivkom direktno na meso."}
  ]'::jsonb,
  '["Polivka je tajna Tuzle — bez nje su to samo obični ćevapi.","Luk za polivku mora biti jako karameliziran — požuri i uništit ćeš jelo.","Svinjetina daje masnoću i sočnost — možeš zamijeniti s masnom goveđom plećkom.","Polivka se priprema unaprijed i grije svježom mesnom juhom."]'::jsonb,
  'tuzlanski ćevapi polivka recept', 7
),

(
  'sis-cevap', '🌶️',
  'Šiš-Ćevap (Pikantni)',
  'Spicy Shish Kebab',
  'Začinjeni komadići govedine i janjetine, naizmjenično nanizani na ražanj s paprikom i lukom.',
  'Spiced chunks of beef and lamb, threaded on skewers with peppers and onion.',
  'medium', 'Glavno jelo',
  '20 min + 4h marinada', '15 min', 255, 4, 'Šiš',
  '[
    {"amount":"400g",       "item":"junečija plećka ili but (kocke 3×3 cm)"},
    {"amount":"300g",       "item":"janjeće meso (kocke 3×3 cm)"},
    {"amount":"2 žlice",    "item":"maslinovo ulje"},
    {"amount":"3 češnja",   "item":"češnjak (protisnuti)"},
    {"amount":"1 žličica",  "item":"ljuta paprika u prahu (ili čili)"},
    {"amount":"1 žličica",  "item":"slatka paprika u prahu"},
    {"amount":"1 žličica",  "item":"kumin (kim)"},
    {"amount":"½ žličice",  "item":"korijander"},
    {"amount":"½ žličice",  "item":"sol"},
    {"amount":"2",          "item":"zelene babure paprike (krupno narezane)"},
    {"amount":"2 velika",   "item":"luka (krupno narezana)"},
    {"amount":"za posluži", "item":"somun, kiseli luk, ajvar, svježa paprika"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Pomiješaj maslinovo ulje, češnjak, začine i sol u marinadu."},
    {"step":2,"text":"Pomiješaj meso s marinadom, dobro promiješaj. Poklopi i ostavi u hladnjaku 4-12 sati."},
    {"step":3,"text":"Nanizaj naizmjenično meso, papriku i luk na metalne ražnjiće."},
    {"step":4,"text":"Peči na vrućem roštilju 12-15 minuta, okrenuti svake 3-4 minute."},
    {"step":5,"text":"Posluži direktno s ražnja uz somun, kiseli luk i ajvar."}
  ]'::jsonb,
  '["Duža marinada (overnight) = intenzivniji okus.","Metalni ražnjići se bolje zagrijavaju nego drveni.","Paprika i luk moraju biti dovoljno veliki da ne padnu s ražnja.","Ljutinu prilagodi po ukusu — dodaj cijeli suhi čili za ekstra pakao."]'::jsonb,
  'šiš ćevap pikantni recept roštilj', 8
),


-- ── SLATKIŠI ─────────────────────────────────────────────────────────────────

(
  'tufahije', '🍎',
  'Tufahije',
  'Stuffed Poached Apples',
  'Poširane jabuke punjene orasima, šećerom i limunovom korom — osmanlijska poslastica.',
  'Poached apples stuffed with walnuts, sugar and lemon zest — an Ottoman dessert classic.',
  'medium', 'Prilog',
  '30 min', '25 min', 55, 6, 'Slatkiš',
  '[
    {"amount":"6",          "item":"čvrste jabuke (Golden ili Granny Smith)"},
    {"amount":"200g",       "item":"mljeveni orasi"},
    {"amount":"100g",       "item":"šećer (za fil)"},
    {"amount":"1 žlica",    "item":"ribana korica limuna"},
    {"amount":"500ml",      "item":"voda (za poširanje)"},
    {"amount":"200g",       "item":"šećer (za sirup)"},
    {"amount":"1",          "item":"štapić cimeta"},
    {"amount":"3",          "item":"klinčića"},
    {"amount":"za ukras",   "item":"šlag, cijela jezgra oraha"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Jabukama odreži poklopac (gornji dio). Pažljivo izvadi jezgru žlicom, ostavivši stijenke debljine 1 cm."},
    {"step":2,"text":"FIL: pomiješaj mljevene orahe, šećer i limunovu koru. Po želji dodaj kapljicu ruma."},
    {"step":3,"text":"SIRUP: u loncu kuha vodu sa šećerom, cimetom i klinčićima 10 minuta."},
    {"step":4,"text":"Napuni jabuke orahovim filom do vrha. Vrati poklopac."},
    {"step":5,"text":"Stavi jabuke u lonac sa sirupom. Pošira ih 15-20 minuta na laganoj vatri dok ne omekšaju (neka drže oblik)."},
    {"step":6,"text":"Ohladi na sobnoj temperaturi. Posluži s hladnim šlagom i jezgrom oraha na vrhu."}
  ]'::jsonb,
  '["Jabuke ne smiju biti pretajane — kuhaj dok iglica prolazi lako ali jabuka drži oblik.","Sirup koji ostane prelij jabukama pri posluživanju.","Tufahije su bolje sljedeći dan — okusi se spoje.","Dodatak vanilije u šlag podiže jelo na novu razinu."]'::jsonb,
  'tufahije recept bosanski desert', 9
),

(
  'hurmasice', '🍯',
  'Hurmašice',
  'Syrup-Soaked Semolina Cookies',
  'Mekani kolačići od griza, namočeni u šerbetu — bosanska poslastica s tisućljetnom tradicijom.',
  'Soft semolina cookies soaked in sweet syrup — a Bosnian treat of Ottoman heritage.',
  'easy', 'Prilog',
  '20 min', '20 min + 2h namakanje', 160, 30, 'Slatkiš',
  '[
    {"amount":"300g",       "item":"fini griz (semolina)"},
    {"amount":"200g",       "item":"maslac (omekšan)"},
    {"amount":"2",          "item":"jaja"},
    {"amount":"100g",       "item":"šećer"},
    {"amount":"1 žličica",  "item":"prašak za pecivo"},
    {"amount":"1 žličica",  "item":"ekstrakt vanilije"},
    {"amount":"---",        "item":"ŠERBET:"},
    {"amount":"500ml",      "item":"voda"},
    {"amount":"400g",       "item":"šećer"},
    {"amount":"sok od ½",   "item":"limuna"}
  ]'::jsonb,
  '[
    {"step":1,"text":"ŠERBET: Kuha vodu sa šećerom i limunovim sokom 15 minuta dok ne postane sirupasto. Ohladi."},
    {"step":2,"text":"Miješaj omekšan maslac i šećer dok nije kremasto. Dodaj jaja i vaniliju."},
    {"step":3,"text":"Dodaj griz i prašak za pecivo. Miješaj dok tijesto ne bude glatko i kompaktno."},
    {"step":4,"text":"Oblikuj hurmašice: valjčiće duljine 4 cm, malo uvijenih na krajevima — oblika hurme (datule)."},
    {"step":5,"text":"Peći na 180°C 18-20 minuta dok ne postanu zlatni."},
    {"step":6,"text":"Vruće hurmašice odmah uroni u ohlađeni šerbet. Ostavi da se namoče 2+ sata."}
  ]'::jsonb,
  '["Ključni trik: vruće hurmašice + hladni šerbet (ili obrnuto — hladi hurmašice i vrući šerbet).","Ne kuhaj šerbet predugo — ne smije biti gust kao med.","Griz daje teksturu: finije mljeveni = mekše hurmašice.","Čuvaju se u šerbetu do tjedan dana — postaju sve bolje."]'::jsonb,
  'hurmašice recept bosanski kolač', 10
),

(
  'baklava-bosanska', '🥮',
  'Bosanska Baklava',
  'Bosnian Baklava',
  'Svilenkaste kore punjene orasima, prelivene vrućim šerbetom — boss-level poslastica.',
  'Silky phyllo layers filled with walnuts, drenched in warm syrup — the pinnacle of Balkan sweets.',
  'hard', 'Prilog',
  '60 min', '35 min', 95, 24, 'Slatkiš',
  '[
    {"amount":"500g",       "item":"gotove tanke kore za baklavu (jufke)"},
    {"amount":"400g",       "item":"mljeveni orasi"},
    {"amount":"100g",       "item":"maslac (otopljeni, za premazivanje)"},
    {"amount":"100g",       "item":"šećer (za fil)"},
    {"amount":"1 žličica",  "item":"cimet"},
    {"amount":"---",        "item":"ŠERBET:"},
    {"amount":"500ml",      "item":"voda"},
    {"amount":"500g",       "item":"šećer"},
    {"amount":"sok od 1",   "item":"limuna"},
    {"amount":"1 žlica",    "item":"ružina vodica (opcijalno)"}
  ]'::jsonb,
  '[
    {"step":1,"text":"FIL: pomiješaj mljevene orahe, šećer i cimet."},
    {"step":2,"text":"ŠERBET: Kuha vodu sa šećerom i limunovim sokom 20 minuta. Dodaj ružinu vodicu. Ohladi."},
    {"step":3,"text":"U namašćen lim (30×40 cm) slažu se 3 kore premazane maslacem, pa tanak sloj fil, pa opet 3 kore..."},
    {"step":4,"text":"Završi s 3-4 sloja kora bez fila. Premazi maslom."},
    {"step":5,"text":"Prereži na romboide PRIJE pečenja — ovo je bitno da kore ne pucaju."},
    {"step":6,"text":"Peči na 180°C 30-35 minuta dok nije zlatno smeđa i hrskava."},
    {"step":7,"text":"Odmah po vađenju prelij hladnim šerbetom. Ostavi 2 sata da upije."}
  ]'::jsonb,
  '["Vruća baklava + hladni šerbet = hrskava baklava. Obrnuto = mekana. Odluci se unaprijed.","Između svake kore maslac je obavezan — ne štedi.","Bosanska baklava ima orehe; turska pistacije — obje su ispravne.","Sjaj od ružine vodice je opcija ali daje autentičan osmanlijski touch."]'::jsonb,
  'bosanska baklava recept kore orasi', 11
),

(
  'sutlijas', '🍚',
  'Sutlijaš',
  'Bosnian Rice Pudding',
  'Kremasti rižot u mlijeku s vanilijom, posut cimetom — osmanlijski desert koji grije dušu.',
  'Creamy rice cooked in milk with vanilla, dusted with cinnamon — a soul-warming Ottoman dessert.',
  'easy', 'Prilog',
  '5 min', '40 min', 45, 6, 'Slatkiš',
  '[
    {"amount":"150g",       "item":"kratko zrnasta riža (okrugla)"},
    {"amount":"1 litr",     "item":"punomasno mlijeko"},
    {"amount":"500ml",      "item":"voda"},
    {"amount":"150g",       "item":"šećer"},
    {"amount":"1",          "item":"štapić vanilije (ili 1 žličica ekstrakta)"},
    {"amount":"2 žlice",    "item":"kukuruzni škrob"},
    {"amount":"50ml",       "item":"hladno mlijeko (za škrob)"},
    {"amount":"za posip",   "item":"mljeveni cimet"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Riža se kuha u vodi 10 minuta, ocijediti i isprati."},
    {"step":2,"text":"U loncu zagrij mlijeko s vanilijom. Dodaj predkuhanu rižu."},
    {"step":3,"text":"Kuhaj na laganoj vatri 20 minuta, miješaj često da se ne zalijepi."},
    {"step":4,"text":"Dodaj šećer. Otopi kukuruzni škrob u hladnom mlijeku, ulijj u lonac."},
    {"step":5,"text":"Miješaj dok ne zgusne, još 5-10 minuta."},
    {"step":6,"text":"Rasporedi u zdjelice, ohladi. Pospi cimetom po vrhu. Posluži hladno."}
  ]'::jsonb,
  '["Što sporije kuhanje, kremastiji sutlijaš — ne žuri.","Punomasno mlijeko je obavezno; s 2% nema rezultata.","Kukuruzni škrob je tajna gustoće — ne preskačiaj.","Domaći sutlijaš od sinoć je bolji od svježeg — pusti da se dobro ohladi."]'::jsonb,
  'sutlijaš recept bosanski desert riža', 12
),

(
  'tulumba', '🍩',
  'Tulumba',
  'Fried Dough in Syrup',
  'Hrskave pržene žemičke u zlatnom šerbetu — balkanska verzija čurros-a, ali bolja.',
  'Crispy fried ridged dough soaked in golden syrup — the Balkan churro, only better.',
  'medium', 'Prilog',
  '20 min', '20 min + 1h namakanje', 100, 20, 'Slatkiš',
  '[
    {"amount":"250ml",      "item":"voda"},
    {"amount":"100g",       "item":"maslac"},
    {"amount":"200g",       "item":"brašno"},
    {"amount":"4",          "item":"jaja"},
    {"amount":"1 prstohvat", "item":"sol"},
    {"amount":"ulje",       "item":"za prženje"},
    {"amount":"---",        "item":"ŠERBET:"},
    {"amount":"400ml",      "item":"voda"},
    {"amount":"400g",       "item":"šećer"},
    {"amount":"sok od ½",   "item":"limuna"}
  ]'::jsonb,
  '[
    {"step":1,"text":"ŠERBET: Kuha vodu sa šećerom i limunom 15 min. Ohladi."},
    {"step":2,"text":"TIJESTO (choux): Prokuha vodu s maslacem i soli. Makni s vatre, dodaj brašno odjednom i miješaj snažno lopaticom."},
    {"step":3,"text":"Vrati na laganu vatru, miješaj 1-2 minute dok tijesto ne napusti stijenke."},
    {"step":4,"text":"Ohladi 5 minuta. Dodavaj jaja jedno po jedno, miješaj nakon svakog."},
    {"step":5,"text":"Punjenje u slastičarsku vrećicu s narezanom zvjezdastom nastavkom. Prži u ulju zagrijanom na 170°C."},
    {"step":6,"text":"Cijev tijesta iscjedi u ulje (6-7 cm), odreži nožem. Prži 3-4 minute do zlatno."},
    {"step":7,"text":"Odmah uroni u hladni šerbet 30-60 minuta. Posluži na sobnoj temperaturi."}
  ]'::jsonb,
  '["Temperatura ulja je ključna: 170°C. Vruće = izgori izvana, sirovo iznutra.","Choux tijesto mora biti glatko i sjajno — dodaj jaja polako.","Hladni šerbet = hrskava tulumba; vruće = mekana. Biramo hrskavu.","Tulumbe se prave i jedu isti dan — ne čuvaju se."]'::jsonb,
  'tulumba recept balkanski slatkiš', 13
),


-- ── SALATE I DODACI ───────────────────────────────────────────────────────────

(
  'sopska-salata', '🥗',
  'Šopska Salata',
  'Shopska Salad',
  'Osvježavajuća salata od rajčice, krastavca i crvenog luka, posuta sitnim bijelim sirom.',
  'Refreshing salad of tomatoes, cucumber and red onion, topped with crumbled white cheese.',
  'easy', 'Prilog',
  '15 min', '0 min', 15, 4, 'Prilog',
  '[
    {"amount":"4",          "item":"zrele rajčice (krupno narezane)"},
    {"amount":"2",          "item":"svježa krastavca (narezana)"},
    {"amount":"1 veliki",   "item":"crveni luk (tanko narezani)"},
    {"amount":"1",          "item":"zelena babura paprika (narezana)"},
    {"amount":"200g",       "item":"feta sir ili bijeli meki sir"},
    {"amount":"3 žlice",    "item":"maslinovo ulje"},
    {"amount":"1 žlica",    "item":"bijeli ocat ili limunn"},
    {"amount":"po ukusu",   "item":"sol, svježi peršun"},
    {"amount":"opcijalno",  "item":"zelive masline"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Nareži rajčice, krastavce i papriku na krupne komade. Luk na tanke kolutiće."},
    {"step":2,"text":"Složi u zdjelicu: rajčice, krastavac, paprika, luk (redom, ne miješaj)."},
    {"step":3,"text":"Posolji lagano. Prelij maslinovim uljem i octom."},
    {"step":4,"text":"Pospi sitno izmrvljenim ili naribanim sirom po vrhu — on mora pokriti salatu potpuno."},
    {"step":5,"text":"Ukrasi listovima svježeg peršuna. Posluži odmah."}
  ]'::jsonb,
  '["Sir mora biti NA VRHU, ne umiješan — to je šopska šopska pravilo.","Zrele, čvrste rajčice su tajna — ljetne iz vrta su nepobitive.","Feta je autentična ali bosanski bijeli sir je lokalna varijanta.","Salata se ne miješa pri posluživanju — svaki zalogaj sam uzima što želi."]'::jsonb,
  'šopska salata recept balkanska', 14
),

(
  'pecene-paprike-cesnjak', '🫑',
  'Pečene Paprike s Češnjakom',
  'Roasted Peppers with Garlic',
  'Pečene crvene babure s češnjakom i octom — prilog koji nadmaši sve umake.',
  'Charred red bell peppers with garlic and vinegar — a side dish that outshines all sauces.',
  'easy', 'Prilog',
  '10 min', '30 min + hlađenje', 50, 6, 'Prilog',
  '[
    {"amount":"6",          "item":"crvene babure paprike"},
    {"amount":"4 češnja",   "item":"češnjak (tanko narezani)"},
    {"amount":"3 žlice",    "item":"maslinovo ulje"},
    {"amount":"2 žlice",    "item":"ocat (bijeli vinski ili jabučni)"},
    {"amount":"po ukusu",   "item":"sol i crni papar"},
    {"amount":"opcijalno",  "item":"svježi peršun, chili pahuljice"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Paprike peči direktno na plamenu (plin) ili na roštilju dok koža potpuno ne pocrkni sa svih strana."},
    {"step":2,"text":"Stavi u plastičnu vrećicu ili poklop s folijom 15 minuta — para labavi kožu."},
    {"step":3,"text":"Oguli kožu prstima pod mlazom hladne vode. Ukloni sjemenke i peteljku."},
    {"step":4,"text":"Paprike nareži na trakice."},
    {"step":5,"text":"Složi u zdjelicu s tankim kriškama češnjaka. Prelij maslinovim uljem i octom."},
    {"step":6,"text":"Posolji, popapriti. Ostavi 30 minuta da se marinira. Posluži na sobnoj temperaturi."}
  ]'::jsonb,
  '["Pečenje direktno na plamenu daje bolji okus od pećnice — dimljenu notu.","Ne peri paprike pod vodom predugo — gubi se okus.","Češnjak ne smije biti pregusto nasjeckam — tanke listove koji se malo mariniraju su savršeni.","Ove paprike su idealan prilog uz ćevape i somun."]'::jsonb,
  'pečene paprike češnjak prilog recept', 15
),

(
  'urnebes', '🧀',
  'Urnebes Namaz',
  'Spicy Cheese Spread',
  'Ljuti pikantni namaz od bijelog sira i kajmaka — neizostavni pratilac svakog roštilja.',
  'Fiery spread of white cheese and kajmak — the roštilj companion no one can resist.',
  'easy', 'Prilog',
  '15 min', '0 min', 15, 8, 'Prilog',
  '[
    {"amount":"200g",       "item":"bijeli meki sir (feta ili domaći)"},
    {"amount":"100g",       "item":"kajmak ili masni svježi sir"},
    {"amount":"1-2 žličice","item":"ljuta paprika u prahu (ili fino nasjeckana svježa čili paprika)"},
    {"amount":"½ žličice",  "item":"slatka paprika u prahu"},
    {"amount":"½ žličice",  "item":"sol (pazi — sir je soljen)"},
    {"amount":"1 žlica",    "item":"maslinovo ulje"},
    {"amount":"opcijalno",  "item":"nasjeckani vlasac, crni papar"}
  ]'::jsonb,
  '[
    {"step":1,"text":"Sir izmrvi vilicom do grube paste. Ne treba biti potpuno glatko — malo teksture je poželjno."},
    {"step":2,"text":"Dodaj kajmak ili masni svježi sir. Miješaj vilicom."},
    {"step":3,"text":"Dodaj ljutu papriku u prahu, slatku papriku i maslinovo ulje. Dobro promiješaj."},
    {"step":4,"text":"Probaj i prilagodi sol i ljutinu."},
    {"step":5,"text":"Pokrij folijom i ostavi u hladnjaku 30 minuta da se okusi spoje."},
    {"step":6,"text":"Posluži uz somun, pečene paprike ili direktno uz ćevape."}
  ]'::jsonb,
  '["Urnebes znači 'kaos' ili 'gungula' — ime govori sve o ljutini.","Ljutinu prilagodi ukusu ali ne preskači ljutu papiku — bez toga je samo sir.","Što masniji sir, bolji urnebes — ne koristi nemasni.","Može se čuvati u hladnjaku 3-4 dana — okus se intenzivira."]'::jsonb,
  'urnebes namaz recept ljuti sir', 16
)

ON CONFLICT (slug) DO NOTHING;


-- ── Part 4 (Optional): Add English definitions to word_of_the_day ─────────────
-- The word_of_the_day table only has `definition` (single language).
-- If you want to add an English column in the future, run this migration:
--
-- ALTER TABLE public.word_of_the_day ADD COLUMN IF NOT EXISTS definition_en TEXT;
--
-- Then update entries like:
-- UPDATE public.word_of_the_day SET definition_en = 'Spiritual pleasure in simple things'
--   WHERE word = 'Merak';


-- ── Part 5: Architecture note for Edge Function (documentation only) ──────────
-- See: supabase/functions/auto-word-of-day/index.ts (to be created separately)
-- Purpose: If no word is pinned for tomorrow, call an LLM to generate one.
-- Trigger: Supabase pg_cron schedule → every day at 23:00 UTC.
-- Flow:
--   1. Check if tomorrow has a pinned word → if yes, exit
--   2. Fetch all existing words to avoid duplicates
--   3. Call LLM API with a prompt for a new Bosnian/Balkan cultural term
--   4. Insert result with display_date = CURRENT_DATE + 1
--   5. On failure, log to a `function_logs` table
