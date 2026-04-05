"use client";

import { MapPin, CheckCircle, LayoutList, Sparkles } from "lucide-react";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "./DirectionsButton";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski:   "🕌",
  "Banjalučki": "🌊",
  "Travnički":  "⛰️",
  "Leskovački": "🌶️",
  Ostalo:       "🔥",
};

// Subtle per-style colour palette
const STYLE_PALETTE: Record<string, {
  border: string;
  bg:     string;
  badge:  string;
  iconBg: string;
}> = {
  Sarajevski:   {
    border:  "border-amber-500/35",
    bg:      "bg-amber-500/[0.04]",
    badge:   "text-amber-400 border-amber-500/30 bg-amber-500/10",
    iconBg:  "bg-amber-500/15",
  },
  "Banjalučki": {
    border:  "border-blue-500/35",
    bg:      "bg-blue-500/[0.04]",
    badge:   "text-blue-400 border-blue-500/30 bg-blue-500/10",
    iconBg:  "bg-blue-500/15",
  },
  "Travnički":  {
    border:  "border-emerald-500/35",
    bg:      "bg-emerald-500/[0.04]",
    badge:   "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    iconBg:  "bg-emerald-500/15",
  },
  "Leskovački": {
    border:  "border-red-500/35",
    bg:      "bg-red-500/[0.04]",
    badge:   "text-red-400 border-red-500/30 bg-red-500/10",
    iconBg:  "bg-red-500/15",
  },
  Ostalo: {
    border:  "border-orange-500/35",
    bg:      "bg-orange-500/[0.04]",
    badge:   "text-orange-400 border-orange-500/30 bg-orange-500/10",
    iconBg:  "bg-orange-500/15",
  },
};

interface RestaurantCardProps {
  restaurant:      Restaurant;
  avgRating?:      number | null;
  className?:      string;
  onProfileClick?: () => void;
}

export function RestaurantCard({
  restaurant,
  avgRating,
  className,
  onProfileClick,
}: RestaurantCardProps) {
  // Normalise: null / unrecognised style → "Ostalo" so every card gets a tint
  const styleKey = restaurant.style && STYLE_PALETTE[restaurant.style as string]
    ? (restaurant.style as string)
    : "Ostalo";
  const emoji   = STYLE_EMOJIS[styleKey] ?? "🔥";
  const palette = STYLE_PALETTE[styleKey];

  // Only show a numeric rating when it's actually > 0
  const hasRating = avgRating != null && avgRating > 0;
  // Only show lepinja number when the DB rating is > 0
  const hasLepinja = restaurant.lepinja_rating > 0;

  return (
    <div
      className={cn(
        "group rounded-2xl border transition-all duration-200 overflow-hidden",
        palette.border,
        palette.bg,
        "hover:brightness-110",
        className
      )}
    >
      {/* Admin-Pick strip */}
      {restaurant.is_pinned && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/25 text-xs text-amber-400 font-semibold">
          <Sparkles className="w-3 h-3" />
          Admin Pick
        </div>
      )}

      {/* Clickable header */}
      <button
        onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
        aria-label={`Otvori profil — ${restaurant.name}`}
        className="w-full text-left flex items-center gap-3 px-5 pt-5 pb-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0",
          palette.iconBg
        )}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-bold text-[rgb(var(--foreground))] text-base group-hover:text-[rgb(var(--primary))] transition-colors leading-tight truncate"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {restaurant.name}
            </h3>
            {restaurant.is_verified && (
              <CheckCircle className="w-4 h-4 text-[rgb(var(--primary))] flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{restaurant.city} · {restaurant.address}</span>
          </div>
        </div>
      </button>

      {/* Middle */}
      <div className="px-5 pb-3">
        {/* Style badge + tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-medium",
            palette.badge
          )}>
            {restaurant.style ?? "Ostalo"}
          </span>
          {restaurant.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-[rgb(var(--border)/0.6)] text-[rgb(var(--muted))]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Lepinja rating + community avg / Novo badge */}
        <div className="flex items-center justify-between">
          <LepinjaRating rating={restaurant.lepinja_rating} size="md" showNumber={hasLepinja} />

          {hasRating ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[rgb(var(--primary))]">
                {"🔥".repeat(Math.min(Math.round(avgRating!), 5))}
              </span>
              <span className="text-[rgb(var(--muted))]">{avgRating!.toFixed(1)}</span>
            </div>
          ) : restaurant.is_verified ? (
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verificirano</span>
            </div>
          ) : (
            <span className={cn(
              "text-xs px-2.5 py-0.5 rounded-full border font-semibold",
              palette.badge
            )}>
              Novo
            </span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-[rgb(var(--border)/0.5)] flex items-center justify-between gap-3">
        {/* Quick emoji reactions */}
        <div className="flex gap-1">
          {(["🧅", "🔥", "🥯"] as const).map((e) => (
            <button
              key={e}
              onClick={(ev) => ev.stopPropagation()}
              aria-label={e === "🧅" ? "Luk" : e === "🔥" ? "Vatra" : "Lepinja"}
              className="w-8 h-8 rounded-lg hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-sm flex items-center justify-center hover:scale-110"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
            tabIndex={-1}
            aria-hidden="true"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
              "border border-[rgb(var(--border))]",
              "text-[rgb(var(--muted))] hover:text-[rgb(var(--primary))] hover:border-[rgb(var(--primary)/0.4)] transition-all",
            )}
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            <LayoutList className="w-3 h-3" />
            PROFIL
          </button>

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
    </div>
  );
}
