"use client";

import { useTranslations } from "next-intl";
import type { PlaceResult } from "@/types/places";
import type { ProfileTarget } from "@/components/finder/RestaurantDetailModal";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import { cn } from "@/lib/utils";

interface PlaceResultCardProps {
  result:         PlaceResult;
  isSelected:     boolean;
  onSelect:       () => void;
  onProfileClick: (target: ProfileTarget) => void;
}

export function PlaceResultCard({ result: r, isSelected, onSelect, onProfileClick }: PlaceResultCardProps) {
  const t = useTranslations("finder");
  const cleanTypes = r.types
    .filter((t) => t !== "point_of_interest" && t !== "establishment" && t !== "food")
    .slice(0, 3);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-2xl border border-[#4285f4]/20 bg-[rgb(var(--surface)/0.4)] p-5 cursor-pointer transition-all",
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
          <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{r.city}</p>
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

      {/* Footer: rating + actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgb(var(--border)/0.5)]">
        {r.rating != null ? (
          <p className="text-xs text-[rgb(var(--muted))]">
            ⭐ <span className="text-[rgb(var(--foreground))] font-medium">{r.rating.toFixed(1)}</span>
            <span className="text-[rgb(var(--muted))]">/5</span>
          </p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[#4285f4] hover:border-[#4285f4]/40 transition-all"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            🔍 {t("openProfile")}
          </button>

          <DirectionsButton
            name={r.name}
            address={r.address}
            city={r.city}
            lat={r.latitude}
            lng={r.longitude}
          />
        </div>
      </div>
    </div>
  );
}
