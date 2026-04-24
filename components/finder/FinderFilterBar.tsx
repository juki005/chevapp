"use client";

// ── FinderFilterBar · finder (Sprint 26j · DS-migrated) ──────────────────────
// Three-row filter panel above the Finder results:
//   Row 1 · Location (country + city + geo)
//   Row 2 · Name search + grid/map view toggle
//   Row 3 · Style chips + Rulet CTA + Istraži (external) + favorites + clear
//
// Sprint 26j changes:
//   - All arbitrary rgb(var(--token)) classes → semantic Tailwind aliases
//     (bg-surface/40, border-border, text-muted, text-foreground, bg-primary,
//     text-primary-fg).
//   - View-toggle active state bg-[rgb(var(--primary))] text-white →
//     bg-primary text-primary-fg (one source of truth for the vatra CTA fill).
//   - Rulet button: dropped the inline linear-gradient(135deg,#E84E0F,#F97316)
//     + inline Oswald fontFamily per DS §8 (no gradients on primary CTAs,
//     font-display class over inline style). Now a flat bg-primary with
//     shadow-brand and the same framer-motion pulse animation applied via
//     boxShadow keyframes tuned to the shadow-brand token colour.
//   - Search highlight: border-[#FF6B00]/40 → border-vatra-hover/40; spinner
//     text-[#FF6B00] → text-vatra-hover.
//   - Favorites heart + Clear filters: red-400 → zar-red (the DS alert token).
//   - Istraži (TripAdvisor) button keeps #00af87 with a documented comment —
//     external-brand exception (same rationale as the per-style palette in
//     RestaurantCard), intentional cross-brand signal, not app chrome.
//   - rounded-2xl → rounded-card; rounded-xl / rounded-lg → rounded-chip.
//   - 🎡 Rulet emoji tagged TODO(icons) for Sprint 27 brand-icon swap.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { Search, Map, List, Loader2, Heart, X, Compass } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { StyleFilter } from "@/components/finder/StyleFilter";
import { LocationFilter, type LocationValue } from "@/components/finder/LocationFilter";
import type { CevapStyle } from "@/types";
import { cn } from "@/lib/utils";

interface FinderFilterBarProps {
  // Search
  searchTerm:       string;
  onSearchChange:   (v: string) => void;
  placesLoading:    boolean;
  // Location (country ISO + city — managed by LocationFilter internally)
  locationValue:    LocationValue;
  onLocationChange: (v: LocationValue) => void;
  // View mode
  viewMode:         "grid" | "map";
  onViewModeChange: (v: "grid" | "map") => void;
  // Style filter
  activeStyle:      CevapStyle | "";
  onStyleChange:    (v: CevapStyle | "") => void;
  // Extras
  favOnly:          boolean;
  onFavOnlyChange:  (v: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters:   () => void;
  onOpenRulet:      () => void;
}

export function FinderFilterBar({
  searchTerm, onSearchChange, placesLoading,
  locationValue, onLocationChange,
  viewMode, onViewModeChange,
  activeStyle, onStyleChange,
  favOnly, onFavOnlyChange,
  hasActiveFilters, onClearFilters,
  onOpenRulet,
}: FinderFilterBarProps) {
  const t      = useTranslations("finder");
  const locale = useLocale();

  return (
    <div className="rounded-card border border-border bg-surface/40 p-4 mb-5 space-y-3">

      {/* ── Row 1: Location filter — PRIMARY ─────────────────────────────────
           Country select → City autocomplete → Geo button
           This is the main filter; drives DB query + Google Places.          */}
      <LocationFilter
        value={locationValue}
        onChange={onLocationChange}
      />

      {/* ── Row 2: Name search (secondary) + View toggle ──────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">

        {/* Name / restaurant search — secondary, visually quieter */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60 pointer-events-none" />
          {placesLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vatra-hover animate-spin" />
          )}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pretraži po imenu..."
            className={cn(
              "w-full pl-9 pr-9 py-2 rounded-chip border text-sm transition-colors outline-none",
              "bg-background",
              "placeholder:text-muted/50 text-foreground",
              searchTerm
                ? "border-vatra-hover/40"
                : "border-border/70 focus:border-border",
            )}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Očisti pretragu"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex rounded-chip border border-border overflow-hidden w-full sm:w-auto flex-shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[38px] py-2 text-sm font-medium transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground",
            )}
          >
            <List className="w-4 h-4" />
            <span>{t("listView")}</span>
          </button>
          <button
            onClick={() => onViewModeChange("map")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[38px] py-2 text-sm font-medium transition-colors border-l border-border",
              viewMode === "map"
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground",
            )}
          >
            <Map className="w-4 h-4" />
            <span>{t("mapView")}</span>
          </button>
        </div>
      </div>

      {/* ── Row 3: Style chips + Rulet (clearly separated) ───────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <StyleFilter
          activeStyle={activeStyle}
          onStyleChange={(s) => onStyleChange(s as CevapStyle | "")}
        />

        <div className="flex items-center gap-2 flex-shrink-0 self-start mt-0.5 flex-wrap">

          {/* Rulet — vatra CTA with a pulsing shadow-brand glow. Per DS §8
              "flat fills on primary CTAs" — no gradient. The motion pulse
              keeps the old sense of urgency by animating the shadow alpha. */}
          <motion.button
            onClick={onOpenRulet}
            animate={{
              boxShadow: [
                "0 2px 10px rgba(255,107,0,0.30)",
                "0 2px 18px rgba(255,107,0,0.60)",
                "0 2px 10px rgba(255,107,0,0.30)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Rulet — nasumični ćevap"
            className={cn(
              "font-display flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs font-bold tracking-wider transition-all",
              "bg-primary text-primary-fg border border-vatra-hover/50",
            )}
          >
            {/* TODO(icons): swap 🎡 for brand <Rulet> */}
            <span aria-hidden="true">🎡</span> RULET
          </motion.button>

          {/* Istraži — link to Community Explore tab. Uses TripAdvisor's
              brand green (#00af87) as a deliberate cross-brand signal —
              external-brand exception, documented. Same rationale as the
              per-style palette in RestaurantCard: categorical markers
              doing real UX work, not app chrome. */}
          <Link
            href={`/${locale}/community?tab=explore${locationValue.city ? `&search=${encodeURIComponent(locationValue.city)}` : ""}`}
            title="Istraži grad na TripAdvisoru i zajednici"
            aria-label="Istraži Community stranicu"
            className="font-display flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs font-bold tracking-wider transition-all active:scale-95 text-white bg-[#00af87] hover:bg-[#008a6a] shadow-soft-md hover:shadow-soft-xl whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">ISTRAŽI</span>
          </Link>

          {/* Favorites-only toggle — zar-red for the heart (DS alert family
              covers both destructive and love/heart semantics). */}
          <button
            onClick={() => onFavOnlyChange(!favOnly)}
            aria-pressed={favOnly}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-chip border text-xs font-semibold transition-all",
              favOnly
                ? "border-zar-red/50 bg-zar-red/10 text-zar-red"
                : "border-border text-muted hover:border-zar-red/40 hover:text-zar-red",
            )}
          >
            <Heart className={cn("w-3 h-3", favOnly && "fill-zar-red")} />
            {t("favoritesOnly")}
          </button>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip border border-border text-xs text-muted hover:text-zar-red hover:border-zar-red/40 transition-colors"
            >
              <X className="w-3 h-3" />
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
