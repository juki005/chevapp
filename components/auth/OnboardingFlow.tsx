"use client";

// ── OnboardingFlow · auth (Sprint 26z · DS-migrated) ─────────────────────────
// 4-step new-user onboarding modal: identity → kajmak/ajvar → city/weight →
// finalize (with confetti + XP bonus). Bottom-sheet on mobile, centered card
// on desktop.
//
// Sprint 26z changes:
//   - Heaviest style-prop migration so far: ~40 inline style={{ ... }} objects
//     converted to Tailwind className tokens. Same pattern as CommunityNews
//     (Sprint 26x) but bigger.
//   - `primaryBtn()` helper rewritten: was returning React.CSSProperties with
//     hardcoded rgb(var(--token)) strings — now a `primaryBtnCls()` className
//     builder using semantic aliases (bg-primary + text-primary-fg +
//     hover:bg-vatra-hover when active, bg-border + text-muted when disabled).
//   - 6× style={{fontFamily:"Oswald"}} on h2 titles + buttons → font-display.
//   - Hex literals:
//     · "#fff" on primary buttons → text-primary-fg (semantic).
//     · "#e74c3c" used for Ajvar accent KEPT (categorical content marker —
//       kajmak/ajvar is a binary visual choice paired with vatra orange,
//       same precedent as per-style colours and tier palette). Documented
//       inline.
//     · "#e74c3c" used for weight-input error → text-zar-red (DS alert,
//       consistent with all other error reds).
//   - Confetti colour array (#D35400, #F39C12, #E74C3C, #2ecc71, #3498db)
//     KEPT — passed to canvas-confetti API as raw hex strings (not Tailwind
//     classes). Could swap to brand-only palette in a future visual-polish
//     pass; leaving as-is so confetti stays festive.
//   - Backdrop rgba(0,0,0,0.72) + backdropFilter: "blur(12px)" → bg-black/70
//     + backdrop-blur-md (Tailwind handles -webkit prefix automatically).
//   - Heavy-touch button heights kept as arbitrary (h-[52px], h-[56px]) —
//     deliberate big-tap-target sizes that don't fit DS scale.
//   - Emoji throughout (🧑‍🍳 🍽️ ✈️ 🏠 🧈 🫑 🔥 🌱 🏆 🍖 🎁) tagged
//     TODO(icons) + aria-hidden where appropriate. AVATARS array stays
//     emoji as user-pickable identity content (same approach as
//     EditProfileModal AVATARS array, Sprint 26y).
//   - rounded-2xl → rounded-card; rounded-3xl bottom-sheet kept (24px —
//     intentional drawer treatment, same as RecipeModal Sprint 26t).
//   - shadow-2xl → shadow-soft-xl.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Ajvar brand-red — categorical exception, kept inline. Paired with vatra
// orange as the kajmak/ajvar binary choice (visual differentiation needs
// distinct hue, not from DS semantic palette).
const AJVAR_RED = "#e74c3c";
// 8-char hex (#RRGGBBAA): "1F" alpha = 31/255 ≈ 12% — same tint weight as
// the kajmak `bg-primary/10` so both active states read as equally-soft fills.
const AJVAR_TINT = `${AJVAR_RED}1F`;

// ── Slide animation ───────────────────────────────────────────────────────────

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? "100%"  : "-100%", opacity: 0 }),
  center:               () => ({ x: 0,                          opacity: 1 }),
  exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%",  opacity: 0 }),
};

const slideTransition = { type: "spring", stiffness: 300, damping: 30 };

// ── Shared button className helper ────────────────────────────────────────────

function primaryBtnCls(active: boolean): string {
  return cn(
    "font-display w-full h-[52px] rounded-card text-base font-bold tracking-wider border-0 transition-all",
    active
      ? "bg-primary text-primary-fg hover:bg-vatra-hover cursor-pointer"
      : "bg-border text-muted cursor-not-allowed",
  );
}

// ── Step 1 condiment-button styles ───────────────────────────────────────────
// Three discrete states (kajmak-active, ajvar-active, inactive) with no
// overlapping conditional branches. Returns both className AND optional inline
// style — Ajvar needs inline style because AJVAR_RED is a categorical brand
// hex outside the DS palette (can't be expressed as a Tailwind token).
function condimentBtnStyles(
  active: boolean,
  useAjvarRed: boolean,
): { className: string; style?: React.CSSProperties } {
  const base = "flex flex-col items-center gap-3 rounded-3xl p-6 transition-all border-2";
  if (!active) {
    return { className: cn(base, "bg-background border-border") };
  }
  if (useAjvarRed) {
    return {
      className: cn(base, "scale-[1.03]"),
      style: { background: AJVAR_TINT, borderColor: AJVAR_RED },
    };
  }
  return { className: cn(base, "bg-primary/10 border-primary scale-[1.03]") };
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

    // 3. Confetti — raw hex strings passed to canvas-confetti API.
    //    Could swap to brand-only palette in a visual-polish pass.
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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-soft-xl bg-surface border border-border max-h-[92dvh]">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 z-10 bg-border">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Back button */}
        {step > 0 && step < 3 && !done && (
          <button
            onClick={back}
            aria-label="Nazad"
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-chip flex items-center justify-center bg-border text-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Step counter */}
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>

        <div className="overflow-y-auto max-h-[92dvh]">
          <AnimatePresence mode="wait" custom={dir}>

            {/* ══ STEP 0 — Identity ══════════════════════════════════════ */}
            {step === 0 && (
              <motion.div key="s0" custom={dir} variants={slideVariants}
                initial="enter" animate="center" exit="exit" transition={slideTransition}
                className="p-7 pt-14 flex flex-col gap-5">

                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-primary">
                    Dobrodošao/la u ChevApp
                  </p>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    KO SI TI?
                  </h2>
                  <p className="text-sm mt-1 text-muted">
                    Daj nam ime i odaberi avatara
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted">
                    Tvoje ime ili nadimak *
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="npr. Grill Maestro Juki"
                    maxLength={30}
                    className={cn(
                      "w-full h-[52px] px-4 rounded-chip text-sm outline-none transition-all bg-background text-foreground border",
                      name.length >= 2 ? "border-primary/50" : "border-border",
                    )}
                    onKeyDown={(e) => e.key === "Enter" && nameRef.current?.blur()}
                  />
                </div>

                {/* Avatar grid */}
                <div>
                  <label className="text-xs font-medium mb-2 block text-muted">
                    Tvoj avatar *
                  </label>
                  {/* TODO(icons): AVATARS user-pickable identity content. */}
                  <div className="grid grid-cols-4 gap-2">
                    {AVATARS.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        onClick={() => setAvatar(emoji)}
                        aria-label={label}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-3 rounded-card border transition-all",
                          avatar === emoji
                            ? "bg-primary/10 border-primary/50 scale-[1.06]"
                            : "bg-background border-border",
                        )}
                      >
                        <span className="text-3xl leading-none" aria-hidden="true">{emoji}</span>
                        <span className={cn(
                          "text-[10px] font-medium text-center px-1",
                          avatar === emoji ? "text-primary" : "text-muted",
                        )}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={advance} disabled={!step0Valid} className={primaryBtnCls(step0Valid)}>
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
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-primary">
                    Vječna dilema
                  </p>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    KAJMAK ILI AJVAR?
                  </h2>
                  <p className="text-sm mt-1 text-muted">
                    Ovo je jedino ispravno pitanje. Odaberi svoju stranu.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "kajmak" as const, emoji: "🧈", label: "KAJMAK", sub: "Kremasto, toplo, savršeno",     useAjvarRed: false },
                    { key: "ajvar"  as const, emoji: "🫑", label: "AJVAR",  sub: "Dimljeno, začinjeno, balkansko", useAjvarRed: true  },
                  ].map(({ key, emoji, label, sub, useAjvarRed }) => {
                    const active = condiment === key;
                    const btn = condimentBtnStyles(active, useAjvarRed);
                    return (
                      <button
                        key={key}
                        onClick={() => setCondiment(key)}
                        className={btn.className}
                        style={btn.style}
                      >
                        {/* TODO(icons): swap 🧈 / 🫑 for brand <Kajmak> / <Ajvar> */}
                        <span className="text-5xl" aria-hidden="true">{emoji}</span>
                        <div className="text-center">
                          <p className="font-display font-bold text-base text-foreground">
                            {label}
                          </p>
                          <p className="text-xs mt-0.5 text-muted">{sub}</p>
                        </div>
                        {active && (
                          // Active badge sits on a coloured fill (AJVAR_RED hex
                          // OR bg-primary). Neither maps to a single DS *-fg
                          // token, so the Ajvar branch uses literal text-white
                          // for guaranteed contrast on the categorical-red bg;
                          // the kajmak branch uses the semantic text-primary-fg
                          // pair on bg-primary.
                          <span
                            className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              useAjvarRed ? "text-white" : "bg-primary text-primary-fg",
                            )}
                            style={useAjvarRed ? { background: AJVAR_RED } : undefined}
                          >
                            ✓ MOJ IZBOR
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button onClick={advance} disabled={!condiment} className={primaryBtnCls(!!condiment)}>
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
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-primary">
                    Tvoj teritorij
                  </p>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    BAZA OPERACIJA
                  </h2>
                  <p className="text-sm mt-1 text-muted">
                    Odaberi grad i (opcionalno) unesi svoju težinu
                  </p>
                </div>

                {/* City grid */}
                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={cn(
                        "py-3 px-2 rounded-chip text-sm font-medium border transition-all",
                        city === c
                          ? "bg-primary/10 border-primary/50 text-primary scale-105"
                          : "bg-background border-border text-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Weight input */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted">
                    Tvoja težina <span className="opacity-60">(opcionalno)</span>
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
                        className={cn(
                          "w-full h-[52px] px-4 pr-12 rounded-chip text-sm outline-none transition-all bg-background text-foreground border [appearance:textfield] [-moz-appearance:textfield]",
                          !weightValid
                            ? "border-zar-red"
                            : weightRaw
                              ? "border-primary/50"
                              : "border-border",
                        )}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                        kg
                      </span>
                    </div>
                  </div>
                  {!weightValid && (
                    <p className="text-xs mt-1 text-zar-red">
                      Unesi ispravnu težinu (npr. 65 ili 82.5)
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={advance}
                    className="font-display flex-1 h-[52px] rounded-card text-sm font-bold bg-border text-muted transition-all"
                  >
                    Preskoči
                  </button>
                  <button
                    onClick={() => { if (city && weightValid) advance(); }}
                    disabled={!city || !weightValid}
                    className={cn("flex-[2]", primaryBtnCls(!!city && weightValid))}
                  >
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
                    {/* TODO(icons): swap 🔥 for brand <Vatra> */}
                    <div className="text-6xl" aria-hidden="true">🔥</div>
                    <div>
                      <p className="text-xs uppercase tracking-widest font-semibold mb-1 text-primary">
                        Skoro gotovo
                      </p>
                      <h2 className="font-display text-3xl font-bold text-foreground">
                        PROFIL SPREMAN
                      </h2>
                    </div>

                    {/* Summary card */}
                    <div className="w-full rounded-card p-4 space-y-3 text-left bg-background border border-border">
                      {[
                        { label: "Avatar",   value: `${avatar} ${name}` },
                        { label: "Izbor",    value: condiment === "kajmak" ? "🧈 Kajmak" : condiment === "ajvar" ? "🫑 Ajvar" : "—" },
                        { label: "Baza",     value: city || "—" },
                        { label: "Težina",   value: weightRaw ? `${weightRaw} kg` : "—" },
                        { label: "XP bonus", value: "+50 XP 🎁" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted">{label}</span>
                          <span className="text-sm font-bold text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={finalize}
                      disabled={saving}
                      className={cn(
                        "font-display w-full h-[56px] rounded-card flex items-center justify-center gap-2 text-lg font-bold tracking-wider border-0 transition-all",
                        saving
                          ? "bg-border text-muted cursor-not-allowed"
                          : "bg-primary text-primary-fg hover:bg-vatra-hover cursor-pointer",
                      )}
                    >
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          KALKULIRAM GRILL STATUS...
                        </>
                      ) : <>AKTIVIRAJ PROFIL <span aria-hidden="true">🔥</span></>}
                    </button>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex flex-col items-center gap-5 py-4 w-full">
                    {/* TODO(icons): swap 🏆 for brand <Trophy> / <Tier> */}
                    <div className="text-7xl" aria-hidden="true">🏆</div>
                    <div>
                      <h2 className="font-display text-4xl font-bold mb-1 text-foreground">
                        DOBRODOŠAO/LA!
                      </h2>
                      <p className="text-sm text-muted">
                        {name}, tvoj grill status je aktiviran. +50 XP na računu!
                      </p>
                    </div>
                    <div className="w-full rounded-card p-4 bg-primary/10 border border-primary/30">
                      <p className="text-sm font-semibold text-primary">
                        {/* TODO(icons): 🌱 → brand <Tier-Pocetnik> */}
                        <span aria-hidden="true">🌱</span> Rang: Početnik → skupljaj XP igrom i recenzijama da napreduješ!
                      </p>
                    </div>
                    <button
                      onClick={onComplete}
                      className="font-display w-full h-[56px] rounded-card text-xl font-bold tracking-wider border-0 bg-primary text-primary-fg hover:bg-vatra-hover transition-colors cursor-pointer"
                    >
                      {/* TODO(icons): 🍖 → brand <Cevapi> */}
                      HAJDE DA JEDEMO! <span aria-hidden="true">🍖</span>
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
