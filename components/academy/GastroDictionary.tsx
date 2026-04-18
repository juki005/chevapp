"use client";

// ── GastroDictionary ──────────────────────────────────────────────────────────
// Searchable archive of Balkan gastro terminology.
// Sits below the "Word of the Day" card in AcademyDashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { Search, BookOpen, X } from "lucide-react";
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

const CATEGORIES: { key: Category | "Sve"; label: string; emoji: string }[] = [
  { key: "Sve",       label: "Sve",       emoji: "📚" },
  { key: "Jelo",      label: "Jela",      emoji: "🥩" },
  { key: "Sastojak",  label: "Sastojci",  emoji: "🧄" },
  { key: "Tehnika",   label: "Tehnike",   emoji: "🔥" },
  { key: "Alat",      label: "Alati",     emoji: "🫕" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function GastroDictionary() {
  const [query,    setQuery]    = useState("");
  const [category, setCategory] = useState<Category | "Sve">("Sve");

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

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-[rgb(var(--primary))]" />
        <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
          Gastro rječnik
        </p>
        <span className="ml-auto text-xs text-[rgb(var(--muted))] opacity-60">
          {filtered.length} / {GASTRO_WORDS.length} pojmova
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))] pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Traži pojam..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {CATEGORIES.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              category === key
                ? "bg-[rgb(var(--primary))] text-white"
                : "border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary)/0.4)] hover:text-[rgb(var(--foreground))]",
            )}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-[rgb(var(--muted))] py-6">
          Nema rezultata za &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <div
              key={w.term}
              className="rounded-xl border border-[rgb(var(--border)/0.7)] bg-[rgb(var(--surface)/0.3)] p-3 hover:border-[rgb(var(--primary)/0.25)] transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5 flex-shrink-0">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-sm font-bold text-[rgb(var(--foreground))]"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {w.term}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))]">
                      {w.category}
                    </span>
                  </div>
                  <p className="text-xs text-[rgb(var(--muted))] leading-relaxed">
                    {w.definition}
                  </p>
                  {w.didYouKnow && (
                    <p className="mt-2 text-[11px] text-[rgb(var(--primary)/0.8)] bg-[rgb(var(--primary)/0.06)] rounded-lg px-2.5 py-1.5 leading-relaxed">
                      💡 <span className="font-semibold">Znaš li?</span> {w.didYouKnow}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
