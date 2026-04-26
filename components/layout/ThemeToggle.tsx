"use client";

// ── ThemeToggle · layout (Sprint 26u · DS-migrated) ──────────────────────────
// Sun/Moon icon button toggling Ugljen ↔ Somun mode.
//
// Sprint 26u changes:
//   - Legacy palette swept: text-cream/60 + hover:text-cream → text-muted +
//     hover:text-foreground (fixes cream-on-cream invisibility on Somun
//     mode — same latent bug Sprint 26h fixed in RestaurantGrid).
//   - hover:bg-charcoal-700 + dark:hover:bg-ugljen-border duo → hover:bg-border
//     (one mode-aware surface token).
//   - Sun icon text-burnt-orange-400 → text-vatra-hover (warm-hue accent;
//     vatra is the brand orange family, vatra-hover is the brighter accent
//     that reads better on a small icon than the deeper primary tone).
//   - Invalid w-4.5 h-4.5 (not in Tailwind 3 default spacing scale; was
//     silently rendering at default size) → w-5 h-5 (DS nav icon size).
//   - rounded-lg → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "w-9 h-9 rounded-chip flex items-center justify-center transition-all duration-200",
        "text-muted hover:text-foreground hover:bg-border",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-vatra-hover" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
