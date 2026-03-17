"use client";

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
        "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
        "text-cream/60 hover:text-cream hover:bg-charcoal-700 dark:hover:bg-ugljen-border",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="w-4.5 h-4.5 text-burnt-orange-400" />
      ) : (
        <Moon className="w-4.5 h-4.5" />
      )}
    </button>
  );
}
