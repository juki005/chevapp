"use client";

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
        "rounded-2xl border border-[#4285f4]/20 bg-[rgb(var(--surface)/0.4)] p-5 pb-5 cursor-pointer transition-all",
        "flex flex-col",
        isSelected && "ring-2 ring-[#4285f4] ring-offset-2 ring-offset-[rgb(var(--background))]"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl leading-none">📍</span>
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-[rgb(var(--foreground))] text-base leading-snug"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {r.name}
          </h3>
          {/* Show actual place city parsed from its own vicinity address.
              r.city may equal the searched city when parsing fails — in that
              case fall back to the full address which is always correct. */}
          <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
            {r.city && r.city !== r.address ? r.city : r.address}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#4285f4]/30 text-[#4285f4]">
            Google
          </span>
          {r.open_now != null && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border",
              r.open_now
                ? "border-green-500/30 text-green-400"
                : "border-red-500/30 text-red-400"
            )}>
              {r.open_now ? t("openNow") : t("closedNow")}
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      {r.address && (
        <p className="text-xs text-[rgb(var(--muted))] mb-2">{r.address}</p>
      )}

      {/* Type chips */}
      {cleanTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {cleanTypes.map((type) => (
            <span
              key={type}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgb(var(--border)/0.4)] text-[rgb(var(--muted))]"
            >
              {type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Footer: ratings on top, single-row action bar below */}
      <div className="mt-auto pt-3 border-t border-[rgb(var(--border)/0.5)] space-y-2.5">
        {/* ── Info row ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap min-h-[18px]">
          {r.rating != null && (
            <p className="text-xs text-[rgb(var(--muted))]">
              ⭐ <span className="text-[rgb(var(--foreground))] font-medium">{r.rating.toFixed(1)}</span>
              <span className="text-[rgb(var(--muted))]">/5</span>
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
              className="flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-lg border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all flex-shrink-0 text-xs font-semibold"
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
            className="flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-lg text-sm border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[#4285f4] hover:border-[#4285f4]/40 transition-all flex-shrink-0"
          >
            <span>🔍</span>
            <span className="hidden lg:inline text-xs font-semibold">Profil</span>
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
