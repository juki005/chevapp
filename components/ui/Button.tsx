"use client";

// ── Button · ChevApp Design System ────────────────────────────────────────────
// Five variants, locked to the action hierarchy in DESIGN_SYSTEM.md §5.
//
//   primary     — flat vatra fill · main commit action ("Istraži Finder")
//   secondary   — ghost border    · cancel / "Vidi sve" / back
//   fab         — elevated vatra  · "Rulet" · visually loudest on the page
//   xp          — amber-xp fill   · "+150 XP ⚡" reward · NEVER a CTA
//   destructive — žar-red fill    · "Odjava", "Obriši"
//
// Hard rules (copied from §5 / §8 so they show up in grep):
//   • One primary-orange button visible per level. Two = bug.
//   • XP buttons NEVER take the primary action — they are reward nudges.
//   • No gradients on primary. Flat fill only.
//   • Amber-xp is gamification-only. Never on a commit button.
//   • Inactive/disabled uses opacity — not a muted fill. The 7shifts
//     "inactive contrast" rule lives in <Toggle>/<TabBar>, not here.
//
// Usage:
//   <Button>Istraži Finder</Button>
//   <Button variant="secondary">Odustani</Button>
//   <Button variant="fab" size="lg">Rulet</Button>
//   <Button variant="xp">+150 XP</Button>          // bolt auto-injected
//   <Button variant="destructive">Odjava</Button>
//   <Button loading fullWidth>Objavi recenziju</Button>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "fab" | "xp" | "destructive";
export type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  /** Icon before the label. For `xp`, defaults to a lightning bolt. */
  leftIcon?:  ReactNode;
  /** Icon after the label. */
  rightIcon?: ReactNode;
}

// ─── base ─────────────────────────────────────────────────────────────────────
const BASE =
  "inline-flex items-center justify-center gap-2 " +
  "font-sans font-semibold tracking-wide select-none " +
  "rounded-card transition-all duration-200 " +
  "active:scale-[0.97] " +
  "disabled:opacity-40 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary/40 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

// ─── variants ─────────────────────────────────────────────────────────────────
const VARIANTS: Record<ButtonVariant, string> = {
  // Flat vatra. The commit-action button. Glow via shadow-brand.
  primary:
    "bg-primary text-primary-fg shadow-brand " +
    "hover:bg-vatra-hover hover:-translate-y-px " +
    "active:bg-vatra-pressed active:shadow-none",

  // Ghost border — hover hints at vatra but never fills.
  secondary:
    "bg-transparent border-[1.5px] border-border text-foreground " +
    "hover:border-primary/60 hover:text-primary hover:bg-primary/5",

  // FAB = same fill as primary but elevated further AND pill-shaped. The
  // shape break is intentional so FAB can't be confused for a regular
  // commit button sharing the page.
  fab:
    "bg-primary text-primary-fg shadow-soft-xl rounded-pill " +
    "hover:bg-vatra-hover hover:-translate-y-0.5 " +
    "active:bg-vatra-pressed active:translate-y-0 active:shadow-soft-md",

  // Amber XP. Reward chip — shows up after commit, not as the commit itself.
  xp:
    "bg-amber-xp text-white shadow-soft-md " +
    "hover:brightness-110 hover:-translate-y-px " +
    "active:brightness-95 active:shadow-none",

  // Žar red. Sign-out, delete, confirm-destructive flows.
  destructive:
    "bg-zar-red text-white shadow-soft-md " +
    "hover:brightness-110 hover:-translate-y-px " +
    "active:brightness-95 active:shadow-none",
};

// ─── sizes ────────────────────────────────────────────────────────────────────
// min-h values respect WCAG 2.5.5 / Apple HIG (≥44px tap target).
const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 min-h-[36px] text-xs",
  md: "px-6 py-3   min-h-[48px] text-sm",
  lg: "px-8 py-4   min-h-[56px] text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    // xp auto-injects the bolt if caller didn't pass one — keeps the
    // "+150 XP ⚡" pattern consistent without hard-coding the emoji.
    const resolvedLeft =
      leftIcon ??
      (variant === "xp"
        ? <Zap className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        : null);

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          BASE,
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2
            className="w-4 h-4 flex-shrink-0 animate-spin"
            aria-hidden="true"
          />
        ) : (
          resolvedLeft
        )}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
