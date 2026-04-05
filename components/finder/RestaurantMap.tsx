"use client";

// ── SSR-safe wrapper ─────────────────────────────────────────────────────────
// @vis.gl/react-google-maps accesses `window` on import — crashes Next.js SSR.
// dynamic({ ssr: false }) ensures it only loads in the browser.
//
// Import THIS file everywhere; never import GoogleCevapMap directly.
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
        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] flex flex-col items-center justify-center gap-3"
        style={{ height: "500px" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
        <p className="text-sm text-[rgb(var(--muted))]">Učitavanje Google Maps karte...</p>
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
}

export function RestaurantMap({ restaurants, height, activeStyle, onStyleChange, onOpenProfile, defaultCenter, initialDiscoveryMode, showStyleFilter }: Props) {
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
      />
    </div>
  );
}

export type { MapRestaurant };
