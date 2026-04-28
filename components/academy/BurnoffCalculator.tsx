"use client";

// ── BurnoffCalculator · academy (Sprint 26ae · DS-migrated) ───────────────────
// "Balkan Workout" calorie-vs-exercise calculator. Shows how long you'd need
// to do various Balkan-themed activities to burn off N ćevapi worth of meal.
//
// Sprint 26ae changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases (~39 sites).
//   - 5× style={{fontFamily:"Oswald"}} → font-display class (header h2,
//     ćevap counter, weight readout, calories total, workout time).
//   - All text-[rgb(var(--foreground)/0.X)] opacity variants → text-foreground/X
//     (standard Tailwind opacity syntax).
//   - bg-[rgb(var(--background)/0.4-0.6)] surfaces → bg-background/40 / /60.
//   - bg-[rgb(var(--border)/0.8)] step buttons → bg-border/80.
//   - Range slider accent-[rgb(var(--primary))] → accent-primary.
//   - Progress bar gradient: from-[rgb(var(--primary)/0.8)] +
//     to-[rgb(var(--primary))] → from-primary/80 + to-primary (gradient on
//     non-CTA visualisations stays allowed per DS §8 — flat-fill rule only
//     locks primary CTAs).
//   - Disclaimer text-[rgb(var(--primary)/0.8)] → text-primary/80.
//   - Emoji 🍖 🥗 ⚖️ 🏋️ ⚠️ in section labels tagged TODO(icons) +
//     aria-hidden — section-prefix decorations paired with text labels.
//   - Extras emojis (🥯 🧅 🧈 🫑) and workout emoji (data-driven) tagged
//     for icons but kept as content markers.
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flame, Calculator, ChevronUp, ChevronDown } from "lucide-react";
import {
  CALORIE_DATA,
  BALKAN_WORKOUTS,
  calculateMealCalories,
  calculateBurnoffMinutes,
} from "@/constants/burnoff";
import { cn } from "@/lib/utils";

// Progress bar fills to 100 % when workout duration hits this many minutes.
const MAX_BAR_MINS = 150; // 2.5 h  →  gives nice spread at typical meal sizes

/** "1h 23min" / "45 min" */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function BurnoffCalculator() {
  const t = useTranslations("academy");

  const [cevapCount, setCevapCount] = useState(10);
  const [weight,     setWeight]     = useState(80);
  const [extras,     setExtras]     = useState({
    lepinja: true,
    onion:   true,
    kaymak:  false,
    ajvar:   false,
  });

  const totalCalories = calculateMealCalories(cevapCount, extras);

  return (
    <div
      id="burnoff"
      className="rounded-card border border-border bg-surface/40 overflow-hidden"
    >
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-primary/5">
        <div className="w-10 h-10 rounded-chip bg-primary/15 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("burnoffTitle")}
          </h2>
          <p className="text-foreground/60 text-xs">{t("burnoffSubtitle")}</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ════════════════════════════════════════
            INPUT PANEL
        ════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Ćevap count */}
          <div>
            <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-widest mb-3">
              {/* TODO(icons): swap 🍖 for brand <Cevapi> */}
              <span aria-hidden="true">🍖</span> {t("cevapCount")}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCevapCount((c) => Math.max(1, c - 1))}
                aria-label="Smanji broj ćevapa"
                className="w-10 h-10 rounded-chip bg-border/80 hover:bg-primary/20 text-foreground transition-colors flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <div className="flex-1 text-center">
                <span className="font-display text-4xl font-bold text-primary">
                  {cevapCount}
                </span>
                <span className="text-foreground/60 text-sm ml-2">
                  kom × {CALORIE_DATA.cevap} kcal
                </span>
              </div>

              <button
                onClick={() => setCevapCount((c) => Math.min(30, c + 1))}
                aria-label="Povećaj broj ćevapa"
                className="w-10 h-10 rounded-chip bg-border/80 hover:bg-primary/20 text-foreground transition-colors flex items-center justify-center"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-2 justify-center">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setCevapCount(n)}
                  className={cn(
                    "px-3 py-1 rounded-chip text-xs font-medium border transition-colors",
                    cevapCount === n
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-border text-foreground/60 hover:text-foreground/90",
                  )}
                >
                  {n} kom
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div>
            <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-widest mb-3">
              {/* TODO(icons): swap 🥗 for brand <Extras> */}
              <span aria-hidden="true">🥗</span> {t("extras")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "lepinja" as const, emoji: "🥯", label: t("lepinja"), cal: CALORIE_DATA.lepinja },
                { key: "onion"   as const, emoji: "🧅", label: t("onion"),   cal: CALORIE_DATA.onion   },
                { key: "kaymak"  as const, emoji: "🧈", label: t("kaymak"),  cal: CALORIE_DATA.kaymak  },
                { key: "ajvar"   as const, emoji: "🫑", label: t("ajvar"),   cal: CALORIE_DATA.ajvar   },
              ].map(({ key, emoji, label, cal }) => (
                <button
                  key={key}
                  onClick={() => setExtras((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-chip border text-sm transition-all",
                    extras[key]
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-foreground/70 hover:text-foreground/90 hover:border-border/60",
                  )}
                >
                  {/* TODO(icons): swap extras emoji for brand <Lepinja>/<Luk>/<Kajmak>/<Ajvar> */}
                  <span aria-hidden="true">{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto text-xs opacity-70">+{cal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body weight slider */}
          <div>
            <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-widest mb-3">
              {/* TODO(icons): swap ⚖️ for brand <Scale> */}
              <span aria-hidden="true">⚖️</span> {t("weight")}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={40}
                max={150}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                aria-label={`Težina: ${weight} kg`}
                className="flex-1 accent-primary"
              />
              <span className="font-display text-xl font-bold text-foreground w-16 text-right">
                {weight} kg
              </span>
            </div>
          </div>

          {/* Live calorie total */}
          <div className="rounded-chip bg-background/60 border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground/80 text-sm">
              <Flame className="w-4 h-4 text-primary" />
              {t("totalCalories")}:
            </div>
            <span className="font-display text-2xl font-bold text-primary">
              {totalCalories}{" "}
              <span className="text-sm font-normal text-foreground/60">kcal</span>
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            BALKAN WORKOUT PANEL (real-time)
        ════════════════════════════════════════ */}
        <div>
          <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-widest mb-4">
            {/* TODO(icons): swap 🏋️ for brand <Workout> */}
            <span aria-hidden="true">🏋️</span> {t("burnoffTitle2")}
          </label>

          {/* Workout cards — 1 col on mobile, 2 cols on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BALKAN_WORKOUTS.map((workout) => {
              const mins       = calculateBurnoffMinutes(totalCalories, workout.kcalPerHour, weight);
              const percentage = Math.min(100, Math.round((mins / MAX_BAR_MINS) * 100));

              return (
                <div
                  key={workout.key}
                  className="rounded-card border border-border bg-background/40 p-4 hover:border-primary/30 transition-colors"
                >
                  {/* Name + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Workout emoji is data — categorical content marker */}
                      <span className="text-xl" aria-hidden="true">{workout.emoji}</span>
                      <span className="font-semibold text-foreground text-sm">
                        {workout.name}
                      </span>
                    </div>
                    <span className="font-display font-bold text-primary text-lg tabular-nums">
                      {formatTime(mins)}
                    </span>
                  </div>

                  {/* Progress bar — fills as calories increase. Gradient on
                      non-CTA visualisation is allowed per DS §8. */}
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Rate chip + fun fact */}
                  <div className="flex items-start justify-between mt-1.5 gap-2">
                    <p className="text-foreground/55 text-xs italic flex-1 leading-snug">
                      {workout.funFact}
                    </p>
                    <span className="shrink-0 text-[10px] text-foreground/45 tabular-nums">
                      {workout.kcalPerHour} kcal/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer — spans full width below the grid */}
          <div className="rounded-card border border-primary/20 bg-primary/5 p-4 text-center mt-1">
            <p className="text-primary/80 text-xs italic">
              {/* TODO(icons): swap ⚠️ for brand <Warning> / <Caution> */}
              <span aria-hidden="true">⚠️</span> Ovi izračuni su procjena za osobu od{" "}
              <span className="font-semibold not-italic">{weight} kg</span>.
              Konsultiraj liječnika, ne aplikaciju za ćevape.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
