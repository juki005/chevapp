"use client";

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
      className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30 overflow-hidden"
    >
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-charcoal-700 dark:border-ugljen-border bg-burnt-orange-500/5">
        <div className="w-10 h-10 rounded-xl bg-burnt-orange-500/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-burnt-orange-400" />
        </div>
        <div>
          <h2
            className="text-xl font-bold text-cream"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {t("burnoffTitle")}
          </h2>
          <p className="text-cream/40 text-xs">{t("burnoffSubtitle")}</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ════════════════════════════════════════
            INPUT PANEL
        ════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Ćevap count */}
          <div>
            <label className="block text-xs font-semibold text-cream/50 uppercase tracking-widest mb-3">
              🍖 {t("cevapCount")}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCevapCount((c) => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl bg-charcoal-700 dark:bg-ugljen-border hover:bg-burnt-orange-500/20 text-cream transition-colors flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <div className="flex-1 text-center">
                <span
                  className="text-4xl font-bold text-burnt-orange-400"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {cevapCount}
                </span>
                <span className="text-cream/40 text-sm ml-2">
                  kom × {CALORIE_DATA.cevap} kcal
                </span>
              </div>

              <button
                onClick={() => setCevapCount((c) => Math.min(30, c + 1))}
                className="w-10 h-10 rounded-xl bg-charcoal-700 dark:bg-ugljen-border hover:bg-burnt-orange-500/20 text-cream transition-colors flex items-center justify-center"
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
                    "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                    cevapCount === n
                      ? "border-burnt-orange-500/60 bg-burnt-orange-500/20 text-burnt-orange-400"
                      : "border-charcoal-600 dark:border-ugljen-border text-cream/40 hover:text-cream/70",
                  )}
                >
                  {n} kom
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div>
            <label className="block text-xs font-semibold text-cream/50 uppercase tracking-widest mb-3">
              🥗 {t("extras")}
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
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all",
                    extras[key]
                      ? "border-burnt-orange-500/60 bg-burnt-orange-500/15 text-burnt-orange-300"
                      : "border-charcoal-600 dark:border-ugljen-border text-cream/50 hover:text-cream/80",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto text-xs opacity-60">+{cal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body weight slider */}
          <div>
            <label className="block text-xs font-semibold text-cream/50 uppercase tracking-widest mb-3">
              ⚖️ {t("weight")}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={40}
                max={150}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="flex-1 accent-burnt-orange-500"
              />
              <span
                className="text-xl font-bold text-cream w-16 text-right"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {weight} kg
              </span>
            </div>
          </div>

          {/* Live calorie total */}
          <div className="rounded-xl bg-charcoal-900/60 dark:bg-ugljen-bg/60 border border-charcoal-600 dark:border-ugljen-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-cream/60 text-sm">
              <Flame className="w-4 h-4 text-burnt-orange-400" />
              {t("totalCalories")}:
            </div>
            <span
              className="text-2xl font-bold text-burnt-orange-400"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {totalCalories}{" "}
              <span className="text-sm font-normal text-cream/40">kcal</span>
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            BALKAN WORKOUT PANEL (real-time)
        ════════════════════════════════════════ */}
        <div>
          <label className="block text-xs font-semibold text-cream/50 uppercase tracking-widest mb-4">
            🏋️ {t("burnoffTitle2")}
          </label>

          {/* Workout cards — 1 col on mobile, 2 cols on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BALKAN_WORKOUTS.map((workout) => {
              const mins       = calculateBurnoffMinutes(totalCalories, workout.kcalPerHour, weight);
              const percentage = Math.min(100, Math.round((mins / MAX_BAR_MINS) * 100));

              return (
                <div
                  key={workout.key}
                  className="rounded-2xl border border-charcoal-600 dark:border-ugljen-border bg-charcoal-900/40 dark:bg-ugljen-bg/40 p-4 hover:border-burnt-orange-500/30 transition-colors"
                >
                  {/* Name + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{workout.emoji}</span>
                      <span className="font-semibold text-cream text-sm">
                        {workout.name}
                      </span>
                    </div>
                    <span
                      className="font-bold text-burnt-orange-400 text-lg tabular-nums"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {formatTime(mins)}
                    </span>
                  </div>

                  {/* Progress bar — fills as calories increase */}
                  <div className="h-2 rounded-full bg-charcoal-700 dark:bg-ugljen-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-burnt-orange-600 to-burnt-orange-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Rate chip + fun fact */}
                  <div className="flex items-start justify-between mt-1.5 gap-2">
                    <p className="text-cream/30 text-xs italic flex-1 leading-snug">
                      {workout.funFact}
                    </p>
                    <span className="shrink-0 text-[10px] text-cream/20 tabular-nums">
                      {workout.kcalPerHour} kcal/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer — spans full width below the grid */}
          <div className="rounded-2xl border border-burnt-orange-500/20 bg-burnt-orange-500/5 p-4 text-center mt-1">
            <p className="text-burnt-orange-400/70 text-xs italic">
              ⚠️ Ovi izračuni su procjena za osobu od{" "}
              <span className="font-semibold not-italic">{weight} kg</span>.
              Konsultiraj liječnika, ne aplikaciju za ćevape.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
