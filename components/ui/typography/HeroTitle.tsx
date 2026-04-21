// ── HeroTitle ─────────────────────────────────────────────────────────────────
// Display type for landing pages, empty states, brand moments.
//
// Spec · DESIGN_SYSTEM.md §2
//   Oswald 700 · 80px · -1.25% tracking · line-height 0.95 · UPPERCASE
//   Minimum 72px at any size — never smaller.
//   Color: foreground on light, cream (#F5F5DC) on dark.
//
// Usage:
//   <HeroTitle>Savršen griz<span className="text-primary">.</span></HeroTitle>
//   <HeroTitle as="h2">Merak rječnik.</HeroTitle>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface HeroTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level. Default `h1`. */
  as?: "h1" | "h2";
}

export const HeroTitle = forwardRef<HTMLHeadingElement, HeroTitleProps>(
  ({ as: Tag = "h1", className, children, ...rest }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        "font-display text-hero uppercase",
        "text-foreground dark:text-[rgb(var(--cream))]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

HeroTitle.displayName = "HeroTitle";
