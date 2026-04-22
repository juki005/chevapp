"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReviewStatsBadge
// Tiny inline "⭐ 4.5 · 12 recenzija" chip that decorates restaurant cards.
// Stateless — the parent is responsible for fetching stats (batch preferred).
//
// Uses amber-xp (#D97706) — review aggregates are gamification-adjacent
// (community-earned reputation) so they borrow the XP accent. This is NOT
// a button; the "never amber on buttons" rule (DESIGN_SYSTEM.md §8) doesn't
// apply to status badges.
// ─────────────────────────────────────────────────────────────────────────────

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  avg:        number | null | undefined;
  count:      number;
  className?: string;
  /** Compact (just star + number) or full ("12 recenzija"). */
  compact?:   boolean;
}

export function ReviewStatsBadge({ avg, count, className, compact }: Props) {
  if (!count || avg == null) return null;

  const label = count === 1 ? "recenzija" : count < 5 ? "recenzije" : "recenzija";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-semibold",
        "bg-amber-xp/10 text-amber-xp border border-amber-xp/25",
        className,
      )}
      title={`${count} ${label} · prosjek ${avg.toFixed(2)}/5`}
    >
      <Star className="w-3 h-3 fill-amber-xp text-amber-xp" aria-hidden="true" />
      <span className="tabular-nums">{avg.toFixed(1)}</span>
      {!compact && (
        <span className="text-[10px] opacity-80">
          · {count} {label}
        </span>
      )}
    </span>
  );
}
