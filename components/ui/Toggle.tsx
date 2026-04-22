"use client";

// ── Toggle · ChevApp Design System ────────────────────────────────────────────
// Binary on/off control — a pill-shaped button whose pressed state is the
// selected state. Used for filter chips ("Otvoreno sada", "Verificirano"),
// setting switches, and any other boolean that isn't a form checkbox.
//
// Implements the 7shifts "Inactive Contrast Principle" (DESIGN_SYSTEM.md §5):
//
//   pressed   → vatra-tinted fill · vatra text · vatra border
//   unpressed → transparent fill · foreground text · muted border
//
// Inactive is NEVER a muted gray fill — that's the whole rule. Gray fills
// make the off state look disabled; an opt-in toggle should feel clickable.
//
// Uses the Radix/WAI-ARIA convention: `aria-pressed` on a <button>, with
// `pressed` / `onPressedChange` props so the component is trivially
// controllable from state.
//
// NOT the right component for:
//   - Form booleans with labels → use a real <input type="checkbox"> + label
//   - iOS-style slider switches → those use a muted-track and violate the
//     inactive-contrast rule; don't port that pattern here
//   - Mutually exclusive choices → use <TabBar>
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <Toggle pressed={open} onPressedChange={setOpen}>Otvoreno sada</Toggle>
//
//   <Toggle pressed={verified} onPressedChange={setVerified} leftIcon={<ShieldCheck />}>
//     Verificirano
//   </Toggle>
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToggleSize = "sm" | "md";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Current on/off state. Controlled. */
  pressed?: boolean;
  /** Fires with the NEW pressed value when the user toggles. */
  onPressedChange?: (pressed: boolean) => void;
  size?: ToggleSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const SIZES: Record<ToggleSize, string> = {
  sm: "px-3  py-1   min-h-[32px] text-xs",
  md: "px-4  py-1.5 min-h-[40px] text-sm",
};

// Active / inactive state classes. This is the 7shifts rule, literal.
const STATE = {
  pressed:
    "bg-primary/10 text-primary border-primary " +
    "hover:bg-primary/15",
  unpressed:
    "bg-transparent text-foreground border-border " +
    "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      pressed = false,
      onPressedChange,
      size = "md",
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type = "button",
      onClick,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-pressed={pressed}
      aria-checked={pressed}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onPressedChange?.(!pressed);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "font-sans font-semibold select-none",
        "rounded-pill border-[1.5px] transition-all duration-200",
        "active:scale-[0.97]",
        "disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 " +
          "focus-visible:ring-primary/40 focus-visible:ring-offset-2 " +
          "focus-visible:ring-offset-background",
        SIZES[size],
        pressed ? STATE.pressed : STATE.unpressed,
        className,
      )}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  ),
);

Toggle.displayName = "Toggle";
