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
      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] overflow-hidden"
    >
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[rgb(var(--border))] bg-[rgb(var(--primary)/0.05)]">
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
          <Calculator className="w-5 h-5 text-[rgb(var(--primary))]" />
        </div>
        <div>
          <h2
            className="text-xl font-bold text-[rgb(var(--foreground))]"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {t("burnoffTitle")}
          </h2>
          <p className="text-[rgb(var(--foreground)/0.6)] text-xs">{t("burnoffSubtitle")}</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ════════════════════════════════════════
            INPUT PANEL
        ════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Ćevap count */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--foreground)/0.8)] uppercase tracking-widest mb-3">
              🍖 {t("cevapCount")}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCevapCount((c) => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl bg-[rgb(var(--border)/0.8)] hover:bg-[rgb(var(--primary)/0.2)] text-[rgb(var(--foreground))] transition-colors flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <div className="flex-1 text-center">
                <span
                  className="text-4xl font-bold text-[rgb(var(--primary))]"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {cevapCount}
                </span>
                <span className="text-[rgb(var(--foreground)/0.6)] text-sm ml-2">
                  kom × {CALORIE_DATA.cevap} kcal
                </span>
              </div>

              <button
                onClick={() => setCevapCount((c) => Math.min(30, c + 1))}
                className="w-10 h-10 rounded-xl bg-[rgb(var(--border)/0.8)] hover:bg-[rgb(var(--primary)/0.2)] text-[rgb(var(--foreground))] transition-colors flex items-center justify-center"
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
                      ? "border-[rgb(var(--primary)/0.6)] bg-[rgb(var(--primary)/0.2)] text-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] text-[rgb(var(--foreground)/0.6)] hover:text-[rgb(var(--foreground)/0.9)]",
                  )}
                >
                  {n} kom
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--foreground)/0.8)] uppercase tracking-widest mb-3">
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
                      ? "border-[rgb(var(--primary)/0.6)] bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] text-[rgb(var(--foreground)/0.7)] hover:text-[rgb(var(--foreground)/0.9)] hover:border-[rgb(var(--border)/0.6)]",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto text-xs opacity-70">+{cal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body weight slider */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--foreground)/0.8)] uppercase tracking-widest mb-3">
              ⚖️ {t("weight")}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={40}
                max={150}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="flex-1 accent-[rgb(var(--primary))]"
              />
              <span
                className="text-xl font-bold text-[rgb(var(--foreground))] w-16 text-right"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {weight} kg
              </span>
            </div>
          </div>

          {/* Live calorie total */}
          <div className="rounded-xl bg-[rgb(var(--background)/0.6)] border border-[rgb(var(--border))] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[rgb(var(--foreground)/0.8)] text-sm">
              <Flame className="w-4 h-4 text-[rgb(var(--primary))]" />
              {t("totalCalories")}:
            </div>
            <span
              className="text-2xl font-bold text-[rgb(var(--primary))]"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {totalCalories}{" "}
              <span className="text-sm font-normal text-[rgb(var(--foreground)/0.6)]">kcal</span>
            </span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            BALKAN WORKOUT PANEL (real-time)
        ════════════════════════════════════════ */}
        <div>
          <label className="block text-xs font-semibold text-[rgb(var(--foreground)/0.8)] uppercase tracking-widest mb-4">
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
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background)/0.4)] p-4 hover:border-[rgb(var(--primary)/0.3)] transition-colors"
                >
                  {/* Name + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{workout.emoji}</span>
                      <span className="font-semibold text-[rgb(var(--foreground))] text-sm">
                        {workout.name}
                      </span>
                    </div>
                    <span
                      className="font-bold text-[rgb(var(--primary))] text-lg tabular-nums"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {formatTime(mins)}
                    </span>
                  </div>

                  {/* Progress bar — fills as calories increase */}
                  <div className="h-2 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary)/0.8)] to-[rgb(var(--primary))] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Rate chip + fun fact */}
                  <div className="flex items-start justify-between mt-1.5 gap-2">
                    <p className="text-[rgb(var(--foreground)/0.55)] text-xs italic flex-1 leading-snug">
                      {workout.funFact}
                    </p>
                    <span className="shrink-0 text-[10px] text-[rgb(var(--foreground)/0.45)] tabular-nums">
                      {workout.kcalPerHour} kcal/h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer — spans full width below the grid */}
          <div className="rounded-2xl border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.05)] p-4 text-center mt-1">
            <p className="text-[rgb(var(--primary)/0.8)] text-xs italic">
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
