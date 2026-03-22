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
  enter:  (dir: number) => ({ x: dir > 0 ? "100%"  : "-100%", opacity: 0  }),
  center:               () => ({ x: 0,                          opacity: 1  }),
  exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%",  opacity: 0  }),
};

const slideTransition = { type: "spring", stiffness: 300, damping: 30 };

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userId:     string;
  onComplete: () => void;
}

export function OnboardingFlow({ userId, onComplete }: Props) {
  const supabase   = createClient();
  const [step,      setStep]      = useState(0);       // 0–3
  const [dir,       setDir]       = useState(1);       // slide direction
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);

  // Step 1 state
  const [name,   setName]   = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Step 2 state
  const [condiment, setCondiment] = useState<"kajmak" | "ajvar" | null>(null);

  // Step 3 state
  const [city, setCity] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  const advance = () => { setDir(1);  setStep((s) => s + 1); };
  const back    = () => { setDir(-1); setStep((s) => s - 1); };

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const step1Valid = name.trim().length >= 2 && avatar !== null;

  // ── Finalize ──────────────────────────────────────────────────────────────
  const finalize = async () => {
    setSaving(true);

    // 1. Upsert profile
    await (supabase.from("profiles") as any).upsert({
      id:                   userId,
      username:             name.trim() || null,
      avatar_url:           avatar,
      condiment_pref:       condiment,
      home_city:            city || null,
      onboarding_completed: true,
    });

    // 2. Award +50 XP (read → add → write)
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

    // 3. Confetti 🎉
    const end = Date.now() + 2200;
    const colors = ["#D35400", "#F39C12", "#E74C3C", "#2ecc71", "#3498db"];
    (function burst() {
      confetti({ particleCount: 4, angle: 60,  spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(burst);
    })();

    // 4. Notify gamification system
    window.dispatchEvent(new CustomEvent("chevapp:stats_updated", { detail: {} }));
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const progressPct = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    /* Full-screen glassmorphism overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Card */}
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "rgb(var(--surface))",
          border: "1px solid rgba(var(--border), 0.5)",
          maxHeight: "92dvh",
        }}
      >
        {/* ── Progress bar ────────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[rgb(var(--border))] z-10">
          <motion.div
            className="h-full"
            style={{ background: "rgb(var(--primary))" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* ── Back button ─────────────────────────────────────────────── */}
        {step > 0 && step < 3 && !done && (
          <button
            onClick={back}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: "rgb(var(--border) / 0.5)",
              color: "rgb(var(--muted))",
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* ── Step counter ─────────────────────────────────────────────── */}
        <div className="absolute top-4 right-4 z-10">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: "rgb(var(--primary) / 0.12)",
              color: "rgb(var(--primary))",
            }}
          >
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>

        {/* ── Sliding step content ─────────────────────────────────────── */}
        <div className="overflow-hidden" style={{ minHeight: 440 }}>
          <AnimatePresence mode="wait" custom={dir}>
            {/* ══ STEP 0 — Identity ══════════════════════════════════════ */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-6"
              >
                <div>
                  <p
                    className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}
                  >
                    Dobrodošao/la u ChevApp
                  </p>
                  <h2
                    className="text-3xl font-bold"
                    style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}
                  >
                    KO SI TI?
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Daj nam ime i odaberi avatara
                  </p>
                </div>

                {/* Name input */}
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
                      <button
                        key={emoji}
                        onClick={() => setAvatar(emoji)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all"
                        style={{
                          background: avatar === emoji ? "rgb(var(--primary) / 0.12)" : "rgb(var(--background))",
                          border: `1px solid ${avatar === emoji ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                          transform: avatar === emoji ? "scale(1.06)" : "scale(1)",
                        }}
                      >
                        <span className="text-3xl leading-none">{emoji}</span>
                        <span className="text-[10px] font-medium leading-tight text-center px-1"
                          style={{ color: avatar === emoji ? "rgb(var(--primary))" : "rgb(var(--muted))" }}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={advance}
                  disabled={!step1Valid}
                  className="w-full font-bold rounded-2xl transition-all"
                  style={{
                    height: 52,
                    background: step1Valid ? "rgb(var(--primary))" : "rgb(var(--border))",
                    color: step1Valid ? "#fff" : "rgb(var(--muted))",
                    fontFamily: "Oswald, sans-serif",
                    fontSize: 16,
                    letterSpacing: "0.04em",
                    cursor: step1Valid ? "pointer" : "not-allowed",
                  }}
                >
                  DALJE →
                </button>
              </motion.div>
            )}

            {/* ══ STEP 1 — The Great Debate ══════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-6"
              >
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}>
                    Vječna dilema
                  </p>
                  <h2 className="text-3xl font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                    KAJMAK ILI AJVAR?
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Ovo je jedino ispravno pitanje. Odaberi svoju stranu.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Kajmak Crew */}
                  <button
                    onClick={() => { setCondiment("kajmak"); }}
                    className="flex flex-col items-center gap-3 rounded-3xl p-6 border transition-all"
                    style={{
                      background: condiment === "kajmak" ? "rgba(211,84,0,0.12)" : "rgb(var(--background))",
                      border: `2px solid ${condiment === "kajmak" ? "rgb(var(--primary))" : "rgb(var(--border))"}`,
                      transform: condiment === "kajmak" ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <span className="text-5xl">🧈</span>
                    <div className="text-center">
                      <p className="font-bold text-base" style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                        KAJMAK CREW
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                        Kremasto, toplo, savršeno
                      </p>
                    </div>
                    {condiment === "kajmak" && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgb(var(--primary))", color: "#fff" }}>
                        ✓ MOJ IZBOR
                      </span>
                    )}
                  </button>

                  {/* Ajvar Army */}
                  <button
                    onClick={() => { setCondiment("ajvar"); }}
                    className="flex flex-col items-center gap-3 rounded-3xl p-6 border transition-all"
                    style={{
                      background: condiment === "ajvar" ? "rgba(231,76,60,0.12)" : "rgb(var(--background))",
                      border: `2px solid ${condiment === "ajvar" ? "#e74c3c" : "rgb(var(--border))"}`,
                      transform: condiment === "ajvar" ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <span className="text-5xl">🫑</span>
                    <div className="text-center">
                      <p className="font-bold text-base" style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                        AJVAR ARMY
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                        Dimljeno, začinjeno, balkansko
                      </p>
                    </div>
                    {condiment === "ajvar" && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#e74c3c", color: "#fff" }}>
                        ✓ MOJ IZBOR
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={advance}
                  disabled={!condiment}
                  className="w-full font-bold rounded-2xl transition-all"
                  style={{
                    height: 52,
                    background: condiment ? "rgb(var(--primary))" : "rgb(var(--border))",
                    color: condiment ? "#fff" : "rgb(var(--muted))",
                    fontFamily: "Oswald, sans-serif",
                    fontSize: 16,
                    letterSpacing: "0.04em",
                    cursor: condiment ? "pointer" : "not-allowed",
                  }}
                >
                  DALJE →
                </button>
              </motion.div>
            )}

            {/* ══ STEP 2 — Base of Operations ════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-6"
              >
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgb(var(--primary))" }}>
                    Tvoj teritorij
                  </p>
                  <h2 className="text-3xl font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                    BAZA OPERACIJA
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Odakle potiče tvoj ćevap avanturizam?
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className="py-3 px-2 rounded-xl text-sm font-medium border transition-all"
                      style={{
                        background: city === c ? "rgb(var(--primary) / 0.12)" : "rgb(var(--background))",
                        border: `1px solid ${city === c ? "rgb(var(--primary) / 0.5)" : "rgb(var(--border))"}`,
                        color: city === c ? "rgb(var(--primary))" : "rgb(var(--foreground))",
                        transform: city === c ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={advance}
                    disabled={saving}
                    className="flex-1 font-bold rounded-2xl transition-all"
                    style={{
                      height: 52,
                      background: "rgb(var(--border))",
                      color: "rgb(var(--muted))",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: 14,
                    }}
                  >
                    Preskoči
                  </button>
                  <button
                    onClick={() => { if (city) advance(); }}
                    disabled={!city || saving}
                    className="flex-[2] font-bold rounded-2xl transition-all"
                    style={{
                      height: 52,
                      background: city ? "rgb(var(--primary))" : "rgb(var(--border))",
                      color: city ? "#fff" : "rgb(var(--muted))",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: 16,
                      letterSpacing: "0.04em",
                      cursor: city ? "pointer" : "not-allowed",
                    }}
                  >
                    DALJE →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 3 — Finalization ══════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-7 pt-14 flex flex-col items-center gap-6 text-center"
              >
                {!done ? (
                  <>
                    <div className="text-6xl">🔥</div>
                    <div>
                      <p className="text-xs uppercase tracking-widest font-semibold mb-1"
                        style={{ color: "rgb(var(--primary))" }}>
                        Skoro gotovo
                      </p>
                      <h2 className="text-3xl font-bold" style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                        PROFIL SPREMAN
                      </h2>
                    </div>

                    {/* Summary */}
                    <div className="w-full rounded-2xl p-4 space-y-3 text-left"
                      style={{ background: "rgb(var(--background))", border: "1px solid rgb(var(--border))" }}>
                      {[
                        { label: "Avatar",    value: `${avatar} ${name}` },
                        { label: "Tabor",     value: condiment === "kajmak" ? "🧈 Kajmak Crew" : "🫑 Ajvar Army" },
                        { label: "Baza",      value: city || "—" },
                        { label: "XP bonus",  value: "+50 XP 🎁" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>{label}</span>
                          <span className="text-sm font-bold" style={{ color: "rgb(var(--foreground))" }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={finalize}
                      disabled={saving}
                      className="w-full font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                      style={{
                        height: 56,
                        background: saving ? "rgb(var(--border))" : "rgb(var(--primary))",
                        color: saving ? "rgb(var(--muted))" : "#fff",
                        fontFamily: "Oswald, sans-serif",
                        fontSize: 18,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          KALKULIRAM GRILL STATUS...
                        </>
                      ) : "AKTIVIRAJ PROFIL 🔥"}
                    </button>
                  </>
                ) : (
                  /* Done state */
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col items-center gap-5 py-4"
                  >
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

                    <button
                      onClick={onComplete}
                      className="w-full font-bold rounded-2xl transition-all"
                      style={{
                        height: 56,
                        background: "rgb(var(--primary))",
                        color: "#fff",
                        fontFamily: "Oswald, sans-serif",
                        fontSize: 20,
                        letterSpacing: "0.06em",
                      }}
                    >
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
