// ── BodyText ──────────────────────────────────────────────────────────────────
// Default body copy — paragraphs, descriptions, card bodies.
//
// Spec · DESIGN_SYSTEM.md §2
//   Inter 400 · 15px · line-height 1.7 · mixed case
//
// Usage:
//   <BodyText>Otvori Ćevap Finder, filtriraj po stilu i gradu…</BodyText>
//   <BodyText as="span" className="text-muted">inline note</BodyText>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BodyTextProps extends HTMLAttributes<HTMLElement> {
  /** Tag to render. Default `p`. */
  as?: "p" | "span" | "div";
}

export const BodyText = forwardRef<HTMLElement, BodyTextProps>(
  ({ as: Tag = "p", className, children, ...rest }, ref) => (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(
        "font-sans text-body text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

BodyText.displayName = "BodyText";
