"use client";

// ── PlaceResultCard · Finder (Sprint 25 · DS-migrated) ────────────────────────
// Card shown for Google Places search results (external data source, not our
// own verified DB). Paired with RestaurantCard which shows internal places.
//
// Sprint 25 changes:
//   - Dropped #4285f4 Google-blue (raw hex, "never" list §8). The "Google"
//     label chip is enough to signal data source — no blue outline needed.
//   - Open/closed → text-ember-green / text-zar-red (semantic tokens).
//   - Oswald via font-display class (was inline style).
//   - rounded-2xl → rounded-card; border via tokens.
//   - Emoji (📍 🔍) kept as placeholders until Sprint 27.
// ────────────────────────────────────────────────────────────────────────────────

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlaceResult } from "@/types/places";
import type { ProfileTarget } from "@/components/finder/RestaurantDetailModal";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import { ReviewStatsBadge } from "@/components/finder/ReviewStatsBadge";
import { cn } from "@/lib/utils";

interface PlaceResultCardProps {
  result:         PlaceResult;
  isSelected:     boolean;
  onSelect:       () => void;
  onProfileClick: (target: ProfileTarget) => void;
  onReviewClick?: () => void;
  /** Aggregate of place_reviews for this place_id (Sprint 19). */
  reviewStats?:   { avg: number; count: number } | null;
}

export function PlaceResultCard({ result: r, isSelected, onSelect, onProfileClick, onReviewClick, reviewStats }: PlaceResultCardProps) {
  const t = useTranslations("finder");
  const cleanTypes = r.types
    .filter((t) => t !== "point_of_interest" && t !== "establishment" && t !== "food")
    .slice(0, 3);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-card border border-border bg-surface/40 p-5 pb-5 cursor-pointer transition-all",
        "flex flex-col",
        "hover:border-primary/40",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* TODO(icons): swap for brand <MapPin> */}
        <span className="text-3xl leading-none" aria-hidden="true">📍</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground text-base leading-snug">
            {r.name}
          </h3>
          {/* Show actual place city parsed from its own vicinity address.
              r.city may equal the searched city when parsing fails — in that
              case fall back to the full address which is always correct. */}
          <p className="text-xs text-muted mt-0.5">
            {r.city && r.city !== r.address ? r.city : r.address}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {/* Neutral data-source chip — no Google-blue. The word itself carries
              the meaning; no brand color needed. */}
          <span className="text-[10px] px-2 py-0.5 rounded-pill border border-border text-muted">
            Google
          </span>
          {r.open_now != null && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-pill border",
              r.open_now
                ? "border-ember-green/30 text-ember-green"
                : "border-zar-red/30 text-zar-red",
            )}>
              {r.open_now ? t("openNow") : t("closedNow")}
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      {r.address && (
        <p className="text-xs text-muted mb-2">{r.address}</p>
      )}

      {/* Type chips */}
      {cleanTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {cleanTypes.map((type) => (
            <span
              key={type}
              className="text-[10px] px-1.5 py-0.5 rounded-pill bg-border/40 text-muted"
            >
              {type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Footer: ratings on top, single-row action bar below */}
      <div className="mt-auto pt-3 border-t border-border/50 space-y-2.5">
        {/* ── Info row ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap min-h-[18px]">
          {r.rating != null && (
            <p className="text-xs text-muted">
              {/* TODO(icons): swap ⭐ for brand <Ocjena> */}
              <span aria-hidden="true">⭐</span>{" "}
              <span className="text-foreground font-medium">{r.rating.toFixed(1)}</span>
              <span className="text-muted">/5</span>
              <span className="ml-1 text-[10px] opacity-70">Google</span>
            </p>
          )}
          {reviewStats && reviewStats.count > 0 && (
            <ReviewStatsBadge avg={reviewStats.avg} count={reviewStats.count} compact />
          )}
        </div>

        {/* ── Action row — single line, never wraps.
            Secondary buttons render as icon-only square chips; the primary
            "Kreni po ćevape" CTA keeps its full label and occupies the
            remaining space. aria-label + title preserve accessibility. */}
        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
          {onReviewClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onReviewClick(); }}
              aria-label={`Ostavi recenziju — ${r.name}`}
              title="Ostavi recenziju"
              className={cn(
                "flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-chip flex-shrink-0",
                "border border-amber-xp/40 text-amber-xp",
                "hover:bg-amber-xp/10 transition-all text-xs font-semibold",
              )}
            >
              <Star className="w-4 h-4" />
              <span className="hidden lg:inline">Recenzija</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick({
                google_place_id: r.place_id,
                name:            r.name,
                city:            r.city,
                address:         r.address,
                lat:             r.latitude,
                lng:             r.longitude,
                rating:          r.rating,
                open_now:        r.open_now,
                types:           r.types,
              });
            }}
            aria-label={t("openProfile")}
            title={t("openProfile")}
            className={cn(
              "flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-chip flex-shrink-0",
              "border border-border text-muted",
              "hover:text-primary hover:border-primary/40 transition-all text-xs font-semibold",
            )}
          >
            {/* TODO(icons): swap 🔍 for brand <Finder> */}
            <span aria-hidden="true">🔍</span>
            <span className="hidden lg:inline">Profil</span>
          </button>

          <DirectionsButton
            name={r.name}
            address={r.address}
            city={r.city}
            lat={r.latitude}
            lng={r.longitude}
            className="flex-shrink-0 !h-9 !min-h-0 !px-2.5 !text-xs"
          />
        </div>
      </div>
    </div>
  );
}
