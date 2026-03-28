"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Share2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Word {
  id:           string;
  word:         string;
  definition:   string;
  tags:         string[];
  display_date: string | null;
  created_at:   string;
}

const slideVariants = {
  enter: (dir: number) => ({
    x:       dir > 0 ? 80 : -80,
    opacity: 0,
    scale:   0.97,
  }),
  center: {
    x:       0,
    opacity: 1,
    scale:   1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    x:       dir > 0 ? -80 : 80,
    opacity: 0,
    scale:   0.97,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Determine which index in a sorted-desc array corresponds to "today's" word */
function findTodayIndex(words: Word[]): number {
  const today = new Date().toISOString().split("T")[0];

  // 1. Pinned word for today
  const pinnedIdx = words.findIndex((w) => w.display_date === today);
  if (pinnedIdx !== -1) return pinnedIdx;

  // 2. Replicate the deterministic pool selection from gamification.ts
  const pool = words.filter((w) => w.display_date === null);
  if (pool.length > 0) {
    const dayOfYear = Math.floor(
      (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 86400000
    );
    const todayWord = pool[dayOfYear % pool.length];
    const idx = words.findIndex((w) => w.id === todayWord.id);
    if (idx !== -1) return idx;
  }

  return 0;
}

export function MerakCorner() {
  const [words,      setWords]      = useState<Word[]>([]);
  const [index,      setIndex]      = useState(0);
  const [direction,  setDirection]  = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [copied,     setCopied]     = useState(false);
  const [todayIdx,   setTodayIdx]   = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("word_of_the_day")
      .select("id, word, definition, tags, display_date, created_at")
      .order("display_date", { ascending: false, nullsFirst: false })
      .order("created_at",   { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const w = data as Word[];
          const ti = findTodayIndex(w);
          setWords(w);
          setIndex(ti);
          setTodayIdx(ti);
        }
        setLoading(false);
      });
  }, []);

  const go = useCallback((delta: number) => {
    setDirection(delta);
    setIndex((prev) => Math.max(0, Math.min(words.length - 1, prev + delta)));
  }, [words.length]);

  const handleShare = async () => {
    const current = words[index];
    if (!current) return;
    const text = `💡 Riječ dana: ${current.word}\n\n${current.definition}\n\n— ChevApp Merak Rječnik`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text });
        return;
      } catch { /* cancelled */ }
    }
    // Clipboard fallback
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = words[index];
  const isAtNewest = index === 0;
  const isAtOldest = index === words.length - 1;
  const isToday    = index === todayIdx;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-charcoal-700/50 dark:border-ugljen-border bg-charcoal-800/60 dark:bg-ugljen-surface/60 p-8 animate-pulse">
          <div className="h-4 bg-charcoal-700 dark:bg-ugljen-border rounded w-24 mb-6" />
          <div className="h-8 bg-charcoal-700 dark:bg-ugljen-border rounded w-40 mb-4" />
          <div className="h-4 bg-charcoal-700 dark:bg-ugljen-border rounded w-full mb-2" />
          <div className="h-4 bg-charcoal-700 dark:bg-ugljen-border rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-burnt-orange-500/20 bg-charcoal-800/80 dark:bg-ugljen-surface/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-burnt-orange-900/20">

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-charcoal-700/60 dark:border-ugljen-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-burnt-orange-400" />
            <span className="text-xs text-cream/40 uppercase tracking-widest font-medium">
              Merak Rječnik
            </span>
            {isToday && (
              <span className="text-[10px] bg-burnt-orange-500/20 text-burnt-orange-400 px-1.5 py-0.5 rounded-full font-medium border border-burnt-orange-500/30">
                danas
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-cream/25">
              {index + 1} / {words.length}
            </span>
          </div>
        </div>

        {/* Word content — animated */}
        <div className="px-6 py-7 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-4"
            >
              {/* Word */}
              <h3
                className="text-3xl sm:text-4xl font-bold text-cream leading-tight"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {current.word}
              </h3>

              {/* Definition */}
              <p className="text-cream/65 text-sm sm:text-base leading-relaxed">
                {current.definition}
              </p>

              {/* Tags */}
              {current.tags && current.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {current.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-burnt-orange-500/10 text-burnt-orange-400/80 border border-burnt-orange-500/20 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-charcoal-700/60 dark:border-ugljen-border bg-charcoal-900/30 dark:bg-ugljen-bg/30">

          {/* Prev button */}
          <button
            onClick={() => go(1)}
            disabled={isAtOldest}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              isAtOldest
                ? "text-cream/15 cursor-not-allowed"
                : "text-cream/50 hover:text-cream hover:bg-charcoal-700/60 dark:hover:bg-ugljen-border active:scale-95"
            )}
            aria-label="Prethodna riječ"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Starije
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cream/40 hover:text-burnt-orange-400 hover:bg-burnt-orange-500/10 transition-all active:scale-95"
            aria-label="Podijeli"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Kopirano!</span></>
              : <><Share2 className="w-3.5 h-3.5" /> Podijeli</>
            }
          </button>

          {/* Next button */}
          <button
            onClick={() => go(-1)}
            disabled={isAtNewest}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              isAtNewest
                ? "text-cream/15 cursor-not-allowed"
                : "text-cream/50 hover:text-cream hover:bg-charcoal-700/60 dark:hover:bg-ugljen-border active:scale-95"
            )}
            aria-label="Sljedeća riječ"
          >
            Novije
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
