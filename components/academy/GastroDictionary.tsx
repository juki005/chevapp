"use client";

// ── GastroDictionary · academy (Sprint 26ae · DS-migrated) ────────────────────
// Searchable archive of Balkan gastro terminology. Sits below the "Word of
// the Day" card in AcademyDashboard.
//
// Sprint 26ae changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on word term → font-display class.
//   - Category active state: bg-[rgb(var(--primary))] + text-white →
//     bg-primary + text-primary-fg (DS rule — semantic fill, hover stays).
//   - "Did you know" prefix 💡 tagged TODO(icons) + aria-hidden.
//   - CATEGORIES emojis (📚 🥩 🧄 🔥 🫕) inside chip filters tagged
//     TODO(icons) + aria-hidden — categorical content markers paired with
//     text labels.
//   - Per-word emojis stay as data content (tagged inline with TODO icons
//     comment at the render site).
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
//   - bg-[rgb(var(--primary)/0.06)] "did-you-know" inset → bg-primary/5
//     (rounded /6 → /5 standard scale).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from "react";
import { Search, BookOpen, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "Sastojak" | "Tehnika" | "Alat" | "Jelo";

interface GastroWord {
  term:       string;
  definition: string;
  didYouKnow?: string;
  category:   Category;
  emoji:      string;
}

// ── Dictionary data ───────────────────────────────────────────────────────────
const GASTRO_WORDS: GastroWord[] = [
  // ── Jela (Dishes)
  {
    term: "Ćevapi",
    definition: "Ručno oblikovani roštilj od miješanog mljevenog mesa — najčešće govedine i janjetine. Simbol balkanske kuhinje.",
    didYouKnow: "Bosanski ćevapi se tradicionalno prave BEZ jaja ili kruha — samo meso, sol i začini.",
    category: "Jelo", emoji: "🥩",
  },
  {
    term: "Pljeskavica",
    definition: "Velika, ravna šnicla od mljevenog mesa sa začinima, pečena na žaru. Srpska i bosanska varijanta razlikuju se po debljini i začinima.",
    didYouKnow: "Leskovačka pljeskavica zaštićena je geografska oznaka porijekla.",
    category: "Jelo", emoji: "🍔",
  },
  {
    term: "Sudžuka",
    definition: "Suha kobasica od goveđeg mesa s intenzivnim začinima — češnjak, kim, paprika. Suši se na hladnom zraku tjednima.",
    category: "Jelo", emoji: "🌭",
  },
  {
    term: "Burek",
    definition: "Pita od tankog lisnatog tijesta (jufke) punjenog mljevenim mesom. U Bosni isključivo mesna pita — ostale punjene pite zovu se po punjenju.",
    didYouKnow: "U Sarajevu bi vas burekdžija ispraviti: 'Sirovinom' se zove pita sa sirom, ne burek!",
    category: "Jelo", emoji: "🥧",
  },
  {
    term: "Mantije",
    definition: "Mali parčići tijesta punjeni mljevenim mesom, slični kineskim dim sum buhtelicama. Prelijevaju se vrhnjem ili jogurtom.",
    category: "Jelo", emoji: "🥟",
  },

  // ── Sastojci (Ingredients)
  {
    term: "Kajmak",
    definition: "Kremasti mlječni namaz dobiven kuhanjem svježeg mlijeka i skupljanjem kore koja se soli i odležava. Nezaobilazan uz ćevape.",
    didYouKnow: "Stari kajmak (odležan 3–4 tjedna) ima intenzivniji, blago pikantni okus od svježeg.",
    category: "Sastojak", emoji: "🧈",
  },
  {
    term: "Somun",
    definition: "Meki, ravni kruh pečen u pekarnici ili tandiru. Jedini autentični pratilac sarajevskih ćevapa — ne lepinja.",
    didYouKnow: "Somun za Ramazan peče se posebno — deblji je i mirisnije začinjen.",
    category: "Sastojak", emoji: "🫓",
  },
  {
    term: "Lepinja",
    definition: "Tanki, ravni kruh sličan pitinoj — standardni pratilac ćevapa u Hrvatskoj i dijelu Bosne. Razlikuje se od somuna debljinom i teksturom.",
    category: "Sastojak", emoji: "🫓",
  },
  {
    term: "Ajvar",
    definition: "Pikantni namaz od pečenih crvenih paprika i patlidžana. Domaći ajvar priprema se krajem ljeta i čuva u teglicama za cijelu godinu.",
    didYouKnow: "Naziv dolazi od turske riječi 'havyar' (kavijar) — jer je nekad bio delikates.",
    category: "Sastojak", emoji: "🫑",
  },
  {
    term: "Urnebes",
    definition: "Ljuti namaz od bijelog sira, feferona i češnjaka. Srpski specijalitet, posebno popularan uz pljeskavicu.",
    category: "Sastojak", emoji: "🧀",
  },

  // ── Tehnike (Techniques)
  {
    term: "Na žaru",
    definition: "Metoda pečenja direktno iznad žara od drvenog ugljena (ćumura). Daje karakteristični dimni okus koji gas ili električna ploča ne mogu replicirati.",
    didYouKnow: "Pravi majstori roštilja znaju čitati žar — boja i visina ćumura određuju intenzitet topline.",
    category: "Tehnika", emoji: "🔥",
  },
  {
    term: "Ispod sača",
    definition: "Kuhanje pokrivanjem namirnice metalnim zvonom (sačem) i zatrpavanjem žeravicom. Ravnomjerna toplina sa svih strana daje jedinstvenu sočnost.",
    didYouKnow: "Pod sačem se može peći kruh, janjetina, povrće — sve što zahtijeva sporo, vlažno kuhanje.",
    category: "Tehnika", emoji: "🍲",
  },
  {
    term: "Na ražnju",
    definition: "Pečenje cijele životinje (najčešće janjetine ili svinje) sporim okretanjem iznad žara satima. Tradicija svečanih balkanski obroka.",
    category: "Tehnika", emoji: "🍖",
  },

  // ── Alati (Tools)
  {
    term: "Sač",
    definition: "Metalno zvono (poklopac) ispod kojeg se peče meso ili kruh. Poklopi se namirnica, a odozgo se grne žeravica i pepeo.",
    didYouKnow: "Sač je balkanska verzija konvekcijskog kuhanja — postoji tisućama godina.",
    category: "Alat", emoji: "🫕",
  },
  {
    term: "Tandir",
    definition: "Cilindrična glinena peć ukopana u zemlju, zagrijana ćumurom. Koristi se za pečenje somuna i pojedinih vrsta mesa.",
    didYouKnow: "Tandir se koristi i u indijskoj (tandoor), persijskoj i centralnoazijskoj kuhinji.",
    category: "Alat", emoji: "🏺",
  },
  {
    term: "Ćumur",
    definition: "Drveni ugljen — gorivo i izvor topline za roštilj. Kvaliteta ćumura direktno utječe na okus — bukva i hrast daju najčistiji žar.",
    didYouKnow: "Iskusni roštiljaši nikad ne peku na plamenu — čekaju dok ćumur postane siv i bez plamena.",
    category: "Alat", emoji: "🪵",
  },
];

const PAGE_SIZE = 5;

const CATEGORIES: { key: Category | "Sve"; label: string; emoji: string }[] = [
  { key: "Sve",       label: "Sve",       emoji: "📚" },
  { key: "Jelo",      label: "Jela",      emoji: "🥩" },
  { key: "Sastojak",  label: "Sastojci",  emoji: "🧄" },
  { key: "Tehnika",   label: "Tehnike",   emoji: "🔥" },
  { key: "Alat",      label: "Alati",     emoji: "🫕" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function GastroDictionary() {
  const [query,        setQuery]        = useState("");
  const [category,     setCategory]     = useState<Category | "Sve">("Sve");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever the filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, category]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return GASTRO_WORDS.filter((w) => {
      const matchesCat = category === "Sve" || w.category === category;
      const matchesQ   = !q
        || w.term.toLowerCase().includes(q)
        || w.definition.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, category]);

  const visible  = filtered.slice(0, visibleCount);
  const hasMore  = visibleCount < filtered.length;
  const remaining = filtered.length - visibleCount;

  return (
    <div className="rounded-card border border-border bg-surface/40 p-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted uppercase tracking-widest font-medium">
          Gastro rječnik
        </p>
        <span className="ml-auto text-xs text-muted opacity-60">
          {filtered.length} / {GASTRO_WORDS.length} pojmova
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Traži pojam..."
          className="w-full pl-9 pr-8 py-2 rounded-chip border border-border bg-background text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Očisti pretragu"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category chips — emoji are categorical markers paired with text */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {CATEGORIES.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              category === key
                ? "bg-primary text-primary-fg"
                : "border border-border text-muted hover:border-primary/40 hover:text-foreground",
            )}
          >
            {/* TODO(icons): swap category emoji for brand category SVGs */}
            <span aria-hidden="true">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted py-6">
          Nema rezultata za &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((w) => (
            <div
              key={w.term}
              className="rounded-chip border border-border/70 bg-surface/30 p-3 hover:border-primary/25 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                {/* TODO(icons): per-word emoji are content data — Sprint 27
                    may keep emoji or swap for brand glyphs */}
                <span className="text-xl leading-none mt-0.5 flex-shrink-0" aria-hidden="true">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-display text-sm font-bold text-foreground">
                      {w.term}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted">
                      {w.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {w.definition}
                  </p>
                  {w.didYouKnow && (
                    <p className="mt-2 text-[11px] text-primary/80 bg-primary/5 rounded-chip px-2.5 py-1.5 leading-relaxed">
                      {/* TODO(icons): swap 💡 for brand <Tip> / Lightbulb */}
                      <span aria-hidden="true">💡</span> <span className="font-semibold">Znaš li?</span> {w.didYouKnow}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ── Load more ───────────────────────────────────────────────── */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 rounded-chip border border-border/70 text-xs font-medium text-muted hover:text-foreground hover:border-primary/35 hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Učitaj još
              <span className="opacity-50">({remaining})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
