-- ============================================================
-- ChevApp — Migration 006: Add detail columns to existing recipes table
-- The production table was created manually without the full schema.
-- This adds the missing columns and populates all recipe data.
-- Safe to re-run (uses IF NOT EXISTS / DO UPDATE).
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Add missing columns ───────────────────────────────────────────────────────

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS slug          TEXT,
  ADD COLUMN IF NOT EXISTS prep_time     TEXT    NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS cook_time     TEXT    NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS style         TEXT,
  ADD COLUMN IF NOT EXISTS ingredients   JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS steps         JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tips          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS youtube_query TEXT,
  ADD COLUMN IF NOT EXISTS sort_order    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Make slug unique if it has values (run after populating below)
-- ALTER TABLE public.recipes ADD CONSTRAINT recipes_slug_unique UNIQUE (slug);

-- ── Populate all recipe data ──────────────────────────────────────────────────

UPDATE public.recipes SET
  slug = 'sarajevski-cevapi',
  prep_time = '20 min', cook_time = '15 min', style = 'Sarajevski', sort_order = 1,
  youtube_query = 'sarajevski cevapi recept',
  ingredients = '[
    {"amount":"500g","item":"mljevena junetina (85% meso)"},
    {"amount":"300g","item":"mljevena janjetina"},
    {"amount":"1 žlica","item":"sitno sjeckani luk"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"½ žličice","item":"crni papar"},
    {"amount":"½ žličice","item":"bikarbonat sode"},
    {"amount":"1 žlica","item":"kisela voda (gazirana)"},
    {"amount":"za posluživanje","item":"somun, sirovi luk, kajmak, ajvar"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Pomiješaj mljevenu junetinu i janjetinu. Dodaj sol, papar i bikarbonat sode."},
    {"step":2,"text":"Dodaj sjeckani luk i kiselu vodu. Miješaj rukama 5 minuta dok smjesa ne postane glatka i ljepljiva."},
    {"step":3,"text":"Poklopi i ostavi u hladnjaku minimalno 2 sata (idealno preko noći)."},
    {"step":4,"text":"Oblikuj ćevape: valjčić dužine ~8-10 cm, promjera ~2 cm. Koristeći navlažene ruke."},
    {"step":5,"text":"Peči na jako vrućem roštilju ili tavi od lijevanog željeza, 2-3 minute s svake strane."},
    {"step":6,"text":"Posluži odmah u somunu s kiselim lukom i kajmakom."}
  ]'::jsonb,
  tips = '["Ključ je u omjeru: 60% junetina, 40% janjetina.","Bikarbonat sode daje mekoću — ne preskači!","Roštilj mora biti VRUĆI da se ne lijepe.","Nikada ne pritiskaj ćevap lopaticom — gubi sočnost."]'::jsonb
WHERE title_en ILIKE '%Sarajevo%' OR title_hr ILIKE '%Sarajevski%';

UPDATE public.recipes SET
  slug = 'banjalucki-cevapi',
  prep_time = '15 min + 1h marinada', cook_time = '10 min', style = 'Banjalučki', sort_order = 2,
  youtube_query = 'banjalučki ćevapi recept pločice',
  ingredients = '[
    {"amount":"600g","item":"mljevena govedina (80% meso, 20% masnoća)"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"½ žličice","item":"crni papar"},
    {"amount":"1 žličica","item":"slatka paprika u prahu"},
    {"amount":"2 češnja","item":"češnjak (protisnuti)"},
    {"amount":"1 žlica","item":"sitno sjeckani peršun"},
    {"amount":"za posluži","item":"somun ili lepinja, sirovi luk, ajvar"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Mljevenu govedinu začini solju, paprom, paprikom u prahu, češnjakom i peršunom."},
    {"step":2,"text":"Miješaj rukama 5 minuta. Poklopi folijom i ostavi u hladnjaku 1 sat."},
    {"step":3,"text":"Oblikuj pločice: ovalni valjak, spljošteni, dužine ~10 cm i debljine ~1.5 cm. Banjalučki stil je širi i ravniji od sarajevskih."},
    {"step":4,"text":"Peči na jako vrućem roštilju bez pauze: 3-4 minute s jedne strane, okrenuti jednom."},
    {"step":5,"text":"Posluži odmah na somunu s lukom i ajvarom. Bez kajmaka — to je banjalučka tradicija."}
  ]'::jsonb,
  tips = '["Samo govedina, bez janjetine — to je banjalučka razlika.","Ne gnječi previše meso — pločice trebaju biti sočne iznutra.","Roštilj mora biti toliko vruć da ćevapi odmah dobiju karameliziranu koricu.","Lepinja umjesto somuna — tanja i hrskavija."]'::jsonb
WHERE title_en ILIKE '%Banja Luka%' OR title_hr ILIKE '%Banjalučki%';

UPDATE public.recipes SET
  slug = 'travnicki-cevapi',
  prep_time = '20 min + 2h odmor', cook_time = '12 min', style = 'Travnički', sort_order = 3,
  youtube_query = 'travnički ćevapi vlašićki sir recept',
  ingredients = '[
    {"amount":"400g","item":"mljevena junetina"},
    {"amount":"200g","item":"mljevena janjetina"},
    {"amount":"100g","item":"vlašićki ovčji sir (ili feta), sitno izmrvljeni"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"½ žličice","item":"bijeli papar"},
    {"amount":"½ žličice","item":"bikarbonat sode"},
    {"amount":"1 žlica","item":"kisela voda"},
    {"amount":"za posluži","item":"somun, luk, svježa paprika, kiseli kupus"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Pomiješaj mljevenu junetinu i janjetinu. Dodaj sol, bijeli papar i bikarbonat sode."},
    {"step":2,"text":"Dodaj kiselu vodu i miješaj 5 minuta rukama dok smjesa nije glatka."},
    {"step":3,"text":"Nježno utisni izmrvljeni vlašićki sir u smjesu — ne miješaj previše da sir ostane u komadićima."},
    {"step":4,"text":"Poklopi i ostavi u hladnjaku minimalno 2 sata."},
    {"step":5,"text":"Oblikuj klasične valjke 8-9 cm duge. Peči na vrućem roštilju 3 minute sa svake strane."},
    {"step":6,"text":"Posluži u somunu sa sirovim lukom, svježom paprikom i kiselim kupusom."}
  ]'::jsonb,
  tips = '["Vlašićki sir je duša ovog recepta — feta je prihvatljiva zamjena ali ne isto.","Bijeli papar umjesto crnog daje delikatniji okus.","Kiseli kupus je tradicionalni prilog u Travniku — eksperimentiraj!","Sir ne smije biti presoljen — prilagodi sol u mješavini."]'::jsonb
WHERE title_en ILIKE '%Travnik%' OR title_hr ILIKE '%Travnički%';

UPDATE public.recipes SET
  slug = 'tuzlanski-cevapi',
  prep_time = '30 min + 2h odmor', cook_time = '30 min', style = 'Tuzlanski', sort_order = 4,
  youtube_query = 'tuzlanski ćevapi polivka recept',
  ingredients = '[
    {"amount":"500g","item":"mljevena junetina"},
    {"amount":"300g","item":"mljevena svinjska lopatica (po tradiciji)"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"½ žličice","item":"crni papar"},
    {"amount":"½ žličice","item":"bikarbonat sode"},
    {"amount":"1 žlica","item":"kisela voda"},
    {"amount":"---","item":"POLIVKA:"},
    {"amount":"2 velika","item":"luka (sitno narezani)"},
    {"amount":"3 žlice","item":"ulje"},
    {"amount":"200ml","item":"mesna juha (temeljac)"},
    {"amount":"1 žlica","item":"koncentrat rajčice"},
    {"amount":"1 žličica","item":"slatka paprika u prahu"},
    {"amount":"sol i papar","item":"po ukusu"},
    {"amount":"za posluži","item":"somun, sirovi luk"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Smješaj meso: miješaj junetinu i svinjetinu sa solju, paprom, bikarbonatom i kiselom vodom. Odmori 2 sata."},
    {"step":2,"text":"Oblikuj valjke 9-10 cm. Peči na vrućem roštilju 3-4 minute sa svake strane."},
    {"step":3,"text":"POLIVKA: U tavi zagrij ulje, dinštaj luk na laganoj vatri 20 minuta dok ne postane zlatan i mek."},
    {"step":4,"text":"Dodaj koncentrat rajčice, papriku u prahu, miješaj 2 minute."},
    {"step":5,"text":"Dodaj mesnu juhu, začini solju i paprom. Krčkaj 10 minuta do gusto."},
    {"step":6,"text":"Posluži ćevape na somunu i prelij vrućom polivkom direktno na meso."}
  ]'::jsonb,
  tips = '["Polivka je tajna Tuzle — bez nje su to samo obični ćevapi.","Luk za polivku mora biti jako karameliziran — požuri i uništit ćeš jelo.","Svinjetina daje masnoću i sočnost — možeš zamijeniti s masnom goveđom plećkom.","Polivka se priprema unaprijed i grije svježom mesnom juhom."]'::jsonb
WHERE title_en ILIKE '%Tuzla%' OR title_hr ILIKE '%Tuzlanski%';

UPDATE public.recipes SET
  slug = 'sis-cevap',
  prep_time = '20 min + 4h marinada', cook_time = '15 min', style = 'Šiš', sort_order = 5,
  youtube_query = 'šiš ćevap pikantni recept roštilj',
  ingredients = '[
    {"amount":"400g","item":"junečija plećka ili but (kocke 3×3 cm)"},
    {"amount":"300g","item":"janjeće meso (kocke 3×3 cm)"},
    {"amount":"2 žlice","item":"maslinovo ulje"},
    {"amount":"3 češnja","item":"češnjak (protisnuti)"},
    {"amount":"1 žličica","item":"ljuta paprika u prahu (ili čili)"},
    {"amount":"1 žličica","item":"slatka paprika u prahu"},
    {"amount":"1 žličica","item":"kumin (kim)"},
    {"amount":"½ žličice","item":"korijander"},
    {"amount":"½ žličice","item":"sol"},
    {"amount":"2","item":"zelene babure paprike (krupno narezane)"},
    {"amount":"2 velika","item":"luka (krupno narezana)"},
    {"amount":"za posluži","item":"somun, kiseli luk, ajvar, svježa paprika"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Pomiješaj maslinovo ulje, češnjak, začine i sol u marinadu."},
    {"step":2,"text":"Pomiješaj meso s marinadom, dobro promiješaj. Poklopi i ostavi u hladnjaku 4-12 sati."},
    {"step":3,"text":"Nanizaj naizmjenično meso, papriku i luk na metalne ražnjiće."},
    {"step":4,"text":"Peči na vrućem roštilju 12-15 minuta, okrenuti svake 3-4 minute."},
    {"step":5,"text":"Posluži direktno s ražnja uz somun, kiseli luk i ajvar."}
  ]'::jsonb,
  tips = '["Duža marinada (overnight) = intenzivniji okus.","Metalni ražnjići se bolje zagrijavaju nego drveni.","Paprika i luk moraju biti dovoljno veliki da ne padnu s ražnja.","Ljutinu prilagodi po ukusu — dodaj cijeli suhi čili za ekstra pakao."]'::jsonb
WHERE title_en ILIKE '%Shish%' OR title_hr ILIKE '%Šiš%';

UPDATE public.recipes SET
  slug = 'tufahije',
  prep_time = '30 min', cook_time = '25 min', style = 'Slatkiš', sort_order = 6,
  youtube_query = 'tufahije recept bosanski desert',
  ingredients = '[
    {"amount":"6","item":"čvrste jabuke (Golden ili Granny Smith)"},
    {"amount":"200g","item":"mljeveni orasi"},
    {"amount":"100g","item":"šećer (za fil)"},
    {"amount":"1 žlica","item":"ribana korica limuna"},
    {"amount":"500ml","item":"voda (za poširanje)"},
    {"amount":"200g","item":"šećer (za sirup)"},
    {"amount":"1","item":"štapić cimeta"},
    {"amount":"3","item":"klinčića"},
    {"amount":"za ukras","item":"šlag, cijela jezgra oraha"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Jabukama odreži poklopac (gornji dio). Pažljivo izvadi jezgru žlicom, ostavivši stijenke debljine 1 cm."},
    {"step":2,"text":"FIL: pomiješaj mljevene orahe, šećer i limunovu koru. Po želji dodaj kapljicu ruma."},
    {"step":3,"text":"SIRUP: u loncu kuha vodu sa šećerom, cimetom i klinčićima 10 minuta."},
    {"step":4,"text":"Napuni jabuke orahovim filom do vrha. Vrati poklopac."},
    {"step":5,"text":"Stavi jabuke u lonac sa sirupom. Pošira ih 15-20 minuta na laganoj vatri dok ne omekšaju (neka drže oblik)."},
    {"step":6,"text":"Ohladi na sobnoj temperaturi. Posluži s hladnim šlagom i jezgrom oraha na vrhu."}
  ]'::jsonb,
  tips = '["Jabuke ne smiju biti pretajane — kuhaj dok iglica prolazi lako ali jabuka drži oblik.","Sirup koji ostane prelij jabukama pri posluživanju.","Tufahije su bolje sljedeći dan — okusi se spoje.","Dodatak vanilije u šlag podiže jelo na novu razinu."]'::jsonb
WHERE title_en ILIKE '%Tufahije%' OR title_hr ILIKE '%Tufahije%';

UPDATE public.recipes SET
  slug = 'hurmasice',
  prep_time = '20 min', cook_time = '20 min + 2h namakanje', style = 'Slatkiš', sort_order = 7,
  youtube_query = 'hurmašice recept bosanski kolač',
  ingredients = '[
    {"amount":"300g","item":"fini griz (semolina)"},
    {"amount":"200g","item":"maslac (omekšan)"},
    {"amount":"2","item":"jaja"},
    {"amount":"100g","item":"šećer"},
    {"amount":"1 žličica","item":"prašak za pecivo"},
    {"amount":"1 žličica","item":"ekstrakt vanilije"},
    {"amount":"---","item":"ŠERBET:"},
    {"amount":"500ml","item":"voda"},
    {"amount":"400g","item":"šećer"},
    {"amount":"sok od ½","item":"limuna"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"ŠERBET: Kuha vodu sa šećerom i limunovim sokom 15 minuta dok ne postane sirupasto. Ohladi."},
    {"step":2,"text":"Miješaj omekšan maslac i šećer dok nije kremasto. Dodaj jaja i vaniliju."},
    {"step":3,"text":"Dodaj griz i prašak za pecivo. Miješaj dok tijesto ne bude glatko i kompaktno."},
    {"step":4,"text":"Oblikuj hurmašice: valjčiće duljine 4 cm, malo uvijenih na krajevima — oblika hurme (datule)."},
    {"step":5,"text":"Peći na 180°C 18-20 minuta dok ne postanu zlatni."},
    {"step":6,"text":"Vruće hurmašice odmah uroni u ohlađeni šerbet. Ostavi da se namoče 2+ sata."}
  ]'::jsonb,
  tips = '["Ključni trik: vruće hurmašice + hladni šerbet.","Ne kuhaj šerbet predugo — ne smije biti gust kao med.","Griz daje teksturu: finije mljeveni = mekše hurmašice.","Čuvaju se u šerbetu do tjedan dana — postaju sve bolje."]'::jsonb
WHERE title_en ILIKE '%Hurma%' OR title_hr ILIKE '%Hurma%';

UPDATE public.recipes SET
  slug = 'baklava-bosanska',
  prep_time = '60 min', cook_time = '35 min', style = 'Slatkiš', sort_order = 8,
  youtube_query = 'bosanska baklava recept kore orasi',
  ingredients = '[
    {"amount":"500g","item":"gotove tanke kore za baklavu (jufke)"},
    {"amount":"400g","item":"mljeveni orasi"},
    {"amount":"100g","item":"maslac (otopljeni, za premazivanje)"},
    {"amount":"100g","item":"šećer (za fil)"},
    {"amount":"1 žličica","item":"cimet"},
    {"amount":"---","item":"ŠERBET:"},
    {"amount":"500ml","item":"voda"},
    {"amount":"500g","item":"šećer"},
    {"amount":"sok od 1","item":"limuna"},
    {"amount":"1 žlica","item":"ružina vodica (opcijalno)"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"FIL: pomiješaj mljevene orahe, šećer i cimet."},
    {"step":2,"text":"ŠERBET: Kuha vodu sa šećerom i limunovim sokom 20 minuta. Dodaj ružinu vodicu. Ohladi."},
    {"step":3,"text":"U namašćen lim (30×40 cm) slažu se 3 kore premazane maslacem, pa tanak sloj fil, pa opet 3 kore..."},
    {"step":4,"text":"Završi s 3-4 sloja kora bez fila. Premazi maslacem."},
    {"step":5,"text":"Prereži na romboide PRIJE pečenja — ovo je bitno da kore ne pucaju."},
    {"step":6,"text":"Peči na 180°C 30-35 minuta dok nije zlatno smeđa i hrskava."},
    {"step":7,"text":"Odmah po vađenju prelij hladnim šerbetom. Ostavi 2 sata da upije."}
  ]'::jsonb,
  tips = '["Vruća baklava + hladni šerbet = hrskava baklava. Obrnuto = mekana.","Između svake kore maslac je obavezan — ne štedi.","Bosanska baklava ima orehe; turska pistacije — obje su ispravne.","Sjaj od ružine vodice daje autentičan osmanlijski touch."]'::jsonb
WHERE title_en ILIKE '%Baklava%' OR title_hr ILIKE '%Baklava%';

UPDATE public.recipes SET
  slug = 'domaci-somun',
  prep_time = '30 min + 2h dizanje', cook_time = '20 min', style = 'Opće', sort_order = 9,
  youtube_query = 'domaći bosanski somun recept',
  ingredients = '[
    {"amount":"500g","item":"bijelo glatko brašno"},
    {"amount":"300ml","item":"mlaka voda"},
    {"amount":"7g","item":"suhi kvasac (1 vrećica)"},
    {"amount":"1 žličica","item":"šećer"},
    {"amount":"1 žličica","item":"sol"},
    {"amount":"2 žlice","item":"maslinovo ulje"},
    {"amount":"1","item":"jaje (za premaz)"},
    {"amount":"po ukusu","item":"nigella sjemenke (crni sezam)"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Otopi kvasac i šećer u mlakoj vodi. Čekaj 10 minuta dok se ne zapjeni."},
    {"step":2,"text":"U veliku zdjelu prosij brašno, dodaj sol. Napravi udubinu u sredini."},
    {"step":3,"text":"Ulij kvasac i ulje. Gnjeci tijesto 10 minuta dok nije glatko i elastično."},
    {"step":4,"text":"Poklopi vlažnom krpom. Ostavi na toplom 1-1.5 sat dok ne udvostruči volumen."},
    {"step":5,"text":"Podijeli na 6 jednakih kuglica. Oblikuj u diskove debljine 1.5 cm."},
    {"step":6,"text":"Premazi jajetom. Pospi nigella sjemenkama. Ostavi 30 minuta."},
    {"step":7,"text":"Peči na 230°C (predgrijana pećnica s kamenom) 15-20 minuta dok nije zlatno smeđ."}
  ]'::jsonb,
  tips = '["Kamen za pečenje daje autentičnu koru — vrijedi investicija.","Vodena para u pećnici čini somun mekanim iznutra.","Somun je gotov kad zvuči šuplje kad kucneš po dnu."]'::jsonb
WHERE title_en ILIKE '%Somun%' OR title_hr ILIKE '%Somun%';

UPDATE public.recipes SET
  slug = 'kajmak',
  prep_time = '10 min', cook_time = '0 min + odmaranje', style = 'Prilog', sort_order = 10,
  youtube_query = 'domaći kajmak recept sir',
  ingredients = '[
    {"amount":"200g","item":"masni svježi sir (skuta)"},
    {"amount":"100g","item":"kiselo vrhnje (20% masti)"},
    {"amount":"50g","item":"mascarpone ili Philadelphia"},
    {"amount":"½ žličice","item":"sol"},
    {"amount":"po ukusu","item":"svježi vlasac (opcijalno)"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Sve sastojke izvadi iz hladnjaka 30 min unaprijed — sobna temperatura je ključ."},
    {"step":2,"text":"Miješaj svježi sir vilicom dok ne postane glatka pasta bez grudica."},
    {"step":3,"text":"Dodaj kiselo vrhnje i mascarpone. Miješaj dok nije kremasto."},
    {"step":4,"text":"Začini solju. Stavi u hladnjak minimalno 1 sat prije posluživanja."},
    {"step":5,"text":"Posluži na sobnoj temperaturi uz somun i ćevape."}
  ]'::jsonb,
  tips = '["Pravi kajmak se pravi od sirovog mlijeka — ovo je urbana verzija.","Što masniji sir, bolji kajmak.","Ne preskači odmaranje u hladnjaku — okusi se spajaju."]'::jsonb
WHERE title_en ILIKE '%Kajmak%' OR title_hr ILIKE '%Kajmak%';

UPDATE public.recipes SET
  slug = 'urnebes',
  prep_time = '15 min', cook_time = '0 min', style = 'Prilog', sort_order = 11,
  youtube_query = 'urnebes namaz recept ljuti sir',
  ingredients = '[
    {"amount":"200g","item":"bijeli meki sir (feta ili domaći)"},
    {"amount":"100g","item":"kajmak ili masni svježi sir"},
    {"amount":"1-2 žličice","item":"ljuta paprika u prahu (ili fino nasjeckana svježa čili paprika)"},
    {"amount":"½ žličice","item":"slatka paprika u prahu"},
    {"amount":"½ žličice","item":"sol (pazi — sir je soljen)"},
    {"amount":"1 žlica","item":"maslinovo ulje"},
    {"amount":"opcijalno","item":"nasjeckani vlasac, crni papar"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Sir izmrvi vilicom do grube paste. Ne treba biti potpuno glatko — malo teksture je poželjno."},
    {"step":2,"text":"Dodaj kajmak ili masni svježi sir. Miješaj vilicom."},
    {"step":3,"text":"Dodaj ljutu papriku u prahu, slatku papriku i maslinovo ulje. Dobro promiješaj."},
    {"step":4,"text":"Probaj i prilagodi sol i ljutinu."},
    {"step":5,"text":"Pokrij folijom i ostavi u hladnjaku 30 minuta da se okusi spoje."},
    {"step":6,"text":"Posluži uz somun, pečene paprike ili direktno uz ćevape."}
  ]'::jsonb,
  tips = '["Urnebes znači kaos — ime govori sve o ljutini.","Ljutinu prilagodi ukusu ali ne preskači ljutu papriku — bez toga je samo sir.","Što masniji sir, bolji urnebes.","Može se čuvati u hladnjaku 3-4 dana — okus se intenzivira."]'::jsonb
WHERE title_en ILIKE '%Urnebes%' OR title_hr ILIKE '%Urnebes%';

UPDATE public.recipes SET
  slug = 'sopska-salata',
  prep_time = '15 min', cook_time = '0 min', style = 'Prilog', sort_order = 12,
  youtube_query = 'šopska salata recept balkanska',
  ingredients = '[
    {"amount":"4","item":"zrele rajčice (krupno narezane)"},
    {"amount":"2","item":"svježa krastavca (narezana)"},
    {"amount":"1 veliki","item":"crveni luk (tanko narezani)"},
    {"amount":"1","item":"zelena babura paprika (narezana)"},
    {"amount":"200g","item":"feta sir ili bijeli meki sir"},
    {"amount":"3 žlice","item":"maslinovo ulje"},
    {"amount":"1 žlica","item":"bijeli ocat ili limun"},
    {"amount":"po ukusu","item":"sol, svježi peršun"},
    {"amount":"opcijalno","item":"zelene masline"}
  ]'::jsonb,
  steps = '[
    {"step":1,"text":"Nareži rajčice, krastavce i papriku na krupne komade. Luk na tanke kolutiće."},
    {"step":2,"text":"Složi u zdjelicu: rajčice, krastavac, paprika, luk (redom, ne miješaj)."},
    {"step":3,"text":"Posolji lagano. Prelij maslinovim uljem i octom."},
    {"step":4,"text":"Pospi sitno izmrvljenim ili naribanim sirom po vrhu — on mora pokriti salatu potpuno."},
    {"step":5,"text":"Ukrasi listovima svježeg peršuna. Posluži odmah."}
  ]'::jsonb,
  tips = '["Sir mora biti NA VRHU, ne umiješan — to je šopska pravilo.","Zrele, čvrste rajčice su tajna — ljetne iz vrta su nepobitive.","Feta je autentična ali bosanski bijeli sir je lokalna varijanta.","Salata se ne miješa pri posluživanju."]'::jsonb
WHERE title_en ILIKE '%Shopska%' OR title_en ILIKE '%Šopska%' OR title_hr ILIKE '%Šopska%';

-- ── Add unique constraint on slug (after data is populated) ──────────────────
DO $$ BEGIN
  ALTER TABLE public.recipes ADD CONSTRAINT recipes_slug_unique UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
