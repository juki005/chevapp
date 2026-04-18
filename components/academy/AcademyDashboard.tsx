"use client";

// ── AcademyDashboard ──────────────────────────────────────────────────────────
// Education-only view: Word of the Day + Gastro Dictionary.
// All XP/rank/gamification elements live in the Profile tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getWordOfDay, type WordOfDay } from "@/lib/gamification";
import { GastroDictionary } from "@/components/academy/GastroDictionary";
import { cn } from "@/lib/utils";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-[rgb(var(--border)/0.4)] animate-pulse", className)} />;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AcademyDashboard() {
  // t is kept for potential future i18n use in this component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const t        = useTranslations("academy");
  const supabase = createClient();

  const [word,    setWord]    = useState<WordOfDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getWordOfDay(supabase).then((w) => {
      if (!cancelled) { setWord(w); setLoading(false); }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Education view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Gastro riječ dana ─────────────────────────────────────────────── */}
      {word && (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[rgb(var(--primary))]" />
            <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              Gastro riječ dana
            </p>
          </div>
          <p
            className="text-2xl font-bold text-[rgb(var(--foreground))] mb-1"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
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

    </div>
  );
}
