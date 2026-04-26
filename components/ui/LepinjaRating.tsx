// ── LepinjaRating · ui (Sprint 26v · DS-migrated) ────────────────────────────
// 5-bagel rating row — full / half-opacity / empty-grayscale lepinje.
// Used on restaurant cards, profile, journal — anywhere we display ratings.
//
// Sprint 26v changes:
//   - Number colour text-burnt-orange-400 → text-amber-xp. Ratings are
//     gamification-family per DS (same precedent as review stars in
//     ReviewList Sprint 26i and ReviewModal Sprint 26). The text is on
//     a transparent background — DS rule "amber on buttons forbidden"
//     allows amber-xp on text content, only forbids it as button fills.
//   - Inline style={{fontFamily:"Oswald"}} → font-display class.
//   - 🥯 emoji is the brand "lepinja" rating glyph — content marker,
//     not chrome. Tagged TODO(icons) for Sprint 27 swap to brand
//     <Lepinja> SVG. aria-hidden added so screen readers get the
//     numeric value alone.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

interface LepinjaRatingProps {
  rating: number; // 0–5, supports decimals
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

export function LepinjaRating({
  rating,
  size = "md",
  showNumber = true,
  className,
}: LepinjaRatingProps) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  const clampedRating = Math.max(0, Math.min(5, rating ?? 0));
  const full = Math.floor(clampedRating);
  const hasHalf = clampedRating - full >= 0.25 && clampedRating - full < 0.75;
  const almostFull = clampedRating - full >= 0.75;
  const actualFull = almostFull ? full + 1 : full;
  const empty = 5 - actualFull - (hasHalf ? 1 : 0);

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="img"
      aria-label={`Ocjena ${clampedRating.toFixed(1)} od 5`}
    >
      {/* TODO(icons): swap 🥯 lepinja glyphs for brand <Lepinja> SVG */}
      <div className={cn("flex items-center gap-0.5", sizes[size])} aria-hidden="true">
        {Array.from({ length: actualFull }).map((_, i) => (
          <span key={`full-${i}`} className="opacity-100">🥯</span>
        ))}
        {hasHalf && (
          <span className="opacity-60">🥯</span>
        )}
        {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
          <span key={`empty-${i}`} className="opacity-20 grayscale">🥯</span>
        ))}
      </div>
      {showNumber && (
        <span className={cn(
          "font-display font-bold text-amber-xp tabular-nums",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )}>
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
