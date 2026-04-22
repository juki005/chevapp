"use client";

// ── RestaurantCard · Finder (Sprint 25 · DS-migrated) ─────────────────────────
// Card for our own verified DB places (paired with PlaceResultCard which shows
// external Google Places).
//
// Sprint 25 changes:
//   - rounded-[20px] → rounded-card; inline shadow arrays → shadow-soft-xl
//   - bg-white → bg-surface (mode-aware)
//   - text-emerald-500 verified check → text-ember-green
//   - Admin-pick strip: bg-orange-50 → bg-primary/10 text-primary
//   - VibrantBadge variant="verified" → Badge variant="published"
//   - Inline "🔥 Novo na mapi" chip → Badge variant="new"
//   - Font-family inline style → font-display class
//   - Token-based hover/gray-50 replacements throughout
//   - Emoji placeholders (🕌🌊⛰️🌶️🔥🧅🥯) kept with TODO(icons) markers
//     per §4 interim policy — swept in Sprint 27
//
// DELIBERATE EXCEPTION — per-style color palette (Sarajevski/Banjalučki/
// Travnički/Leskovački/Ostalo ↔ amber/blue/emerald/red/orange):
//   These are categorical visual markers for ćevapi regional styles, not
//   semantic status colors. They use Tailwind's built-in palettes (no raw
//   hex), and collapsing them to a single accent would erase a core
//   recognition affordance. Keep them. If we ever introduce "style tokens"
//   (vatra-sa/vatra-bl/vatra-tv/...), migrate then.
// ────────────────────────────────────────────────────────────────────────────────

import { MapPin, LayoutList, Sparkles, BookOpen, Star } from "lucide-react";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { Badge } from "@/components/ui/Badge";
import { DirectionsButton } from "./DirectionsButton";
import { ReviewStatsBadge } from "./ReviewStatsBadge";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

// ── Per-style accent palette ──────────────────────────────────────────────────
// See file header for why this isn't migrated to semantic tokens.
// Light: white card, coloured left-border accent strip + coloured badge
// Dark:  subtle coloured bg tint + coloured border
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

// TODO(icons): swap for brand <Roštilj-style> icon set — Sprint 27
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
  /** Aggregate of place_reviews for this place (Sprint 19). */
  reviewStats?:    { avg: number; count: number } | null;
  className?:      string;
  onProfileClick?: () => void;
  onAddToJournal?: () => void;
  onReviewClick?:  () => void;
}

export function RestaurantCard({
  restaurant,
  avgRating,
  reviewStats,
  className,
  onProfileClick,
  onAddToJournal,
  onReviewClick,
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
        "group rounded-card overflow-hidden transition-all duration-200",
        // ── Flex column — card sizes to content; overflow-hidden never clips ─
        "flex flex-col",
        // ── Light: surface fill + soft shadow + coloured left strip ─────────
        "bg-surface border border-border border-l-4 shadow-soft-xl",
        "hover:shadow-[0_24px_30px_-5px_rgba(0,0,0,0.09),_0_12px_14px_-5px_rgba(0,0,0,0.04)]",
        "hover:-translate-y-0.5",
        // ── Dark: transparent bg + coloured border (shadows hidden per §3) ──
        "dark:bg-transparent dark:shadow-none dark:hover:translate-y-0 dark:hover:brightness-110",
        palette.leftBar,
        palette.darkBorder,
        palette.darkBg,
        className,
      )}
    >
      {/* Admin-Pick strip — featured ribbon, vatra-tinted */}
      {restaurant.is_pinned && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 border-b border-primary/20 text-xs text-primary font-semibold">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Admin Pick
        </div>
      )}

      {/* ── Clickable header ──────────────────────────────────────────────── */}
      <button
        onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
        aria-label={`Otvori profil — ${restaurant.name}`}
        className="w-full text-left flex items-center gap-3 px-5 pt-5 pb-3 hover:bg-primary/[0.03] transition-colors"
      >
        {/* Style emoji icon — TODO(icons): swap for brand style-icon set */}
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
          palette.iconBg,
        )}>
          <span aria-hidden="true">{emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-foreground text-base leading-tight truncate group-hover:text-primary transition-colors">
              {restaurant.name}
            </h3>
            {restaurant.is_verified && (
              <Badge variant="published" icon={null} className="!px-1.5 !py-0 !text-[9px]">
                ✓
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{restaurant.city} · {restaurant.address}</span>
          </div>
        </div>
      </button>

      {/* ── Middle ────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-3 flex-1">
        {/* Style badge + tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-pill border font-semibold",
            palette.badge,
          )}>
            {restaurant.style ?? "Ostalo"}
          </span>
          {restaurant.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-pill bg-border/60 text-muted"
            >
              {tag}
            </span>
          ))}
          {reviewStats && reviewStats.count > 0 && (
            <ReviewStatsBadge avg={reviewStats.avg} count={reviewStats.count} />
          )}
        </div>

        {/* Lepinja rating + community avg / status badge */}
        <div className="flex items-center justify-between">
          <LepinjaRating rating={restaurant.lepinja_rating} size="md" showNumber={hasLepinja} />

          {hasRating ? (
            <div className="flex items-center gap-1 text-xs">
              {/* TODO(icons): swap 🔥 for brand <Vatra> icon repetition */}
              <span className="text-primary" aria-hidden="true">
                {"🔥".repeat(Math.min(Math.round(avgRating!), 5))}
              </span>
              <span className="font-semibold text-foreground">
                {avgRating!.toFixed(1)}
              </span>
            </div>
          ) : restaurant.is_verified ? (
            <Badge variant="published">Verificirano</Badge>
          ) : (
            <Badge variant="new">Novo na mapi</Badge>
          )}
        </div>
      </div>

      {/* ── Footer: emoji row + single action-bar row ─────────────────────── */}
      <div className="mt-auto px-4 pt-3 pb-4 border-t border-border/60 bg-surface/60 dark:bg-transparent space-y-2">
        {/* Quick emoji reactions — own row, left-aligned.
            TODO(icons): swap 🧅 🔥 🥯 for brand <Luk> <Vatra> <Somun> in Sprint 27. */}
        <div className="flex gap-0.5">
          {(["🧅", "🔥", "🥯"] as const).map((e) => (
            <button
              key={e}
              onClick={(ev) => ev.stopPropagation()}
              aria-label={e === "🧅" ? "Luk" : e === "🔥" ? "Vatra" : "Lepinja"}
              className="w-8 h-8 rounded-chip hover:bg-primary/10 transition-colors text-sm flex items-center justify-center hover:scale-110"
            >
              <span aria-hidden="true">{e}</span>
            </button>
          ))}
        </div>

        {/* Action row — single horizontal line, nowrap.
            Secondary buttons render as icon-only 36×36 chips with aria-label
            + title tooltips so the primary CTA ("Kreni po ćevape") always
            fits on the same row regardless of breakpoint. */}
        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
          {onReviewClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onReviewClick(); }}
              aria-label={`Ostavi recenziju — ${restaurant.name}`}
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
          {onAddToJournal && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToJournal(); }}
              aria-label={`Dodaj u dnevnik — ${restaurant.name}`}
              title="Dodaj u dnevnik"
              className={cn(
                "flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-chip flex-shrink-0",
                "border border-primary/35 text-primary",
                "hover:bg-primary/10 transition-all text-xs font-semibold",
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">Dnevnik</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
            aria-label={`Otvori profil — ${restaurant.name}`}
            title="Otvori profil"
            className={cn(
              "flex items-center justify-center gap-1.5 w-9 lg:w-auto lg:px-3 h-9 rounded-chip flex-shrink-0",
              "border border-border text-muted",
              "hover:text-primary hover:border-primary/40 transition-all text-xs font-semibold",
            )}
          >
            <LayoutList className="w-4 h-4" />
            <span className="hidden lg:inline">Profil</span>
          </button>

          <DirectionsButton
            name={restaurant.name}
            address={restaurant.address}
            city={restaurant.city}
            lat={restaurant.latitude}
            lng={restaurant.longitude}
            phone={restaurant.phone}
            className="flex-shrink-0 !h-9 !min-h-0 !px-2.5 !text-xs"
          />
        </div>
      </div>
    </div>
  );
}
