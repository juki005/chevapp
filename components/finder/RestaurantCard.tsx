import { MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "./DirectionsButton";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski: "🕌",
  "Banjalučki": "🌊",
  "Travnički": "⛰️",
  "Leskovački": "🌶️",
  Ostalo: "🔥",
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  avgRating?: number | null;
  className?: string;
}

export function RestaurantCard({ restaurant, avgRating, className }: RestaurantCardProps) {
  const emoji = STYLE_EMOJIS[restaurant.style] ?? "🔥";

  return (
    <div
      className={cn(
        "group rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30",
        "hover:border-burnt-orange-500/40 transition-all duration-200 overflow-hidden",
        className
      )}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-charcoal-700 dark:bg-ugljen-border flex items-center justify-center text-2xl flex-shrink-0">
            {emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className="font-bold text-cream text-base group-hover:text-burnt-orange-400 transition-colors leading-tight"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {restaurant.name}
              </h3>
              {restaurant.is_verified && (
                <CheckCircle className="w-4 h-4 text-burnt-orange-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-cream/40 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{restaurant.city} · {restaurant.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle */}
      <div className="px-5 pb-3">
        {/* Style badge */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs px-2.5 py-1 rounded-full border border-burnt-orange-500/30 bg-burnt-orange-500/10 text-burnt-orange-400 font-medium">
            {restaurant.style}
          </span>
          {restaurant.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-charcoal-700/60 dark:bg-ugljen-border text-cream/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Lepinja rating + community avg */}
        <div className="flex items-center justify-between">
          <LepinjaRating rating={restaurant.lepinja_rating} size="md" />
          {avgRating != null ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[rgb(var(--primary))]">
                {"🔥".repeat(Math.round(avgRating))}
              </span>
              <span className="text-[rgb(var(--muted))]">{avgRating.toFixed(1)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted))/0.5]">
              <AlertCircle className="w-3 h-3" />
              <span>Bez ocjene</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-charcoal-700/60 dark:border-ugljen-border/60 flex items-center justify-between gap-3">
        {/* Quick emoji review */}
        <div className="flex gap-1">
          {["🧅", "🔥", "🥯"].map((emoji) => (
            <button
              key={emoji}
              className="w-8 h-8 rounded-lg hover:bg-burnt-orange-500/10 transition-colors text-sm flex items-center justify-center hover:scale-110 transition-transform"
              title="Brza ocjena"
            >
              {emoji}
            </button>
          ))}
        </div>

        <DirectionsButton
          name={restaurant.name}
          address={restaurant.address}
          city={restaurant.city}
          lat={restaurant.latitude}
          lng={restaurant.longitude}
          phone={restaurant.phone}
        />
      </div>
    </div>
  );
}
