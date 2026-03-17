"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Flame, Scale, ShoppingBag, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type HungerLevel = "light" | "standard" | "merak";

interface HungerConfig {
  label:      string;
  emoji:      string;
  desc:       string;
  cevapCount: number; // pieces per person
  meatGrams:  number; // grams of meat per piece
}

const HUNGER_LEVELS: Record<HungerLevel, HungerConfig> = {
  light: {
    label:      "Lagano",
    emoji:      "🥗",
    desc:       "5 komada — mala porcija, za zagrijavanje.",
    cevapCount: 5,
    meatGrams:  25,
  },
  standard: {
    label:      "Standardno",
    emoji:      "🍽️",
    desc:       "10 komada — standardna porcija, zlatna sredina.",
    cevapCount: 10,
    meatGrams:  25,
  },
  merak: {
    label:      "Merak-Level",
    emoji:      "🔥",
    desc:       "15 komada — velika porcija, samo za najhrabrije!",
    cevapCount: 15,
    meatGrams:  25,
  },
};

// Somun serves ~5 ćevapi comfortably
const CEVAPI_PER_SOMUN = 5;
// Rough cost estimates (BAM)
const MEAT_PRICE_PER_KG = 18;   // mixed beef/lamb
const SOMUN_PRICE_EACH  = 0.70;
const ONION_PRICE       = 0.50; // per person (luk, kajmak estimate)
const EXTRAS_PER_PERSON = 1.00; // ajvar, napkins, etc.

function round1(n: number) { return Math.round(n * 10) / 10; }

export function GroupCalculator() {
  const [people,        setPeople]       = useState(4);
  const [hunger,        setHunger]       = useState<HungerLevel>("standard");
  const [userWeightKg,  setUserWeightKg] = useState<number | null>(null);
  const [loading,       setLoading]      = useState(true);

  // Try to load user's weight from their profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("weight_kg")
          .eq("id", user.id)
          .single();
        setUserWeightKg((data as { weight_kg: number | null } | null)?.weight_kg ?? null);
      }
      setLoading(false);
    });
  }, []);

  const cfg = HUNGER_LEVELS[hunger];

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalCevapi   = people * cfg.cevapCount;
  const totalMeatKg   = round1((totalCevapi * cfg.meatGrams) / 1000);
  const totalSomuns   = Math.ceil(totalCevapi / CEVAPI_PER_SOMUN);
  const meatCost      = totalMeatKg * MEAT_PRICE_PER_KG;
  const somunCost     = totalSomuns * SOMUN_PRICE_EACH;
  const extrasCost    = people * (ONION_PRICE + EXTRAS_PER_PERSON);
  const totalCost     = round1(meatCost + somunCost + extrasCost);
  const perPersonCost = round1(totalCost / people);

  // Personal portion hint based on body weight
  // Rule of thumb: ~2–3g protein per kg body weight → ~50g meat per 10kg body weight
  const personalMeatG = userWeightKg != null
    ? Math.round((userWeightKg * 0.5) / cfg.meatGrams) * cfg.meatGrams
    : null;
  const personalCevapi = personalMeatG != null
    ? Math.max(3, Math.round(personalMeatG / cfg.meatGrams))
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-[rgb(var(--foreground))] uppercase tracking-wide"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                Squad Ćevap-ulator
              </h2>
              <p className="text-xs text-[rgb(var(--muted))]">
                Izračunaj meso, somune i budžet za cijelu ekipu
              </p>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="px-6 py-5 space-y-5">

          {/* People count */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Broj gladnih usta
              </span>
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--foreground))] text-xl font-bold hover:bg-[rgb(var(--border)/0.5)] transition-colors flex items-center justify-center"
              >
                −
              </button>
              <span className="text-4xl font-bold text-[rgb(var(--foreground))] w-16 text-center tabular-nums"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                {people}
              </span>
              <button
                type="button"
                onClick={() => setPeople((p) => Math.min(50, p + 1))}
                className="w-10 h-10 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--foreground))] text-xl font-bold hover:bg-[rgb(var(--border)/0.5)] transition-colors flex items-center justify-center"
              >
                +
              </button>
              <input
                type="range"
                min={1}
                max={50}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="flex-1 accent-[rgb(var(--primary))]"
              />
            </div>
          </div>

          {/* Hunger level */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              Razina gladi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(HUNGER_LEVELS) as [HungerLevel, HungerConfig][]).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHunger(key)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center",
                    hunger === key
                      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)]"
                  )}
                >
                  <span className="text-2xl leading-none">{c.emoji}</span>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    hunger === key ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--foreground))]"
                  )}>
                    {c.label}
                  </span>
                  <span className="text-[10px] text-[rgb(var(--muted))] leading-tight hidden sm:block">
                    {c.cevapCount} kom/os.
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-[rgb(var(--muted))] mt-2 text-center">{cfg.desc}</p>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pb-6">
          <div className="rounded-xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.06)] p-5">
            <p className="text-xs text-[rgb(var(--primary))] uppercase tracking-widest font-semibold mb-4">
              Rezultat za {people} {people === 1 ? "osobu" : people < 5 ? "osobe" : "osoba"}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Total ćevapi */}
              <div className="rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-3">
                <p className="text-xs text-[rgb(var(--muted))] mb-0.5">Ukupno ćevapa</p>
                <p className="text-2xl font-bold text-[rgb(var(--foreground))] tabular-nums"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {totalCevapi}
                  <span className="text-sm font-normal text-[rgb(var(--muted))] ml-1">kom</span>
                </p>
              </div>

              {/* Meat */}
              <div className="rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Scale className="w-3 h-3 text-[rgb(var(--muted))]" />
                  <p className="text-xs text-[rgb(var(--muted))]">Meso</p>
                </div>
                <p className="text-2xl font-bold text-[rgb(var(--foreground))] tabular-nums"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {totalMeatKg}
                  <span className="text-sm font-normal text-[rgb(var(--muted))] ml-1">kg</span>
                </p>
              </div>

              {/* Somuns */}
              <div className="rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <ShoppingBag className="w-3 h-3 text-[rgb(var(--muted))]" />
                  <p className="text-xs text-[rgb(var(--muted))]">Somuni</p>
                </div>
                <p className="text-2xl font-bold text-[rgb(var(--foreground))] tabular-nums"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {totalSomuns}
                  <span className="text-sm font-normal text-[rgb(var(--muted))] ml-1">kom</span>
                </p>
              </div>

              {/* Budget */}
              <div className="rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Banknote className="w-3 h-3 text-[rgb(var(--muted))]" />
                  <p className="text-xs text-[rgb(var(--muted))]">Po osobi ~</p>
                </div>
                <p className="text-2xl font-bold text-[rgb(var(--primary))] tabular-nums"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {perPersonCost}
                  <span className="text-sm font-normal text-[rgb(var(--muted))] ml-1">KM</span>
                </p>
              </div>
            </div>

            {/* Total cost summary */}
            <div className="flex items-center justify-between text-sm border-t border-[rgb(var(--border))] pt-3">
              <span className="text-[rgb(var(--muted))]">Ukupni budžet (procjena)</span>
              <span className="font-bold text-[rgb(var(--foreground))]">{totalCost} KM</span>
            </div>

            {/* Personal touch */}
            {!loading && personalCevapi != null && (
              <div className="mt-3 pt-3 border-t border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                💡 Na osnovu tvoje tjelesne težine ({userWeightKg} kg), preporučena porcija za tebe je ~{personalCevapi} komada ({Math.round(personalCevapi * cfg.meatGrams)}g mesa).
              </div>
            )}

            {/* Price disclaimer */}
            <p className="text-[10px] text-[rgb(var(--muted))/0.5] mt-3 text-center">
              * Procjene su okvirne — meso ~{MEAT_PRICE_PER_KG} KM/kg, somun ~{SOMUN_PRICE_EACH.toFixed(2)} KM
            </p>
          </div>

          {/* ── Academy redirect ──────────────────────────────────────── */}
          <Link
            href="/academy#burnoff"
            className="mt-5 flex items-center gap-4 rounded-xl border border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--primary)/0.05)] p-4 hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.08)] transition-all group"
          >
            <span className="text-3xl leading-none select-none">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">
                Želiš izgorjeti ove kalorije?
              </p>
              <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                Ćevap-Akademija ima Balkan Workout kalkulator s cijepanjem drva, kolom i betoniranjem.
              </p>
            </div>
            <Flame className="w-4 h-4 text-[rgb(var(--primary))] flex-shrink-0 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
