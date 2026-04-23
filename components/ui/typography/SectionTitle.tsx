// ── SectionTitle ──────────────────────────────────────────────────────────────
// Large section headers — feature group titles, page sections.
//
// Spec · DESIGN_SYSTEM.md §2
//   Oswald 600 · 48px · +2% tracking · line-height 1.05 · UPPERCASE
//   Color: foreground on light, cream (#F5F5DC) on dark.
//
// Usage:
//   <SectionTitle>Ćevap Finder</SectionTitle>
//   <SectionTitle as="h3">Gastro Akademija</SectionTitle>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level. Default `h2`. */
  as?: "h2" | "h3";
}

export const SectionTitle = forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ as: Tag = "h2", className, children, ...rest }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        "font-display text-section uppercase",
        "text-foreground dark:text-cream",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

SectionTitle.displayName = "SectionTitle";
