"use client";

import { MapPin, CheckCircle, LayoutList, Sparkles, BookOpen } from "lucide-react";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { VibrantBadge } from "@/components/ui/VibrantBadge";
import { DirectionsButton } from "./DirectionsButton";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

// ── Per-style accent palette ──────────────────────────────────────────────────
// Light: white card, coloured left-border accent strip + coloured badge
// Dark:  subtle coloured bg tint + coloured border (existing behaviour)
const STYLE_PALETTE: Record<string, {
  leftBar:  string;   // 4px left border strip (light)
  badge:    string;   // style chip colours (both modes via dark:)
  darkBorder: string; // full border (dark mode only)
  darkBg:     string; // bg tint  (dark mode only)
  iconBg:     string; // emoji icon bg
}> = {
  Sarajevski: {
    leftBar:    "border-l-amber-400",
    badge:      "text-amber-700  bg-amber-50   border-amber-300   dark:text-amber-400  dark:bg-amber-400/10  dark:border-amber-500/30",
    darkBorder: "dark:border-amber-500/35",
    darkBg:     "dark:bg-amber-500/[0.04]",
    iconBg:     "bg-amber-100    dark:bg-amber-500/15",
  },
  "Banjalučki": {
    leftBar:    "border-l-blue-400",
    badge:      "text-blue-700   bg-blue-50    border-blue-300    dark:text-blue-400   dark:bg-blue-400/10   dark:border-blue-500/30",
    darkBorder: "dark:border-blue-500/35",
    darkBg:     "dark:bg-blue-500/[0.04]",
    iconBg:     "bg-blue-100     dark:bg-blue-500/15",
  },
  "Travnički": {
    leftBar:    "border-l-emerald-400",
    badge:      "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-500/30",
    darkBorder: "dark:border-emerald-500/35",
    darkBg:     "dark:bg-emerald-500/[0.04]",
    iconBg:     "bg-emerald-100  dark:bg-emerald-500/15",
  },
  "Leskovački": {
    leftBar:    "border-l-red-400",
    badge:      "text-red-700    bg-red-50     border-red-300     dark:text-red-400    dark:bg-red-400/10    dark:border-red-500/30",
    darkBorder: "dark:border-red-500/35",
    darkBg:     "dark:bg-red-500/[0.04]",
    iconBg:     "bg-red-100      dark:bg-red-500/15",
  },
  Ostalo: {
    leftBar:    "border-l-orange-400",
    badge:      "text-orange-700 bg-orange-50  border-orange-300  dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-500/30",
    darkBorder: "dark:border-orange-500/35",
    darkBg:     "dark:bg-orange-500/[0.04]",
    iconBg:     "bg-orange-100   dark:bg-orange-500/15",
  },
};

const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski:   "🕌",
  "Banjalučki": "🌊",
  "Travnički":  "⛰️",
  "Leskovački": "🌶️",
  Ostalo:       "🔥",
};

interface RestaurantCardProps {
  restaurant:      Restaurant;
  avgRating?:      number | null;
  className?:      string;
  onProfileClick?: () => void;
  onAddToJournal?: () => void;
}

export function RestaurantCard({
  restaurant,
  avgRating,
  className,
  onProfileClick,
  onAddToJournal,
}: RestaurantCardProps) {
  const styleKey = restaurant.style && STYLE_PALETTE[restaurant.style as string]
    ? (restaurant.style as string)
    : "Ostalo";

  const emoji   = STYLE_EMOJIS[styleKey] ?? "🔥";
  const palette = STYLE_PALETTE[styleKey];

  const hasRating  = avgRating != null && avgRating > 0;
  const hasLepinja = restaurant.lepinja_rating > 0;

  return (
    <div
      className={cn(
        // ── Base shape ──────────────────────────────────────────────────────
        "group rounded-[20px] overflow-hidden transition-all duration-200",
        // ── Light: white card + soft shadow + coloured left strip ──────────
        "bg-white border border-[rgb(var(--border))] border-l-4",
        "shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05),_0_10px_10px_-5px_rgba(0,0,0,0.02)]",
        "hover:shadow-[0_24px_30px_-5px_rgba(0,0,0,0.09),_0_12px_14px_-5px_rgba(0,0,0,0.04)]",
        "hover:-translate-y-0.5",
        // ── Dark: transparent bg + coloured border ─────────────────────────
        "dark:bg-transparent dark:shadow-none dark:hover:translate-y-0 dark:hover:brightness-110",
        palette.leftBar,
        palette.darkBorder,
        palette.darkBg,
        className,
      )}
    >
      {/* Admin-Pick strip */}
      {restaurant.is_pinned && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 dark:bg-amber-500/15 border-b border-orange-200 dark:border-amber-500/25 text-xs text-orange-600 dark:text-amber-400 font-semibold">
          <Sparkles className="w-3 h-3" />
          Admin Pick
        </div>
      )}

      {/* ── Clickable header ──────────────────────────────────────────────── */}
      <button
        onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
        aria-label={`Otvori profil — ${restaurant.name}`}
        className="w-full text-left flex items-center gap-3 px-5 pt-5 pb-3 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
      >
        {/* Style emoji icon */}
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
          palette.iconBg,
        )}>
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-bold text-[rgb(var(--foreground))] text-base leading-tight truncate group-hover:text-[rgb(var(--primary))] transition-colors"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {restaurant.name}
            </h3>
            {restaurant.is_verified && (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{restaurant.city} · {restaurant.address}</span>
          </div>
        </div>
      </button>

      {/* ── Middle ────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-3">
        {/* Style badge + tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-semibold",
            palette.badge,
          )}>
            {restaurant.style ?? "Ostalo"}
          </span>
          {restaurant.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[rgb(var(--border)/0.6)] text-[rgb(var(--muted))]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Lepinja rating + community avg / status badge */}
        <div className="flex items-center justify-between">
          <LepinjaRating rating={restaurant.lepinja_rating} size="md" showNumber={hasLepinja} />

          {hasRating ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[rgb(var(--primary))]">
                {"🔥".repeat(Math.min(Math.round(avgRating!), 5))}
              </span>
              <span className="font-semibold text-[rgb(var(--foreground))]">
                {avgRating!.toFixed(1)}
              </span>
            </div>
          ) : restaurant.is_verified ? (
            <VibrantBadge variant="verified" />
          ) : (
            <VibrantBadge variant="new" />
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[rgb(var(--border)/0.6)] flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-transparent">
        {/* Quick emoji reactions */}
        <div className="flex gap-0.5">
          {(["🧅", "🔥", "🥯"] as const).map((e) => (
            <button
              key={e}
              onClick={(ev) => ev.stopPropagation()}
              aria-label={e === "🧅" ? "Luk" : e === "🔥" ? "Vatra" : "Lepinja"}
              className="w-8 h-8 rounded-xl hover:bg-[rgb(var(--primary)/0.08)] dark:hover:bg-[rgb(var(--primary)/0.1)] transition-colors text-sm flex items-center justify-center hover:scale-110"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onAddToJournal && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToJournal(); }}
              aria-label={`Dodaj u dnevnik — ${restaurant.name}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs font-semibold whitespace-nowrap",
                "border border-[rgb(var(--primary)/0.35)] text-[rgb(var(--primary))]",
                "hover:bg-[rgb(var(--primary)/0.08)] transition-all",
              )}
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              <BookOpen className="w-3 h-3" />
              DNEVNIK
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
            tabIndex={-1}
            aria-hidden="true"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] text-xs font-semibold whitespace-nowrap",
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
