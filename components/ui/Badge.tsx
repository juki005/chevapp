// ── Badge · ChevApp Design System ─────────────────────────────────────────────
// Semantic status chips. Six locked variants from DESIGN_SYSTEM.md §6 —
// each color carries exactly one meaning. Don't invent new ones.
//
//   featured   — vatra         · highlighted restaurant, editor pick
//   xp         — amber-xp + ⚡  · gamification reward ("+200 XP")
//   published  — ember-green + ✓ · review/place Objavljeno
//   closed     — žar-red       · Zatvoreno — restaurant closed / unavailable
//   new        — somun-purple  · Novo — new listing · passive status
//   pending    — vatra outline · Čeka pregled — awaiting moderation
//
// Hard rules (from §6 / §8):
//   • amber-xp is gamification-only — never on a CTA, never on a closed state
//   • somun-purple is passive-only — never on an interactive element
//   • featured + pending both use vatra but pending is OUTLINE only so
//     a moderation queue never looks like a promoted listing
//
// Typography uses text-label (11px Inter 600 +13.6% tracking, uppercase).
// Shape is `rounded-pill` per §3.
//
// Usage:
//   <Badge variant="featured">Istaknuto</Badge>
//   <Badge variant="xp">+200 XP</Badge>              // bolt auto-injected
//   <Badge variant="published">Objavljeno</Badge>    // check auto-injected
//   <Badge variant="closed">Zatvoreno</Badge>
//   <Badge variant="new">Novo</Badge>
//   <Badge variant="pending">Čeka pregled</Badge>
//   <Badge variant="xp" icon={null}>XP</Badge>       // suppress auto-icon
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "featured"
  | "xp"
  | "published"
  | "closed"
  | "new"
  | "pending";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /**
   * Icon slot. Defaults per variant:
   *   xp        → <Zap />
   *   published → <Check />
   *   others    → none
   * Pass `null` to suppress the default. Pass a node to override.
   */
  icon?: ReactNode | null;
}

// ─── variants · fill + text + border all driven by tokens ─────────────────────
const VARIANTS: Record<BadgeVariant, string> = {
  featured:
    "bg-primary/10 text-primary border-primary/30",

  xp:
    "bg-amber-xp/10 text-amber-xp border-amber-xp/30",

  published:
    "bg-ember-green/10 text-ember-green border-ember-green/30",

  closed:
    "bg-zar-red/10 text-zar-red border-zar-red/30",

  new:
    "bg-somun-purple/10 text-somun-purple border-somun-purple/30",

  // Outline only — the lack of fill is the signal. Border at full opacity
  // so it reads as "provisional / awaiting" against a busy card background.
  pending:
    "bg-transparent text-primary border-primary",
};

// ─── default icons per variant ────────────────────────────────────────────────
const DEFAULT_ICONS: Partial<Record<BadgeVariant, ReactNode>> = {
  xp:        <Zap  className="w-3 h-3 flex-shrink-0" aria-hidden="true" />,
  published: <Check className="w-3 h-3 flex-shrink-0" aria-hidden="true" />,
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = "featured", icon, className, children, ...rest },
    ref,
  ) => {
    // `icon === null` explicitly suppresses the default. `undefined` falls
    // through to the per-variant default.
    const resolvedIcon = icon === undefined ? DEFAULT_ICONS[variant] : icon;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap",
          "rounded-pill border",
          "px-2.5 py-0.5",
          "font-sans text-label leading-none uppercase",
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {resolvedIcon}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
