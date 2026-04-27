"use client";

// ── GameContainer · academy (Sprint 26ad · DS-migrated) ──────────────────────
// Shared parent for all 4 academy games (CevapNinja, GuessTheCity, CevapMemory,
// CevapSnake). Renders idle/success/failed states around the game children.
// Owns XP-award flow + once-per-day localStorage gate + activity recording.
//
// Sprint 26ad changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases (~25 sites).
//   - 5× style={{fontFamily:"Oswald"}} → font-display class (idle title,
//     success title, failed title, +XP chip, IGRAJ CTA).
//   - IGRAJ + Pokušaj ponovo CTAs: hover:bg-primary/0.85 → hover:bg-vatra-hover;
//     text-white → text-primary-fg (DS rule — explicit hover token, semantic
//     fill).
//   - "Igraj ponovo" secondary CTA in success state: hover:bg-primary/0.08 →
//     hover:bg-primary/10 (rounded to standard Tailwind opacity scale).
//   - Level-up celebration chip: border-amber-400/40 + bg-amber-400/10 +
//     text-amber-400 → border-amber-xp/40 + bg-amber-xp/10 + text-amber-xp.
//     This IS gamification (rank tier achievement) and the chip is a passive
//     readout, not a button — amber-xp is the correct DS token here.
//   - Emoji throughout (🏆 success trophy, 😤 failed face, 🎉 level-up,
//     🎮 IGRAJ button) tagged TODO(icons) + aria-hidden where appropriate.
//   - rounded-2xl → rounded-card; rounded-xl → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, type ReactNode } from "react";
import { RotateCcw, Zap, Home, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/gamification";
import { revalidateXP } from "@/lib/actions/xp";
import { recordUserActivity } from "@/lib/actions/activity";
import { cn } from "@/lib/utils";

export type GameStatus = "idle" | "playing" | "success" | "failed";

interface GameContainerProps {
  title:       string;
  emoji:       string;
  description: string;
  xpReward:    number;
  /** Stable string ID — enables once-per-day XP gate via localStorage */
  gameKey?:    string;
  /** Render prop — called when the game is in playing state */
  children: (controls: GameControls) => ReactNode;
  onClose?: () => void;
}

export interface GameControls {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
  status: GameStatus;
}

// ── Daily XP gate (localStorage) ─────────────────────────────────────────────
function lsKey(gameKey: string) {
  return `chevapp:game_xp:${gameKey}:${new Date().toISOString().slice(0, 10)}`;
}
function hasEarnedXPToday(gameKey: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(lsKey(gameKey)) === "1";
}
function markXPEarnedToday(gameKey: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(lsKey(gameKey), "1");
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GameContainer({
  title, emoji, description, xpReward, gameKey, children, onClose,
}: GameContainerProps) {
  const supabase = createClient();

  const [status,           setStatus]           = useState<GameStatus>("idle");
  const [earnedXP,         setEarnedXP]         = useState(0);
  const [leveledUp,        setLeveledUp]        = useState(false);
  const [newRankTitle,     setNewRankTitle]      = useState("");
  const [awarding,         setAwarding]         = useState(false);
  const [xpAlreadyClaimed, setXpAlreadyClaimed] = useState(false);

  // ── Win handler ─────────────────────────────────────────────────────────────
  const handleWin = useCallback(async (bonusXP = 0) => {
    const total = xpReward + bonusXP;
    setEarnedXP(total);
    setStatus("success");

    const alreadyClaimed = gameKey ? hasEarnedXPToday(gameKey) : false;
    setXpAlreadyClaimed(alreadyClaimed);

    if (!alreadyClaimed) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAwarding(true);
        const result = await awardXP(user.id, total, supabase);
        if (result?.leveledUp) {
          setLeveledUp(true);
          setNewRankTitle(`${result.newRank.emoji} ${result.newRank.title}`);
        }
        if (gameKey) markXPEarnedToday(gameKey);
        setAwarding(false);
        window.dispatchEvent(new CustomEvent("chevapp:stats_updated", {
          detail: { xpAdded: total, newStats: result?.stats },
        }));
        revalidateXP().catch(() => {}); // server-side cache invalidation (fire & forget)
        // Record daily activity + streak (fire & forget; dispatches bonus event if first today)
        recordUserActivity("GAME").then((activity) => {
          if (activity.isFirstActivityToday) {
            window.dispatchEvent(new CustomEvent("chevapp:stats_updated", {
              detail: { activityBonus: activity.bonusXP, newStreak: activity.newStreak },
            }));
          }
        }).catch(() => {});
      }
    }
  }, [xpReward, gameKey, supabase]);

  const handleLose = useCallback(() => setStatus("failed"), []);

  // ── Play Again: go directly to playing — React remounts children because
  //    the "playing" return is a different JSX tree than "success"/"failed"
  const handlePlayAgain = () => {
    setStatus("playing");
    setEarnedXP(0);
    setLeveledUp(false);
    setNewRankTitle("");
    setXpAlreadyClaimed(false);
  };

  // ── IDLE ─────────────────────────────────────────────────────────────────────
  if (status === "idle") {
    const alreadyPlayedToday = gameKey ? hasEarnedXPToday(gameKey) : false;
    return (
      <div className="rounded-card border border-border bg-surface/50 p-8 text-center">
        {/* TODO(icons): game emoji is data prop — Sprint 27 may swap to brand icons */}
        <div className="text-6xl mb-4" aria-hidden="true">{emoji}</div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted text-sm max-w-sm mx-auto mb-6">{description}</p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" />
          {xpReward > 0 ? `+${xpReward} XP za pobjedu` : "XP po performansi"}
        </div>

        {alreadyPlayedToday && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted mb-4">
            <Lock className="w-3 h-3" />
            XP već zarađen danas — igraj radi zabave
          </div>
        )}

        <div className="flex gap-3 justify-center mt-4">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-chip border border-border text-muted text-sm hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              Nazad
            </button>
          )}
          <button
            onClick={() => setStatus("playing")}
            className="font-display flex items-center gap-2 px-6 py-2.5 rounded-chip bg-primary text-primary-fg font-bold text-base hover:bg-vatra-hover transition-all active:scale-[0.98]"
          >
            {/* TODO(icons): swap 🎮 for brand <Game> / <Joystick> */}
            IGRAJ <span aria-hidden="true">🎮</span>
          </button>
        </div>
      </div>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="rounded-card border border-primary/40 bg-primary/5 p-8 text-center">
        {/* TODO(icons): swap 🏆 for brand <Trophy> */}
        <div className="text-6xl mb-3" aria-hidden="true">🏆</div>
        <h2 className="font-display text-2xl font-bold text-primary mb-1">
          POBJEDA!
        </h2>
        <p className="text-muted text-sm mb-5">
          Bravo — završio/la si {title}!
        </p>

        {xpAlreadyClaimed ? (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card border border-border text-muted text-sm mb-4">
            <Lock className="w-4 h-4" />
            XP već zarađen danas
          </div>
        ) : earnedXP > 0 ? (
          <div className="font-display inline-flex items-center gap-2 px-5 py-3 rounded-card bg-primary text-primary-fg text-2xl font-bold mb-4">
            <Zap className="w-5 h-5" />
            +{earnedXP} XP
            {awarding && <span className="text-sm font-normal opacity-70 ml-2">Sprema se…</span>}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card border border-border text-muted text-sm mb-4">
            Nema XP — pokušaj više!
          </div>
        )}

        {leveledUp && (
          // Level-up = rank tier achievement = amber-xp DS token (passive
          // readout chip, not a button — amber-xp is the correct token).
          <div className="mt-2 mb-4 px-4 py-2 rounded-chip border border-amber-xp/40 bg-amber-xp/10 text-amber-xp font-bold text-sm">
            {/* TODO(icons): swap 🎉 for brand <Sparkle> */}
            <span aria-hidden="true">🎉</span> Rang unaprijeđen! → {newRankTitle}
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6">
          {onClose && (
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-chip border border-border text-muted text-sm hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              Igre
            </button>
          )}
          <button onClick={handlePlayAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-chip border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors">
            <RotateCcw className="w-4 h-4" />
            Igraj ponovo
          </button>
        </div>
      </div>
    );
  }

  // ── FAILED ────────────────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="rounded-card border border-border bg-surface/50 p-8 text-center">
        {/* TODO(icons): swap 😤 for brand <Frown> / failed-state SVG */}
        <div className="text-6xl mb-3" aria-hidden="true">😤</div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          Sljedeći put!
        </h2>
        <p className="text-muted text-sm mb-6">
          Nisi uspio/la ovaj put. Pokušaj ponovo!
        </p>
        <div className="flex gap-3 justify-center">
          {onClose && (
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-chip border border-border text-muted text-sm hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              Igre
            </button>
          )}
          <button onClick={handlePlayAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-chip bg-primary text-primary-fg text-sm font-bold hover:bg-vatra-hover transition-colors">
            <RotateCcw className="w-4 h-4" />
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────────
  // Different JSX root than success/failed → React fully remounts children on
  // every "Play Again" press (state reset is automatic, no restartKey needed).
  return (
    <div>
      {children({ onWin: handleWin, onLose: handleLose, status })}
    </div>
  );
}
