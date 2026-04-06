"use client";

// ── VibrantBadge ───────────────────────────────────────────────────────────────
// High-saturation badge with low-opacity backgrounds.
// Preset variants: verified | new | top | hot | admin | style
// Custom color via `color` prop for arbitrary hex values.
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle, Sparkles, Star, Flame, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "verified" | "new" | "top" | "hot" | "admin" | "style";

interface VibrantBadgeProps {
  variant:   BadgeVariant;
  label?:    string;        // override default label
  className?: string;
}

const CONFIG: Record<BadgeVariant, {
  label:  string;
  icon:   React.ReactNode;
  color:  string;   // text + border
  bg:     string;   // background
}> = {
  verified: {
    label: "Verificirano",
    icon:  <CheckCircle className="w-3 h-3" />,
    color: "text-emerald-600 dark:text-emerald-400 border-emerald-400/40",
    bg:    "bg-emerald-50  dark:bg-emerald-400/10",
  },
  new: {
    label: "Novo",
    icon:  <Sparkles className="w-3 h-3" />,
    color: "text-violet-600 dark:text-violet-400 border-violet-400/40",
    bg:    "bg-violet-50   dark:bg-violet-400/10",
  },
  top: {
    label: "Top Rated",
    icon:  <Star className="w-3 h-3" />,
    color: "text-amber-600  dark:text-amber-400  border-amber-400/40",
    bg:    "bg-amber-50     dark:bg-amber-400/10",
  },
  hot: {
    label: "Trending",
    icon:  <Flame className="w-3 h-3" />,
    color: "text-rose-600   dark:text-rose-400   border-rose-400/40",
    bg:    "bg-rose-50      dark:bg-rose-400/10",
  },
  admin: {
    label: "Admin Pick",
    icon:  <ShieldCheck className="w-3 h-3" />,
    color: "text-brand-orange border-brand-orange/40",
    bg:    "bg-orange-50    dark:bg-orange-400/10",
  },
  style: {
    label: "Style",
    icon:  null,
    color: "text-sky-600    dark:text-sky-400    border-sky-400/40",
    bg:    "bg-sky-50       dark:bg-sky-400/10",
  },
};

export function VibrantBadge({ variant, label, className }: VibrantBadgeProps) {
  const cfg = CONFIG[variant];
  const text = label ?? cfg.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border",
        "text-[11px] font-semibold leading-none whitespace-nowrap",
        cfg.color,
        cfg.bg,
        className
      )}
    >
      {cfg.icon}
      {text}
    </span>
  );
}
