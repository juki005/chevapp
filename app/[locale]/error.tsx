"use client";

// ── Root error boundary · /[locale] (Sprint 26d · DS-migrated) ──────────────
// Shown when a page below this route throws during render. Kept intentionally
// minimal — no i18n lookup, because that's one of the subsystems that might
// have failed. Copy is HR hardcoded (matches the default locale fallback).
//
// Sprint 26d changes:
//   - All inline style={{...}} → Tailwind className tokens.
//   - #D35400 button + fontFamily:"Oswald" → <Button variant="primary">.
//   - rgb(var(--foreground/muted)) → text-foreground / text-muted.
//   - Emoji 🍖 kept as placeholder with TODO(icons) for Sprint 27.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 py-10 text-center">
      {/* TODO(icons): swap 🍖 for brand <Cevapi> when Sprint 27 lands */}
      <div className="text-5xl" aria-hidden="true">🍖</div>
      <h2 className="font-display text-[22px] font-bold text-foreground m-0">
        Nešto je pošlo po krivu
      </h2>
      <p className="text-sm text-muted m-0 max-w-[320px]">
        Došlo je do neočekivane greške. Pokušaj ponovo ili osvježi stranicu.
      </p>
      <Button variant="primary" onClick={reset}>
        POKUŠAJ PONOVO
      </Button>
    </div>
  );
}
