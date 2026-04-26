"use client";

// ── CevapNinja · academy (Sprint 26aa · DS-migrated) ─────────────────────────
// Slice-the-floating-emoji game (60s, 3 misses = end). 1 XP per slice, capped
// at MAX_XP. Spawn rate accelerates over time.
//
// Sprint 26aa changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on score → font-display class.
//   - Timer warning text-red-400 → text-zar-red (DS alert family).
//   - Arena placeholder text-[rgb(var(--border))] → text-border (semantic).
//   - rounded-2xl arena → rounded-card.
//   - ❤️ lives, 🔪 placeholder, ✨ slash effect, EMOJIS array tagged
//     TODO(icons) + aria-hidden — content/categorical markers, Sprint 27.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameContainer } from "./GameContainer";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────
// EMOJIS array: categorical content markers for slice targets — kept as data
const EMOJIS      = ["🌯", "🧅", "🍞", "🧀", "🥩", "🧆", "🫙", "🧄", "🥓", "🫕"];
const GAME_HEIGHT = 340; // px — height of the arena div
const GAME_SECS   = 60;
const MAX_MISSES  = 3;
const MAX_XP      = 50; // 1 XP per slice, capped

// ── Types ─────────────────────────────────────────────────────────────────────
interface Target {
  id:       string;
  emoji:    string;
  x:        number; // % from left (0–80, so emoji stays in container)
  duration: number; // ms to float from bottom to top
}

interface SlashFx {
  id: string;
  x:  number;
  y:  number; // approximate top-offset in px when sliced
}

// ── NinjaGame ─────────────────────────────────────────────────────────────────
interface NinjaGameProps {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
}

function NinjaGame({ onWin }: NinjaGameProps) {
  const [targets,  setTargets]  = useState<Target[]>([]);
  const [slashFx,  setSlashFx]  = useState<SlashFx[]>([]);
  const [score,    setScore]    = useState(0);
  const [misses,   setMisses]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECS);

  // Refs to avoid stale closures in async callbacks
  const activeRef  = useRef(true);
  const scoreRef   = useRef(0);
  const missesRef  = useRef(0);

  // ── Game over helper ──────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const bonus = Math.min(scoreRef.current, MAX_XP);
    setTimeout(() => onWin(bonus), 350);
  }, [onWin]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [endGame]);

  // ── Spawn targets ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Spawn rate starts at 1.2s, shortens every 15s (min 0.7s)
    let interval = 1200;
    let timerId: ReturnType<typeof setTimeout>;

    const spawn = () => {
      if (!activeRef.current) return;
      setTargets((prev) => [
        ...prev,
        {
          id:       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          emoji:    EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          x:        8 + Math.random() * 72,
          duration: 1800 + Math.random() * 900,
        },
      ]);
      // Speed up over time
      interval = Math.max(700, interval - 5);
      timerId = setTimeout(spawn, interval);
    };

    timerId = setTimeout(spawn, 300); // first spawn quickly
    return () => clearTimeout(timerId);
  }, []);

  // ── Slice a target ────────────────────────────────────────────────────────
  const handleSlice = useCallback((id: string, clientX: number, clientY: number) => {
    if (!activeRef.current) return;
    setTargets((prev) => prev.filter((t) => t.id !== id));

    // Splash effect
    const fxId = `fx-${id}`;
    setSlashFx((prev) => [...prev, { id: fxId, x: clientX, y: clientY }]);
    setTimeout(() => setSlashFx((prev) => prev.filter((f) => f.id !== fxId)), 500);

    scoreRef.current++;
    setScore(scoreRef.current);
  }, []);

  // ── Miss a target (animation complete without click) ──────────────────────
  const handleMiss = useCallback((id: string) => {
    setTargets((prev) => {
      if (!prev.find((t) => t.id === id)) return prev; // already sliced
      if (!activeRef.current) return prev.filter((t) => t.id !== id);

      missesRef.current++;
      setMisses(missesRef.current);

      if (missesRef.current >= MAX_MISSES) endGame();

      return prev.filter((t) => t.id !== id);
    });
  }, [endGame]);

  const timeColor = timeLeft <= 10 ? "text-zar-red" : "text-muted";

  return (
    <div className="space-y-3 select-none">
      {/* HUD */}
      <div className="flex items-center justify-between px-1">
        {/* Lives */}
        <div className="flex gap-0.5" aria-label={`Životi: ${MAX_MISSES - misses} od ${MAX_MISSES}`}>
          {Array.from({ length: MAX_MISSES }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn("text-lg transition-opacity", i < MAX_MISSES - misses ? "opacity-100" : "opacity-20")}
            >
              {/* TODO(icons): swap ❤️ for brand <Heart> */}
              ❤️
            </span>
          ))}
        </div>

        {/* Score */}
        <span
          className="font-display text-3xl font-bold text-foreground"
          aria-label={`Rezultat: ${score}`}
        >
          {score}
        </span>

        {/* Timer */}
        <span className={cn("text-sm font-bold tabular-nums w-10 text-right", timeColor)}>
          {timeLeft}s
        </span>
      </div>

      {/* Arena */}
      <div
        className="relative w-full overflow-hidden rounded-card border border-border bg-surface/30"
        style={{ height: GAME_HEIGHT }}
      >
        {/* Placeholder text */}
        <p className="absolute inset-0 flex items-center justify-center text-border text-sm pointer-events-none">
          {/* TODO(icons): swap 🔪 for brand <Slice> */}
          Klikni emojije! <span aria-hidden="true">🔪</span>
        </p>

        {/* Floating targets */}
        {targets.map((t) => (
          <motion.button
            key={t.id}
            className="absolute flex items-center justify-center w-14 h-14 text-3xl z-10 cursor-pointer rounded-full"
            style={{ left: `${t.x}%`, marginLeft: -28 }}
            initial={{ y: GAME_HEIGHT + 60 }}
            animate={{ y: -80 }}
            transition={{ duration: t.duration / 1000, ease: "linear" }}
            onAnimationComplete={() => handleMiss(t.id)}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement)
                .closest(".relative")!.getBoundingClientRect();
              handleSlice(t.id, e.clientX - rect.left, e.clientY - rect.top);
            }}
            whileTap={{ scale: 1.5 }}
            aria-label="Zasjeci"
          >
            <span aria-hidden="true">{t.emoji}</span>
          </motion.button>
        ))}

        {/* Slash feedback — ✨ burst at click position */}
        <AnimatePresence>
          {slashFx.map((fx) => (
            <motion.div
              key={fx.id}
              className="absolute pointer-events-none text-xl z-20"
              style={{ left: fx.x - 14, top: fx.y - 14 }}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              aria-hidden="true"
            >
              {/* TODO(icons): swap ✨ for brand <Sparkle> */}
              ✨
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* XP hint */}
      <p className="text-center text-xs text-muted">
        1 XP po zasjecu · max +{MAX_XP} XP · propusti {MAX_MISSES} = kraj
      </p>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function CevapNinja({ onClose }: { onClose?: () => void }) {
  return (
    <GameContainer
      title="Ćevap Ninja"
      emoji="🔪"
      description="Zasjeci što više ćevap emojija u 60 sekundi! Propusti 3 i igra završava."
      xpReward={0}
      gameKey="cevap-ninja"
      onClose={onClose}
    >
      {({ onWin, onLose, status }) =>
        status === "playing" && <NinjaGame onWin={onWin} onLose={onLose} />
      }
    </GameContainer>
  );
}
