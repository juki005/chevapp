"use client";

// ── RestaurantMapClient · finder (Sprint 26ah · DS-migrated) ──────────────────
// react-leaflet-based map for restaurant pins. Loaded only via dynamic
// import (ssr: false) from RestaurantMap.tsx — Leaflet reads `window` on
// import.
//
// Sprint 26ah changes:
//   - All rgb(var(--token)) Tailwind classes → semantic aliases.
//   - Inline <style> block CSS-var fallbacks removed (rgb(var(--surface,
//     30 27 24)) etc.) — same latent mode-mismatch fix as GastroMapClient
//     Sprint 26v and SafeMap Sprint 26ag. Hardcoded hex was Ugljen-only.
//   - Tag chip primary/0.15 + /text-primary → primary/15 + text-primary
//     (semantic aliases, same opacity).
//   - Source badge "via Foursquare" blue-400 kept as documented external-
//     source categorical marker (precedent: Foursquare blue in SafeMap
//     Sprint 26ag, TripAdvisor green, Spotify green).
//   - "Mapa →" link text-blue-400 → text-blue-400 kept (deliberate
//     external-link-affordance hue, matching the source-badge palette).
//   - 🗺️ empty-state + 📍 / 🔥 popup emoji tagged TODO(icons) +
//     aria-hidden where appropriate.
//   - rounded-2xl → rounded-card.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️  This file is ONLY loaded via dynamic import (ssr: false) from RestaurantMap.tsx
// Never import it directly — Leaflet accesses `window` on import.

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
// ✅ Critical: without this Leaflet renders a 0-height white box
import "leaflet/dist/leaflet.css";
import { LepinjaRating } from "@/components/ui/LepinjaRating";

// ── Fix Leaflet's default icon path (broken by webpack asset hashing) ───────
// We point directly to Leaflet's CDN copy so no /public copy is needed.
const ICON_BASE = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images";
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
});

// Custom orange pin for verified restaurants
const ORANGE_ICON = new L.Icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  // Tint via CSS class applied below in the marker element
  className: "leaflet-marker-orange",
});

// Foursquare result marker (grey/blue, unverified)
const FSQ_ICON = new L.Icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  className: "leaflet-marker-fsq",
});

// ── Auto-fit bounds when restaurants list changes ────────────────────────────
function FitBounds({ restaurants }: { restaurants: MapRestaurant[] }) {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    const valid = restaurants.filter(
      (r) => r.latitude != null && r.longitude != null
    );
    if (valid.length === 0 || valid.length === prevLen.current) return;
    prevLen.current = valid.length;

    const bounds = L.latLngBounds(
      valid.map((r) => [r.latitude as number, r.longitude as number])
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [restaurants, map]);

  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface MapRestaurant {
  id?: string;
  fsq_id?: string;
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  lepinja_rating?: number;
  is_verified?: boolean;
  tags?: string[];
  source?: "supabase" | "foursquare";
}

interface Props {
  restaurants: MapRestaurant[];
  height?: string;
}

// ── Map component ────────────────────────────────────────────────────────────
export default function RestaurantMapClient({
  restaurants,
  height = "500px",
}: Props) {
  const mapped = restaurants.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  // Default centre — Balkans midpoint
  const defaultCenter: [number, number] = [44.1, 17.9];
  const defaultZoom = mapped.length === 0 ? 6 : 8;

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-card overflow-hidden border border-border relative z-0"
    >
      {/* Inline style: marker tints + popup theme. CSS variables are
          guaranteed defined by globals.css — fallbacks removed (Sprint
          26v / 26ag pattern, were Ugljen-only and a latent mode-mismatch
          trap if they ever fired). */}
      <style>{`
        .leaflet-marker-orange { filter: hue-rotate(168deg) saturate(2) brightness(1.1); }
        .leaflet-marker-fsq    { filter: hue-rotate(200deg) saturate(0.7) brightness(0.9); opacity: 0.75; }
        .leaflet-popup-content-wrapper {
          background: rgb(var(--surface));
          color: rgb(var(--foreground));
          border: 1px solid rgb(var(--border));
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .leaflet-popup-tip { background: rgb(var(--surface)); }
        .leaflet-popup-close-button { color: rgb(var(--muted)) !important; }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        {/* ✅ Free OpenStreetMap tiles — no API key required */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <FitBounds restaurants={mapped} />

        {mapped.map((r, idx) => {
          const isFsq = r.source === "foursquare";
          const icon = isFsq ? FSQ_ICON : ORANGE_ICON;
          const key = r.id ?? r.fsq_id ?? `${r.name}-${idx}`;

          return (
            <Marker
              key={key}
              position={[r.latitude as number, r.longitude as number]}
              icon={icon}
            >
              <Popup maxWidth={240}>
                <div className="p-1 min-w-[180px]">
                  {/* Header — TODO(icons): swap 📍 / 🔥 for brand <Pin> / <Vatra> */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-lg leading-none" aria-hidden="true">
                      {isFsq ? "📍" : "🔥"}
                    </span>
                    <div>
                      <p
                        className="font-bold text-sm leading-snug"
                        style={{ fontFamily: "Oswald, sans-serif" }}
                      >
                        {r.name}
                      </p>
                      <p className="text-xs opacity-60">{r.city}</p>
                    </div>
                  </div>

                  {/* Address */}
                  {r.address && (
                    <p className="text-xs opacity-60 mb-2">{r.address}</p>
                  )}

                  {/* Rating (DB restaurants only) */}
                  {r.lepinja_rating != null && r.lepinja_rating > 0 && (
                    <div className="mb-2">
                      <LepinjaRating rating={r.lepinja_rating} size="sm" />
                    </div>
                  )}

                  {/* Tags */}
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source badge — Foursquare blue is a documented external-
                      source categorical marker (Sprint 26ag precedent). */}
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        isFsq
                          ? "border-blue-400/30 text-blue-400"
                          : "border-primary/40 text-primary"
                      }`}
                    >
                      {isFsq ? "via Foursquare" : "✓ Verificiran"}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Mapa →
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Empty state overlay */}
      {mapped.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/85 z-[1000] rounded-card">
          {/* TODO(icons): swap 🗺️ for brand <Karta> */}
          <span className="text-5xl mb-3" aria-hidden="true">🗺️</span>
          <p className="text-foreground font-semibold text-base">
            Nema lokacija za prikaz
          </p>
          <p className="text-muted text-sm mt-1 text-center max-w-xs px-4">
            Pokrenite Seed ili pretražite grad iznad da se učitaju markeri.
          </p>
        </div>
      )}
    </div>
  );
}
