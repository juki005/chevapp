"use client";

// ── RestaurantMap · finder (Sprint 26ag · DS-migrated) ────────────────────────
// SSR-safe wrapper around GoogleCevapMap.
// @vis.gl/react-google-maps accesses `window` on import — crashes Next.js SSR.
// dynamic({ ssr: false }) ensures it only loads in the browser.
//
// Import THIS file everywhere; never import GoogleCevapMap directly.
//
// Sprint 26ag changes:
//   - Loading skeleton rgb(var(--token)) chains → semantic aliases
//     (bg-surface/40, border-border, text-primary, text-muted).
//   - rounded-2xl → rounded-card.
// ─────────────────────────────────────────────────────────────────────────────

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { MapRestaurant } from "./GoogleCevapMap";

const GoogleCevapMap = dynamic(
  () => import("./GoogleCevapMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-card border border-border bg-surface/40 flex flex-col items-center justify-center gap-3"
        style={{ height: "500px" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted">Učitavanje Google Maps karte...</p>
      </div>
    ),
  }
);

interface Props {
  restaurants:           MapRestaurant[];
  height?:               string;
  activeStyle?:          string | null;
  onStyleChange?:        (style: string) => void;
  onOpenProfile?:        (r: MapRestaurant) => void;
  defaultCenter?:        { lat: number; lng: number };
  initialDiscoveryMode?: boolean;
  showStyleFilter?:      boolean;
  onSearchArea?:         (lat: number, lng: number) => void;
  /** Show a loading pill while appendByCoords is in-flight */
  searchingArea?:        boolean;
}

export function RestaurantMap({ restaurants, height, activeStyle, onStyleChange, onOpenProfile, defaultCenter, initialDiscoveryMode, showStyleFilter, onSearchArea, searchingArea }: Props) {
  return (
    // suppressHydrationWarning: Google Maps injects <style> tags after hydration
    <div suppressHydrationWarning>
      <GoogleCevapMap
        restaurants={restaurants}
        height={height}
        activeStyle={activeStyle}
        onStyleChange={onStyleChange}
        onOpenProfile={onOpenProfile}
        defaultCenter={defaultCenter}
        initialDiscoveryMode={initialDiscoveryMode}
        showStyleFilter={showStyleFilter}
        onSearchArea={onSearchArea}
        searchingArea={searchingArea}
      />
    </div>
  );
}

export type { MapRestaurant };
