"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATARS = [
  { emoji: "🧑‍🍳", label: "Grill Majstor" },
  { emoji: "🍽️",  label: "Gurman"        },
  { emoji: "✈️",  label: "Turist"        },
  { emoji: "🏠",  label: "Lokalac"       },
];

const CITIES = [
  "Sarajevo", "Mostar", "Banja Luka", "Tuzla", "Zenica",
  "Zagreb", "Split", "Rijeka", "Osijek",
  "Beograd", "Novi Sad", "Niš",
  "Ljubljana", "Skopje", "Priština", "Podgorica",
];

const TOTAL_STEPS = 4;

// ── Slide animation ───────────────────────────────────────────────────────────

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? "100%"  : "-100%", opacity: 0 }),
  center:               () => ({ x: 0,                          opacity: 1 }),
  exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%",  opacity: 0 }),
};

const slideTransition = { type: "spring", stiffness: 300, damping: 30 };

// ── Shared button style helpers ───────────────────────────────────────────────

function primaryBtn(active: boolean): React.CSSProperties {
  return {
    height: 52,
    background: active ? "rgb(var(--primary))" : "rgb(var(--border))",
    color: active ? "#fff" : "rgb(var(--muted))",
    fontFamily: "Oswald, sans-serif",
    fontSize: 16,
    letterSpacing: "0.04em",
    cursor: active ? "pointer" : "not-allowed",
    borderRadius: 16,
    width: "100%",
    fontWeight: 700,
    border: "none",
    transition: "all 0.2s",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userId:     string;
  onComplete: () => void;
}

export function OnboardingFlow({ userId, onComplete }: Props) {
  const supabase = createClient();
  const [step,   setStep]   = useState(0);
  const [dir,    setDir]    = useState(1);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  // Step 0
  const [name,   setName]   = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Step 1
  const [condiment, setCondiment] = useState<"kajmak" | "ajvar" | null>(null);

  // Step 2
  const [city,     setCity]     = useState("");
  const [weightRaw, setWeightRaw] = useState("");   // string so input is controlled cleanly

  const nameRef = useRef<HTMLInputElement>(null);

  const advance = () => { setDir(1);  setStep((s) => s + 1); };
  const back    = () => { setDir(-1); setStep((s) => s - 1); };

  const step0Valid  = name.trim().length >= 2 && avatar !== null;
  const weightNum   = parseFloat(weightRaw.replace(",", "."));
  const weightValid = weightRaw === "" || (!isNaN(weightNum) && weightNum > 0 && weightNum < 500);

  // ── Finalize ──────────────────────────────────────────────────────────────
  const finalize = async () => {
    setSaving(true);

    const weight = weightRaw !== "" && !isNaN(weightNum) ? weightNum : null;

    // 1. Upsert profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any).upsert({
      id:                   userId,
      username:             name.trim() || null,
      avatar_url:           avatar,
      condiment_pref:       condiment,
      home_city:            city || null,
      weight_kg:            weight,
      onboarding_completed: true,
    });

    // 2. Award +50 XP
    const { data: prof } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("id", userId)
      .single();
    const currentXP = (prof as { xp_points: number } | null)?.xp_points ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any)
      .update({ xp_points: currentXP + 50 })
      .eq("id", userId);

    setSaving(false);
    setDone(true);

    // 3. Confetti
    const end = Date.now() + 2200;
    const colors = ["#D35400", "#F39C12", "#E74C3C", "#2ecc71", "#3498db"];
    (function burst() {
      confetti({ particleCount: 4, angle: 60,  spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(burst);
    })();

    window.dispatchEvent(new CustomEvent("chevapp:stats_updated", { detail: {} }));
  };

  const progressPct = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", maxHeight: "92dvh" }}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: "rgb(var(--border))" }}>
          <motion.div
            className="h-full"
            style={{ background: "rgb(var(--primary))" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Back button */}
        {step > 0 && step < 3 && !done && (
          <button
            onClick={back}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgb(var(--border))", color: "rgb(var(--muted))" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Step counter */}
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgb(var(--primary) / 0.12)", color: "rgb(var(--primary))" }}>
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "92dvh" }}>
          <AnimatePresence mode="wait" custom={dir}>

            {/* ══ STEP 0 — Identity ══════════════════════════════════════ */}
            {step === 0 && (
              <motion.div key="s0" custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit" transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-5">

                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}>Dobrodošao/la u ChevApp</p>
                  <h2 className="text-3xl font-bold"
                    style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>KO SI TI?</h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Daj nam ime i odaberi avatara
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgb(var(--muted))" }}>
                    Tvoje ime ili nadimak *
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="npr. Grill Maestro Juki"
                    maxLength={30}
                    className="w-full px-4 rounded-xl text-sm outline-none transition-all"
                    style={{
                      height: 52,
                      background: "rgb(var(--background))",
                      border: `1px solid ${name.length >= 2 ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                      color: "rgb(var(--foreground))",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && nameRef.current?.blur()}
                  />
                </div>

                {/* Avatar grid */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "rgb(var(--muted))" }}>
                    Tvoj avatar *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATARS.map(({ emoji, label }) => (
                      <button key={emoji} onClick={() => setAvatar(emoji)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                        style={{
                          background: avatar === emoji ? "rgb(var(--primary) / 0.12)" : "rgb(var(--background))",
                          border: `1px solid ${avatar === emoji ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                          transform: avatar === emoji ? "scale(1.06)" : "scale(1)",
                        }}>
                        <span className="text-3xl leading-none">{emoji}</span>
                        <span className="text-[10px] font-medium text-center px-1"
                          style={{ color: avatar === emoji ? "rgb(var(--primary))" : "rgb(var(--muted))" }}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={advance} disabled={!step0Valid} style={primaryBtn(step0Valid)}>
                  DALJE →
                </button>
              </motion.div>
            )}

            {/* ══ STEP 1 — Kajmak ili Ajvar ══════════════════════════════ */}
            {step === 1 && (
              <motion.div key="s1" custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit" transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-6">

                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}>Vječna dilema</p>
                  <h2 className="text-3xl font-bold"
                    style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                    KAJMAK ILI AJVAR?
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Ovo je jedino ispravno pitanje. Odaberi svoju stranu.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "kajmak" as const, emoji: "🧈", label: "KAJMAK", sub: "Kremasto, toplo, savršeno",    accent: "rgb(var(--primary))", accentBg: "rgba(211,84,0,0.12)"  },
                    { key: "ajvar"  as const, emoji: "🫑", label: "AJVAR",   sub: "Dimljeno, začinjeno, balkansko", accent: "#e74c3c",             accentBg: "rgba(231,76,60,0.12)" },
                  ].map(({ key, emoji, label, sub, accent, accentBg }) => {
                    const active = condiment === key;
                    return (
                      <button key={key} onClick={() => setCondiment(key)}
                        className="flex flex-col items-center gap-3 rounded-3xl p-6 transition-all"
                        style={{
                          background: active ? accentBg : "rgb(var(--background))",
                          border: `2px solid ${active ? accent : "rgb(var(--border))"}`,
                          transform: active ? "scale(1.03)" : "scale(1)",
                        }}>
                        <span className="text-5xl">{emoji}</span>
                        <div className="text-center">
                          <p className="font-bold text-base"
                            style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                            {label}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>{sub}</p>
                        </div>
                        {active && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: accent, color: "#fff" }}>
                            ✓ MOJ IZBOR
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button onClick={advance} disabled={!condiment} style={primaryBtn(!!condiment)}>
                  DALJE →
                </button>
              </motion.div>
            )}

            {/* ══ STEP 2 — City + Weight ═════════════════════════════════ */}
            {step === 2 && (
              <motion.div key="s2" custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit" transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-5">

                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}>Tvoj teritorij</p>
                  <h2 className="text-3xl font-bold"
                    style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                    BAZA OPERACIJA
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Odaberi grad i (opcionalno) unesi svoju težinu
                  </p>
                </div>

                {/* City grid */}
                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((c) => (
                    <button key={c} onClick={() => setCity(c)}
                      className="py-3 px-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: city === c ? "rgb(var(--primary) / 0.12)" : "rgb(var(--background))",
                        border: `1px solid ${city === c ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                        color: city === c ? "rgb(var(--primary))" : "rgb(var(--foreground))",
                        transform: city === c ? "scale(1.05)" : "scale(1)",
                      }}>
                      {c}
                    </button>
                  ))}
                </div>

                {/* Weight input */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgb(var(--muted))" }}>
                    Tvoja težina <span style={{ opacity: 0.6 }}>(opcionalno)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={weightRaw}
                        onChange={(e) => setWeightRaw(e.target.value)}
                        placeholder="npr. 78"
                        min={20}
                        max={300}
                        className="w-full px-4 pr-12 rounded-xl text-sm outline-none transition-all"
                        style={{
                          height: 52,
                          background: "rgb(var(--background))",
                          border: `1px solid ${!weightValid ? "#e74c3c" : weightRaw ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                          color: "rgb(var(--foreground))",
                          appearance: "textfield",
                          MozAppearance: "textfield",
                        } as React.CSSProperties}
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        kg
                      </span>
                    </div>
                  </div>
                  {!weightValid && (
                    <p className="text-xs mt-1" style={{ color: "#e74c3c" }}>
                      Unesi ispravnu težinu (npr. 65 ili 82.5)
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={advance}
                    className="flex-1 font-bold rounded-2xl transition-all"
                    style={{ height: 52, background: "rgb(var(--border))", color: "rgb(var(--muted))", fontFamily: "Oswald, sans-serif", fontSize: 14 }}>
                    Preskoči
                  </button>
                  <button onClick={() => { if (city && weightValid) advance(); }}
                    disabled={!city || !weightValid}
                    className="flex-[2] font-bold rounded-2xl transition-all"
                    style={primaryBtn(!!city && weightValid)}>
                    DALJE →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 3 — Finalization ══════════════════════════════════ */}
            {step === 3 && (
              <motion.div key="s3" custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit" transition={slideTransition}
                className="p-7 pt-14 flex flex-col items-center gap-6 text-center">

                {!done ? (
                  <>
                    <div className="text-6xl">🔥</div>
                    <div>
                      <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                        style={{ color: "rgb(var(--primary))" }}>Skoro gotovo</p>
                      <h2 className="text-3xl font-bold"
                        style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                        PROFIL SPREMAN
                      </h2>
                    </div>

                    {/* Summary card */}
                    <div className="w-full rounded-2xl p-4 space-y-3 text-left"
                      style={{ background: "rgb(var(--background))", border: "1px solid rgb(var(--border))" }}>
                      {[
                        { label: "Avatar",   value: `${avatar} ${name}` },
                        { label: "Izbor",    value: condiment === "kajmak" ? "🧈 Kajmak" : condiment === "ajvar" ? "🫑 Ajvar" : "—" },
                        { label: "Baza",     value: city || "—" },
                        { label: "Težina",   value: weightRaw ? `${weightRaw} kg` : "—" },
                        { label: "XP bonus", value: "+50 XP 🎁" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>{label}</span>
                          <span className="text-sm font-bold" style={{ color: "rgb(var(--foreground))" }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={finalize} disabled={saving}
                      className="w-full font-bold rounded-2xl flex items-center justify-center gap-2"
                      style={{
                        height: 56,
                        background: saving ? "rgb(var(--border))" : "rgb(var(--primary))",
                        color: saving ? "rgb(var(--muted))" : "#fff",
                        fontFamily: "Oswald, sans-serif",
                        fontSize: 18,
                        letterSpacing: "0.05em",
                        border: "none",
                        cursor: saving ? "not-allowed" : "pointer",
                      }}>
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          KALKULIRAM GRILL STATUS...
                        </>
                      ) : "AKTIVIRAJ PROFIL 🔥"}
                    </button>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col items-center gap-5 py-4 w-full">
                    <div className="text-7xl">🏆</div>
                    <div>
                      <h2 className="text-4xl font-bold mb-1"
                        style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                        DOBRODOŠAO/LA!
                      </h2>
                      <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {name}, tvoj grill status je aktiviran. +50 XP na računu!
                      </p>
                    </div>
                    <div className="w-full rounded-2xl p-4"
                      style={{ background: "rgb(var(--primary) / 0.1)", border: "1px solid rgb(var(--primary) / 0.3)" }}>
                      <p className="text-sm font-semibold" style={{ color: "rgb(var(--primary))" }}>
                        🌱 Rang: Početnik → skupljaj XP igrom i recenzijama da napreduješ!
                      </p>
                    </div>
                    <button onClick={onComplete}
                      className="w-full font-bold rounded-2xl"
                      style={{ height: 56, background: "rgb(var(--primary))", color: "#fff", fontFamily: "Oswald, sans-serif", fontSize: 20, letterSpacing: "0.06em", border: "none", cursor: "pointer" }}>
                      HAJDE DA JEDEMO! 🍖
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
