"use client";

import { motion } from "framer-motion";
import { Search, Map, List, Loader2, ChevronDown, Heart, X, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { StyleFilter } from "@/components/finder/StyleFilter";
import { COUNTRY_DISPLAY } from "@/constants/cities";
import type { CevapStyle } from "@/types";
import { cn } from "@/lib/utils";

interface FinderFilterBarProps {
  // Search
  searchTerm:         string;
  onSearchChange:     (v: string) => void;
  placesLoading:      boolean;
  // Country
  selectedCountry:    string;
  onCountryChange:    (v: string) => void;
  availableCountries: string[];
  // City
  selectedCity:       string;
  onCityChange:       (v: string) => void;
  availableCities:    string[];
  // Geolocation
  onGeolocate:        () => void;
  geolocating:        boolean;
  // View mode
  viewMode:           "grid" | "map";
  onViewModeChange:   (v: "grid" | "map") => void;
  // Style filter
  activeStyle:        CevapStyle | "";
  onStyleChange:      (v: CevapStyle | "") => void;
  // Extras
  favOnly:            boolean;
  onFavOnlyChange:    (v: boolean) => void;
  hasActiveFilters:   boolean;
  onClearFilters:     () => void;
  onOpenRulet:        () => void;
}

export function FinderFilterBar({
  searchTerm, onSearchChange, placesLoading,
  selectedCountry, onCountryChange, availableCountries,
  selectedCity, onCityChange, availableCities,
  onGeolocate, geolocating,
  viewMode, onViewModeChange,
  activeStyle, onStyleChange,
  favOnly, onFavOnlyChange,
  hasActiveFilters, onClearFilters,
  onOpenRulet,
}: FinderFilterBarProps) {
  const t = useTranslations("finder");

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 mb-5 space-y-3">

      {/* Row 1: search box + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Name / city search + 📍 button */}
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))] pointer-events-none" />
            {placesLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--primary))] animate-spin" />
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors text-sm"
            />
          </div>

          {/* 📍 Geolocation button */}
          <button
            onClick={onGeolocate}
            disabled={geolocating}
            title="Koristi moju lokaciju"
            className={cn(
              "flex-shrink-0 flex items-center justify-center w-[44px] rounded-xl border text-sm font-medium transition-all",
              geolocating
                ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.08)] text-[rgb(var(--primary))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.06)]"
            )}
          >
            {geolocating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Navigation className="w-4 h-4" />
            }
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-[rgb(var(--border))] overflow-hidden w-full sm:w-auto flex-shrink-0 self-start sm:self-auto">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[44px] py-2.5 text-sm font-medium transition-colors",
              viewMode === "grid"
                ? "bg-[rgb(var(--primary))] text-white"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <List className="w-4 h-4" />
            <span>{t("listView")}</span>
          </button>
          <button
            onClick={() => onViewModeChange("map")}
            className={cn(
              "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[44px] py-2.5 text-sm font-medium transition-colors border-l border-[rgb(var(--border))]",
              viewMode === "map"
                ? "bg-[rgb(var(--primary))] text-white"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <Map className="w-4 h-4" />
            <span>{t("mapView")}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Country → City cascade */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Country dropdown */}
        <div className="relative sm:w-52 flex-shrink-0">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))] pointer-events-none" />
          <select
            value={selectedCountry}
            onChange={(e) => {
              onCountryChange(e.target.value);
              // Reset city when country changes
              if (e.target.value !== selectedCountry) onCityChange("");
            }}
            className={cn(
              "w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border bg-[rgb(var(--background))] text-sm transition-colors outline-none",
              selectedCountry
                ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--foreground))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
            )}
          >
            <option value="">🌍 Sve države</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>{COUNTRY_DISPLAY[c] ?? c}</option>
            ))}
          </select>
        </div>

        {/* City dropdown — filtered by selected country */}
        <div className="relative sm:w-44 flex-shrink-0">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))] pointer-events-none" />
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className={cn(
              "w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border bg-[rgb(var(--background))] text-sm transition-colors outline-none",
              selectedCity
                ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--foreground))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
            )}
          >
            <option value="">{t("allCities")}</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: style chips + action buttons */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <StyleFilter
          activeStyle={activeStyle}
          onStyleChange={(s) => onStyleChange(s as CevapStyle | "")}
        />

        <div className="flex items-center gap-2 flex-shrink-0 self-start mt-0.5 flex-wrap">
          {/* 🎡 Rulet */}
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

          {/* Favorites-only toggle */}
          <button
            onClick={() => onFavOnlyChange(!favOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
              favOnly
                ? "border-red-400/50 bg-red-400/10 text-red-400"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-red-400/40 hover:text-red-400"
            )}
          >
            <Heart className={cn("w-3 h-3", favOnly && "fill-red-400")} />
            {t("favoritesOnly")}
          </button>

          {/* Clear filters */}
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
