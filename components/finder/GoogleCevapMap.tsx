"use client";

// ── GoogleCevapMap.tsx ────────────────────────────────────────────────────────
// Google Maps integration for the Cevap Finder.
//
// Pin click fires onOpenProfile(r: MapRestaurant) directly — no InfoWindow.
// The caller (finder/page.tsx) opens RestaurantDetailModal which handles
// both DB restaurants (via id) and Google Places (via fsq_id / google_place_id).
//
// Floating style-filter overlay (top-right) is synced with the main StyleFilter.
//
// Stack: @vis.gl/react-google-maps v1.7.1
// Loaded via dynamic({ ssr: false }) from RestaurantMap.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

// ── Public types ──────────────────────────────────────────────────────────────
export interface MapRestaurant {
  id?:             string;
  fsq_id?:         string;
  name:            string;
  city:            string;
  address:         string;
  latitude:        number | null;
  longitude:       number | null;
  lepinja_rating?: number;
  is_verified?:    boolean;
  tags?:           string[];
  style?:          string;
  source?:         "supabase" | "foursquare" | "google";
}

interface Props {
  restaurants:    MapRestaurant[];
  height?:        string;
  activeStyle?:   string | null;
  onStyleChange?: (style: string) => void;
  onOpenProfile?: (r: MapRestaurant) => void;
}

// ── Style metadata ────────────────────────────────────────────────────────────
const STYLE_PILLS = [
  { value: "",           label: "Sve",        emoji: "🔥", color: "#e65100" },
  { value: "Sarajevski", label: "Sarajevski", emoji: "🕌", color: "#e65100" },
  { value: "Banjalučki", label: "Banjalučki", emoji: "🌊", color: "#2563eb" },
  { value: "Travnički",  label: "Travnički",  emoji: "⛰️", color: "#16a34a" },
  { value: "Leskovački", label: "Leskovački", emoji: "🌶️", color: "#dc2626" },
  { value: "Ostalo",     label: "Ostalo",     emoji: "🔥", color: "#6b7280" },
];

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ── Charcoal dark map style ───────────────────────────────────────────────────
const CHARCOAL_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",            stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#a09880" }] },

  { featureType: "landscape",           elementType: "geometry",           stylers: [{ color: "#222018" }] },
  { featureType: "landscape.man_made",  elementType: "geometry",           stylers: [{ color: "#252220" }] },

  { featureType: "road",                elementType: "geometry",           stylers: [{ color: "#2e2b27" }] },
  { featureType: "road",                elementType: "geometry.stroke",    stylers: [{ color: "#3a3630" }] },
  { featureType: "road",                elementType: "labels.text.fill",   stylers: [{ color: "#7a7060" }] },
  { featureType: "road.highway",        elementType: "geometry",           stylers: [{ color: "#3c3530" }] },
  { featureType: "road.highway",        elementType: "geometry.stroke",    stylers: [{ color: "#4a4540" }] },
  { featureType: "road.highway",        elementType: "labels.text.fill",   stylers: [{ color: "#c9b99a" }] },

  { featureType: "water",               elementType: "geometry",           stylers: [{ color: "#162030" }] },
  { featureType: "water",               elementType: "labels.text.fill",   stylers: [{ color: "#3d5a7a" }] },
  { featureType: "water",               elementType: "labels.text.stroke", stylers: [{ color: "#162030" }] },

  { featureType: "poi",                 elementType: "geometry",           stylers: [{ color: "#252220" }] },
  { featureType: "poi",                 elementType: "labels.text.fill",   stylers: [{ color: "#5a5248" }] },
  { featureType: "poi.park",            elementType: "geometry",           stylers: [{ color: "#1c261c" }] },
  { featureType: "poi.park",            elementType: "labels.text.fill",   stylers: [{ color: "#4a6040" }] },
  { featureType: "poi",                 elementType: "labels.icon",        stylers: [{ visibility: "off" }] },

  { featureType: "transit",             elementType: "geometry",           stylers: [{ color: "#2a2725" }] },
  { featureType: "transit.station",     elementType: "labels.text.fill",   stylers: [{ color: "#6a6258" }] },

  { featureType: "administrative",      elementType: "geometry",           stylers: [{ color: "#3a3530" }] },
  { featureType: "administrative.country",  elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c9b99a" }] },
];

// ── BoundsUpdater ─────────────────────────────────────────────────────────────
function BoundsUpdater({ restaurants }: { restaurants: MapRestaurant[] }) {
  const map          = useMap();
  const prevCountRef = useRef(0);

  useEffect(() => {
    const valid = restaurants.filter((r) => r.latitude != null && r.longitude != null);
    if (!map || valid.length === 0 || valid.length === prevCountRef.current) return;
    prevCountRef.current = valid.length;

    const lats = valid.map((r) => r.latitude as number);
    const lngs = valid.map((r) => r.longitude as number);
    map.fitBounds(
      { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) },
      56
    );
    if (valid.length === 1) map.setZoom(14);
  }, [map, restaurants]);

  return null;
}

// ── Floating map style filter ─────────────────────────────────────────────────
function MapStyleFilter({ active, onChange }: { active: string; onChange: (s: string) => void }) {
  return (
    <div style={{
      position:      "absolute",
      top:           12,
      right:         12,
      zIndex:        10,
      display:       "flex",
      flexDirection: "column",
      gap:           4,
    }}>
      {STYLE_PILLS.map(({ value, label, emoji, color }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={(e) => { e.stopPropagation(); onChange(value); }}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            5,
              padding:        "5px 10px 5px 7px",
              borderRadius:   999,
              background:     isActive ? color : "rgba(16,14,12,0.82)",
              border:         `1px solid ${isActive ? color : "rgba(255,255,255,0.10)"}`,
              color:          isActive ? "#fff" : "#b0a898",
              fontSize:       11,
              fontWeight:     isActive ? 700 : 500,
              cursor:         "pointer",
              backdropFilter: "blur(10px)",
              boxShadow:      isActive ? `0 2px 12px ${color}55` : "0 1px 5px rgba(0,0,0,0.45)",
              transition:     "all 0.15s ease",
              whiteSpace:     "nowrap",
            }}
          >
            <span style={{ fontSize: 13 }}>{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoogleCevapMap({
  restaurants,
  height        = "500px",
  activeStyle:  controlledStyle,
  onStyleChange,
  onOpenProfile,
}: Props) {
  const [internalStyle, setInternalStyle] = useState<string>("");

  const activeStyle       = controlledStyle !== undefined ? (controlledStyle ?? "") : internalStyle;
  const handleStyleChange = (s: string) => {
    setInternalStyle(s);
    onStyleChange?.(s);
  };

  const mapped = restaurants.filter((r) => r.latitude != null && r.longitude != null);

  // ── API key guard ─────────────────────────────────────────────────────────
  if (!API_KEY) {
    return (
      <div
        style={{ height }}
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-3 text-center px-6"
      >
        <MapPin className="w-10 h-10 text-amber-400 opacity-60" />
        <p className="font-semibold text-amber-300" style={{ fontFamily: "Oswald, sans-serif" }}>
          Google Maps API ključ nije postavljen
        </p>
        <p className="text-xs text-[rgb(var(--muted))] max-w-xs">
          Dodaj{" "}
          <code className="px-1 py-0.5 rounded bg-[rgb(var(--surface))] text-amber-300">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…
          </code>{" "}
          u <code className="px-1 py-0.5 rounded bg-[rgb(var(--surface))] text-amber-300">.env.local</code>{" "}
          i ponovo pokreni dev server.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ height, width: "100%", position: "relative" }}
      className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] z-0"
    >
      <APIProvider apiKey={API_KEY}>
        <Map
          mapId="9a4d0b5aaa7f88a18d6286ed"
          defaultCenter={{ lat: 44.1, lng: 17.9 }}
          defaultZoom={mapped.length === 0 ? 6 : 8}
          styles={CHARCOAL_STYLE}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl
          zoomControl
          gestureHandling="cooperative"
        >
          <BoundsUpdater restaurants={restaurants} />

          {/* ── Pin markers — click opens full profile modal ────────────── */}
          {mapped.map((r) => {
            const key    = r.id ?? r.fsq_id ?? r.name;
            const isDb   = r.source === "supabase";
            const dimmed = !!activeStyle && !!r.style && r.style !== activeStyle;

            return (
              <AdvancedMarker
                key={key}
                position={{ lat: r.latitude as number, lng: r.longitude as number }}
                onClick={() => onOpenProfile?.(r)}
                title={r.name}
              >
                <div style={{ opacity: dimmed ? 0.3 : 1, transition: "opacity 0.2s" }}>
                  <Pin
                    background={isDb ? "#e65100" : "#4285f4"}
                    borderColor={isDb ? "#bf360c" : "#1a73e8"}
                    glyphColor={isDb ? "#fff8f0" : "#ffffff"}
                  />
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* ── Floating style filter ─────────────────────────────────────────── */}
      <MapStyleFilter active={activeStyle} onChange={handleStyleChange} />

      {/* ── Empty-state overlay ───────────────────────────────────────────── */}
      {mapped.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgb(var(--surface)/0.9)] z-10 rounded-2xl pointer-events-none">
          <span className="text-5xl mb-3">🗺️</span>
          <p className="text-[rgb(var(--foreground))] font-semibold text-base">
            Nema lokacija za prikaz
          </p>
          <p className="text-[rgb(var(--muted))] text-sm mt-1 text-center max-w-xs px-4">
            Upiši naziv grada ili pretražuj restorane da se prikažu markeri.
          </p>
        </div>
      )}
    </div>
  );
}
