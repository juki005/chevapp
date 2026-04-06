"use client";

// ── Button ─────────────────────────────────────────────────────────────────────
// Reusable button following the Sprint-1 "Premium SaaS" design system.
// • primary   — brand-orange background, white text, glowing shadow
// • secondary — ghost border, text becomes orange on hover
// • ghost     — no border/bg, text only
// All variants: extra-rounded (20px), 48px min-height, scale-95 on active.
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  "primary" | "secondary" | "ghost" | "danger";
  size?:     "sm" | "md" | "lg";
  loading?:  boolean;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold " +
  "rounded-[20px] transition-all duration-200 active:scale-95 " +
  "disabled:opacity-40 disabled:pointer-events-none select-none";

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] " +
    "shadow-[0_4px_14px_rgba(255,107,0,0.30)] " +
    "hover:brightness-110 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(255,107,0,0.40)]",
  secondary:
    "bg-transparent border-[1.5px] border-[rgb(var(--border))] " +
    "text-[rgb(var(--foreground)/0.8)] " +
    "hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--primary))] " +
    "hover:bg-[rgb(var(--primary)/0.05)]",
  ghost:
    "bg-transparent text-[rgb(var(--muted))] " +
    "hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)]",
  danger:
    "bg-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.25)] " +
    "hover:brightness-110 hover:-translate-y-px",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm:  "px-4  py-1.5 min-h-[36px] text-xs",
  md:  "px-5  py-2.5 min-h-[44px] text-sm",
  lg:  "px-7  py-3   min-h-[52px] text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
);

Button.displayName = "Button";
