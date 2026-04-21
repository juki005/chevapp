// ── Label ─────────────────────────────────────────────────────────────────────
// Small UPPERCASE label/caption — form labels, chip captions, tier names,
// XP badges (e.g. "MAJSTOR ROŠTILJA · 4,820 XP").
//
// Spec · DESIGN_SYSTEM.md §2
//   Inter 600 · 11px · +13.6% tracking · UPPERCASE
//
// Tone prop:
//   default — muted (form/field labels)   e.g. "LEPINJA OCJENA"
//   accent  — vatra primary color         e.g. "MAJSTOR ROŠTILJA · 4,820 XP"
//   strong  — foreground (white in dark)  e.g. section eyebrows
//
// Usage:
//   <Label>Lepinja ocjena</Label>
//   <Label tone="accent">Majstor Roštilja · 4,820 XP</Label>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends HTMLAttributes<HTMLElement> {
  /** Tag to render. Default `span`. Use `label` inside forms. */
  as?: "span" | "div" | "p" | "label";
  /** Color tone. Default `default` (muted). */
  tone?: "default" | "accent" | "strong";
}

const TONES: Record<NonNullable<LabelProps["tone"]>, string> = {
  default: "text-muted",
  accent:  "text-primary",
  strong:  "text-foreground",
};

export const Label = forwardRef<HTMLElement, LabelProps>(
  ({ as: Tag = "span", tone = "default", className, children, ...rest }, ref) => (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(
        "font-sans text-label uppercase",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  ),
);

Label.displayName = "Label";
