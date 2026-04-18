"use client";

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
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 mb-5 space-y-3">

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))/0.6] pointer-events-none" />
          {placesLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FF6B00] animate-spin" />
          )}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pretraži po imenu..."
            className={cn(
              "w-full pl-9 pr-9 py-2 rounded-xl border text-sm transition-colors outline-none",
              "bg-[rgb(var(--background))]",
              "placeholder:text-[rgb(var(--muted))/0.5] text-[rgb(var(--foreground))]",
              searchTerm
                ? "border-[#FF6B00]/40"
                : "border-[rgb(var(--border))/0.7] focus:border-[rgb(var(--border))]",
            )}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-[rgb(var(--border))] overflow-hidden w-full sm:w-auto flex-shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[38px] py-2 text-sm font-medium transition-colors",
              viewMode === "grid"
                ? "bg-[rgb(var(--primary))] text-white"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]",
            )}
          >
            <List className="w-4 h-4" />
            <span>{t("listView")}</span>
          </button>
          <button
            onClick={() => onViewModeChange("map")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[38px] py-2 text-sm font-medium transition-colors border-l border-[rgb(var(--border))]",
              viewMode === "map"
                ? "bg-[rgb(var(--primary))] text-white"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]",
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

          {/* 🎡 Rulet — floating orange CTA, clearly separated from inputs */}
          <motion.button
            onClick={onOpenRulet}
            animate={{
              boxShadow: [
                "0 2px 10px rgba(232,78,15,0.25)",
                "0 2px 18px rgba(232,78,15,0.55)",
                "0 2px 10px rgba(232,78,15,0.25)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(232,78,15,0.5)] text-xs font-bold transition-all text-white"
            style={{
              background:    "linear-gradient(135deg, #E84E0F 0%, #F97316 100%)",
              fontFamily:    "Oswald, sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            🎡 RULET
          </motion.button>

          {/* 🧭 Istraži — TripAdvisor-green link to Community Explore tab */}
          <Link
            href={`/${locale}/community?tab=explore${locationValue.city ? `&search=${encodeURIComponent(locationValue.city)}` : ""}`}
            title="Istraži grad na TripAdvisoru i zajednici"
            aria-label="Istraži Community stranicu"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 text-white bg-[#00af87] hover:bg-[#008a6a] shadow-sm hover:shadow-md whitespace-nowrap"
            style={{ fontFamily: "Oswald, sans-serif", letterSpacing: "0.05em" }}
          >
            <Compass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">ISTRAŽI</span>
          </Link>

          {/* Favorites-only toggle */}
          <button
            onClick={() => onFavOnlyChange(!favOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
              favOnly
                ? "border-red-400/50 bg-red-400/10 text-red-400"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-red-400/40 hover:text-red-400",
            )}
          >
            <Heart className={cn("w-3 h-3", favOnly && "fill-red-400")} />
            {t("favoritesOnly")}
          </button>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))] hover:text-red-400 hover:border-red-400/40 transition-colors"
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
