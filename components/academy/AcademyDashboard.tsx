"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Zap, Flame, BookOpen, Trophy, Star, Lock, CheckCircle, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getUserStats,
  getWordOfDay,
  claimDailyChallenge,
  isTodayClaimed,
  isActivityToday,
  getRank,
  getNextRank,
  rankProgress,
  type UserStats,
  type WordOfDay,
} from "@/lib/gamification";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { GastroDictionary } from "@/components/academy/GastroDictionary";
import { cn } from "@/lib/utils";

// ── Activity feed entries (static for now, could be real later) ──────────────
const ACTIVITIES = [
  { icon: "🧠", label: "Kviz završen", xp: 80, time: "2h" },
  { icon: "🔥", label: "Dnevni izazov", xp: 30, time: "Danas" },
  { icon: "📍", label: "Restoran dodan u dnevnik", xp: 20, time: "Jučer" },
];

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-[rgb(var(--border)/0.4)] animate-pulse", className)} />;
}

export function AcademyDashboard() {
  const t        = useTranslations("academy");
  const supabase = createClient();
  const toast    = useToast();

  const [userId,      setUserId]      = useState<string | null>(null);
  const [stats,       setStats]       = useState<UserStats | null>(null);
  const [word,        setWord]        = useState<WordOfDay | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [claiming,    setClaiming]    = useState(false);
  const [snakeHiScore, setSnakeHiScore] = useState(0);

  // ── Read Snake hi-score from localStorage ───────────────────────────────────
  useEffect(() => {
    const saved = parseInt(localStorage.getItem("chevapp:snake:hiscore") ?? "0", 10);
    setSnakeHiScore(saved);

    // Update whenever the Snake game writes a new hi-score
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chevapp:snake:hiscore") {
        setSnakeHiScore(parseInt(e.newValue ?? "0", 10));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        setUserId(user.id);
        const [s, w] = await Promise.all([
          getUserStats(user.id, supabase),
          getWordOfDay(supabase),
        ]);
        if (!cancelled) { setStats(s); setWord(w); }
      } else {
        // Not logged in — still show word of the day
        const w = await getWordOfDay(supabase);
        if (!cancelled) setWord(w);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Claim daily challenge ───────────────────────────────────────────────────
  const handleClaimChallenge = useCallback(async () => {
    if (!userId || claiming) return;
    setClaiming(true);

    const result = await claimDailyChallenge(userId, supabase, 30);

    if (result.alreadyClaimed) {
      toast.info("Već si preuzeo/la dnevni izazov!", "Vrati se sutra za novi +30 XP.");
    } else if (result.success) {
      toast.xp("+30 XP zarađeno! 🔥", "Dnevni izazov uspješno preuzet.");
      // Refresh stats
      const updated = await getUserStats(userId, supabase);
      setStats(updated);
    } else {
      toast.error("Greška", "Dnevni izazov nije mogao biti preuzet. Pokušaj ponovo.");
    }

    setClaiming(false);
  }, [userId, claiming, supabase, toast]);

  // ── Refresh stats when a game/quiz awards XP (UI-only, no DB call) ─────────
  useEffect(() => {
    if (!userId) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ xpAdded?: number; newStats?: typeof stats }>).detail;
      if (detail?.newStats) {
        setStats(detail.newStats);
      } else {
        // Fallback: re-fetch from DB
        getUserStats(userId, supabase).then((s) => { if (s) setStats(s); });
      }
    };

    window.addEventListener("chevapp:stats_updated", handler);
    return () => window.removeEventListener("chevapp:stats_updated", handler);
  }, [userId, supabase]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const xp           = stats?.xp_points ?? stats?.xp_total ?? 0;
  const streak       = stats?.current_streak ?? 0;
  const rank         = getRank(xp);
  const nextRank     = getNextRank(xp);
  const progress     = rankProgress(xp);
  const todayClaimed = isTodayClaimed(stats);
  const doneToday    = isActivityToday(stats);

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (!loading && !userId) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-8 text-center">
        <Lock className="w-10 h-10 text-[rgb(var(--muted))] mx-auto mb-3 opacity-40" />
        <h3 className="font-bold text-[rgb(var(--foreground))] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
          {t("signInRequired")}
        </h3>
        <p className="text-[rgb(var(--muted))] text-sm mb-4">
          {t("signInForXP")}
        </p>
        {word && (
          <div className="mt-6 text-left rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)] p-4">
            <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-2">
              📖 Gastro riječ dana
            </p>
            <p className="font-bold text-[rgb(var(--foreground))] text-base">{word.word}</p>
            <p className="text-sm text-[rgb(var(--muted))] mt-1 leading-relaxed">{word.definition}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-4">

        {/* ── Rank card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{rank.emoji}</span>
              <div>
                <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">Tvoj rang</p>
                <p className="text-2xl font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                  {rank.title}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[rgb(var(--primary))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {xp.toLocaleString()}
              </p>
              <p className="text-xs text-[rgb(var(--muted))]">XP ukupno</p>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))] mb-1.5">
              <span>{rank.title}</span>
              {nextRank
                ? <span>{nextRank.title} ({nextRank.minXP - xp} XP do unaprijeđenja)</span>
                : <span className="text-[rgb(var(--primary))]">Maksimalni rang!</span>
              }
            </div>
            <div className="h-3 rounded-full bg-[rgb(var(--border))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-[rgb(var(--muted))] mt-1">{progress}%</p>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Streak */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {streak}
              </p>
              <p className="text-xs text-[rgb(var(--muted))]">
                {streak === 1 ? "dan serije" : streak < 5 ? "dana serije" : "dana serije"}
              </p>
            </div>
          </div>

          {/* Daily challenge button */}
          <button
            onClick={handleClaimChallenge}
            disabled={todayClaimed || doneToday || claiming || !userId}
            className={cn(
              "rounded-2xl border p-4 flex items-center gap-3 transition-all text-left w-full",
              doneToday || todayClaimed
                ? "border-green-500/30 bg-green-500/5 cursor-default"
                : "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.06)] hover:bg-[rgb(var(--primary)/0.12)] active:scale-[0.98] cursor-pointer"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              doneToday || todayClaimed ? "bg-green-500/10" : "bg-[rgb(var(--primary)/0.15)]"
            )}>
              {doneToday || todayClaimed
                ? <CheckCircle className="w-5 h-5 text-green-400" />
                : <Zap className="w-5 h-5 text-[rgb(var(--primary))]" />
              }
            </div>
            <div>
              <p className="text-sm font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {doneToday || todayClaimed
                  ? "Izazov završen ✓"
                  : claiming ? "Preuzimam..." : "Dnevni izazov"}
              </p>
              <p className="text-xs text-[rgb(var(--muted))]">
                {doneToday || todayClaimed
                  ? "Vrati se sutra · +20 XP zarađeno"
                  : "Odradi 1 trening ili ostavi recenziju"}
              </p>
            </div>
          </button>
        </div>

        {/* ── Word of the day ───────────────────────────────────────────────── */}
        {word && (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-[rgb(var(--primary))]" />
              <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
                Gastro riječ dana
              </p>
            </div>
            <p className="text-xl font-bold text-[rgb(var(--foreground))] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
              {word.word}
            </p>
            <p className="text-sm text-[rgb(var(--muted))] leading-relaxed">{word.definition}</p>
            {(word.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(word.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Gastro rječnik ────────────────────────────────────────────────── */}
        <GastroDictionary />

        {/* ── Rank ladder ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[rgb(var(--primary))]" />
            <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              Ljestvica rangova
            </p>
          </div>
          <div className="space-y-2">
            {[
              { title: "Početnik",    minXP: 0,    emoji: "🌱" },
              { title: "Gurman",      minXP: 500,  emoji: "🍽️" },
              { title: "Poznavatelj", minXP: 1000, emoji: "🧑‍🍳" },
              { title: "Šef",         minXP: 2000, emoji: "👨‍🍳" },
              { title: "Maestro",     minXP: 4000, emoji: "🏆" },
            ].map((r) => {
              const isCurrentRank = rank.title === r.title;
              const isUnlocked    = xp >= r.minXP;
              return (
                <div
                  key={r.title}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                    isCurrentRank
                      ? "bg-[rgb(var(--primary)/0.1)] border border-[rgb(var(--primary)/0.3)]"
                      : "border border-transparent"
                  )}
                >
                  <span className={cn("text-lg", !isUnlocked && "opacity-30")}>{r.emoji}</span>
                  <div className="flex-1">
                    <span className={cn(
                      "text-sm font-semibold",
                      isCurrentRank ? "text-[rgb(var(--primary))]" :
                      isUnlocked    ? "text-[rgb(var(--foreground))]" :
                      "text-[rgb(var(--muted))]"
                    )}>
                      {r.title}
                    </span>
                  </div>
                  <span className="text-xs text-[rgb(var(--muted))]">{r.minXP.toLocaleString()} XP</span>
                  {isCurrentRank && (
                    <Star className="w-3.5 h-3.5 text-[rgb(var(--primary))] fill-current" />
                  )}
                  {!isUnlocked && (
                    <Lock className="w-3 h-3 text-[rgb(var(--muted))] opacity-40" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Snake high score ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 className="w-4 h-4 text-[rgb(var(--primary))]" />
            <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              Ćevap Snake — rekord
            </p>
          </div>

          {snakeHiScore > 0 ? (
            <div className="flex items-center gap-4">
              <div className="text-5xl leading-none select-none">🐍</div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-[rgb(var(--primary))] tabular-nums"
                  style={{ fontFamily: "Oswald, sans-serif" }}>
                  {snakeHiScore.toLocaleString()}
                  <span className="text-sm font-normal text-[rgb(var(--muted))] ml-2">bodova</span>
                </p>
                <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                  Tvoj osobni rekord · pohranjen lokalno
                </p>
                <p className="text-xs text-[rgb(var(--primary))] mt-1">
                  ⚡ {Math.min(15, Math.floor(snakeHiScore / 50))} XP zarađeno u toj sesiji
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[rgb(var(--muted))]">
              <span className="text-3xl opacity-30">🐍</span>
              <div>
                <p className="text-sm font-medium">Još nisi igrao/la Ćevap Snake</p>
                <p className="text-xs mt-0.5">Igraj u tabu Igre da postaviš rekord!</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Recent activity ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
          <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-3">
            Nedavna aktivnost
          </p>
          <div className="space-y-2">
            {ACTIVITIES.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-lg w-7 text-center flex-shrink-0">{a.icon}</span>
                <span className="text-sm text-[rgb(var(--foreground)/0.8)] flex-1">{a.label}</span>
                <span className="text-xs text-[rgb(var(--primary))] font-semibold">+{a.xp} XP</span>
                <span className="text-xs text-[rgb(var(--muted))] w-12 text-right">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
