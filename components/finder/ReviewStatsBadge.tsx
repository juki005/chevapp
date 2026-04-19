"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReviewStatsBadge
// Tiny inline "⭐ 4.5 · 12 recenzija" chip that decorates restaurant cards.
// Stateless — the parent is responsible for fetching stats (batch preferred).
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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
        className,
      )}
      title={`${count} ${label} · prosjek ${avg.toFixed(2)}/5`}
    >
      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
      <span className="tabular-nums">{avg.toFixed(1)}</span>
      {!compact && (
        <span className="text-[10px] opacity-80">
          · {count} {label}
        </span>
      )}
    </span>
  );
}
