// ── Subsection ────────────────────────────────────────────────────────────────
// Sub-headers within a section — card subtitles, form group labels (the
// larger kind that aren't the tiny ALL-CAPS label).
//
// Spec · DESIGN_SYSTEM.md §2
//   Inter 600 · 18px · line-height 1.4 · mixed case
//
// Usage:
//   <Subsection>Pronađi najbliže ćevabdžinice</Subsection>
//   <Subsection as="p">Balkanska glazba</Subsection>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SubsectionProps extends HTMLAttributes<HTMLElement> {
  /** Tag to render. Default `h4` (keeps heading outline valid). */
  as?: "h4" | "h5" | "p";
}

export const Subsection = forwardRef<HTMLElement, SubsectionProps>(
  ({ as: Tag = "h4", className, children, ...rest }, ref) => (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(
        "font-sans text-subsec text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

Subsection.displayName = "Subsection";
