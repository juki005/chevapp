// ── CardTitle ─────────────────────────────────────────────────────────────────
// Titles inside cards — restaurant names, feature cards, modal headers.
//
// Spec · DESIGN_SYSTEM.md §2
//   Oswald 600 · 32px · +0.5% tracking · line-height 1.1 · mixed case
//   Minimum 28px — never 22px (contrast must be dramatic).
//
// Usage:
//   <CardTitle>Trattoria Roma</CardTitle>
//   <CardTitle as="h4">Jukebox Balkana</CardTitle>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level. Default `h3`. */
  as?: "h3" | "h4";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Tag = "h3", className, children, ...rest }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        "font-display text-card-title text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

CardTitle.displayName = "CardTitle";
