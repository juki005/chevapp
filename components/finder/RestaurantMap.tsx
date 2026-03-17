"use client";

// ── SSR-safe wrapper ─────────────────────────────────────────────────────────
// @vis.gl/react-google-maps and the Google Maps JS API both access `window`
// on import, which crashes Next.js SSR.  `dynamic(..., { ssr: false })`
// ensures the component is only loaded in the browser.
//
// This file is the public API — import THIS one everywhere; never import
// GoogleCevapMap directly.
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
  restaurants: MapRestaurant[];
  height?:     string;
  selectedId?: string | null;
  onSelect?:   (id: string | null) => void;
}

export function RestaurantMap({ restaurants, height = "500px", selectedId, onSelect }: Props) {
  return (
    // suppressHydrationWarning: the Google Maps script injects <style> tags into
    // the DOM after hydration; without this React emits a harmless but noisy
    // hydration-mismatch warning for the container div.
    <div suppressHydrationWarning>
      <GoogleCevapMap restaurants={restaurants} height={height} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

export type { MapRestaurant };
