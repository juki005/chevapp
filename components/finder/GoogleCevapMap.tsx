"use client";

// ── GoogleCevapMap.tsx ────────────────────────────────────────────────────────
// Google Maps integration for the Cevap Finder.
//
// Stack:
//   @vis.gl/react-google-maps  — official React bindings for Google Maps JS API
//   APIProvider                — loads the Maps JS script once, handles errors
//   Map                        — renders the map with a custom charcoal style
//   AdvancedMarker + Pin       — one per restaurant (orange = DB, blue = Places)
//   InfoWindow                 — React-rendered popup with full restaurant card
//   BoundsUpdater              — inner component; auto-fits the viewport on data change
//
// Env var: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
// This file is loaded via dynamic({ ssr: false }) from RestaurantMap.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

export interface MapRestaurant {
  id?: string;
  fsq_id?: string;
  name: string;
  city: string;
  address: string;
  latitude:  number | null;
  longitude: number | null;
  lepinja_rating?: number;
  is_verified?: boolean;
  tags?: string[];
  source?: "supabase" | "foursquare" | "google";
}

interface Props {
  restaurants:  MapRestaurant[];
  height?:      string;
  selectedId?:  string | null;
  onSelect?:    (id: string | null) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ── Charcoal dark map style ───────────────────────────────────────────────────
// Hand-tuned to match the app's #1e1b18 background + #e65100 accent palette.
const CHARCOAL_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",            stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#a09880" }] },

  { featureType: "landscape",            elementType: "geometry",            stylers: [{ color: "#222018" }] },
  { featureType: "landscape.man_made",   elementType: "geometry",            stylers: [{ color: "#252220" }] },

  { featureType: "road",                 elementType: "geometry",            stylers: [{ color: "#2e2b27" }] },
  { featureType: "road",                 elementType: "geometry.stroke",     stylers: [{ color: "#3a3630" }] },
  { featureType: "road",                 elementType: "labels.text.fill",    stylers: [{ color: "#7a7060" }] },
  { featureType: "road.highway",         elementType: "geometry",            stylers: [{ color: "#3c3530" }] },
  { featureType: "road.highway",         elementType: "geometry.stroke",     stylers: [{ color: "#4a4540" }] },
  { featureType: "road.highway",         elementType: "labels.text.fill",    stylers: [{ color: "#c9b99a" }] },

  { featureType: "water",                elementType: "geometry",            stylers: [{ color: "#162030" }] },
  { featureType: "water",                elementType: "labels.text.fill",    stylers: [{ color: "#3d5a7a" }] },
  { featureType: "water",                elementType: "labels.text.stroke",  stylers: [{ color: "#162030" }] },

  { featureType: "poi",                  elementType: "geometry",            stylers: [{ color: "#252220" }] },
  { featureType: "poi",                  elementType: "labels.text.fill",    stylers: [{ color: "#5a5248" }] },
  { featureType: "poi.park",             elementType: "geometry",            stylers: [{ color: "#1c261c" }] },
  { featureType: "poi.park",             elementType: "labels.text.fill",    stylers: [{ color: "#4a6040" }] },
  { featureType: "poi",                  elementType: "labels.icon",         stylers: [{ visibility: "off" }] },

  { featureType: "transit",              elementType: "geometry",            stylers: [{ color: "#2a2725" }] },
  { featureType: "transit.station",      elementType: "labels.text.fill",    stylers: [{ color: "#6a6258" }] },

  { featureType: "administrative",       elementType: "geometry",            stylers: [{ color: "#3a3530" }] },
  { featureType: "administrative.country",   elementType: "labels.text.fill",stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality",  elementType: "labels.text.fill",stylers: [{ color: "#c9b99a" }] },
];

// ── BoundsUpdater ─────────────────────────────────────────────────────────────
// Child component that has access to the live Map instance via useMap().
// Fits viewport to all visible pins whenever the restaurants list changes.
function BoundsUpdater({ restaurants }: { restaurants: MapRestaurant[] }) {
  const map         = useMap();
  const prevCountRef = useRef(0);

  useEffect(() => {
    const valid = restaurants.filter(
      (r) => r.latitude != null && r.longitude != null
    );
    if (!map || valid.length === 0 || valid.length === prevCountRef.current) return;
    prevCountRef.current = valid.length;

    // Compute a LatLngBoundsLiteral — no google.maps.LatLngBounds constructor needed.
    const lats = valid.map((r) => r.latitude as number);
    const lngs = valid.map((r) => r.longitude as number);
    map.fitBounds(
      {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east:  Math.max(...lngs),
        west:  Math.min(...lngs),
      },
      /* padding */ 56
    );
    // Prevent over-zoom on a single result
    if (valid.length === 1) {
      map.setZoom(14);
    }
  }, [map, restaurants]);

  return null;
}

// ── InfoWindow content ────────────────────────────────────────────────────────
function PlaceCard({ r }: { r: MapRestaurant }) {
  const isGoogle = r.source === "google";
  const isFsq    = r.source === "foursquare";
  const isDb     = !isGoogle && !isFsq;
  const flames   = r.lepinja_rating
    ? "🔥".repeat(r.lepinja_rating) + "🩶".repeat(5 - r.lepinja_rating)
    : "";
  const mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;

  return (
    <div style={{ minWidth: 200, maxWidth: 260, fontFamily: "system-ui, sans-serif" }}>
      {/* Name + badge */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{isDb ? "🔥" : "📍"}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, lineHeight: "1.3", fontFamily: "Oswald, sans-serif" }}>
            {r.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>{r.city}</p>
        </div>
        <span style={{
          fontSize: 9, padding: "2px 8px", borderRadius: 999, border: "1px solid",
          borderColor: isDb ? "rgba(230,81,0,.4)" : "rgba(66,133,244,.4)",
          color: isDb ? "#e65100" : "#4285f4",
          whiteSpace: "nowrap",
        }}>
          {isDb ? "✓ Verificiran" : isGoogle ? "Google" : "Foursquare"}
        </span>
      </div>

      {/* Address */}
      {r.address && (
        <p style={{ margin: "0 0 6px", fontSize: 11, opacity: 0.6 }}>{r.address}</p>
      )}

      {/* Lepinja rating (DB only) */}
      {flames && (
        <p style={{ margin: "0 0 6px", fontSize: 15 }}>{flames}</p>
      )}

      {/* Tags */}
      {(r.tags ?? []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {(r.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 999,
              background: "rgba(230,81,0,.15)", color: "#e65100",
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Google Maps link */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", fontSize: 11, color: "#4285f4", textDecoration: "none", marginTop: 2 }}
      >
        Otvori na Google Maps →
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoogleCevapMap({ restaurants, height = "500px", selectedId, onSelect }: Props) {
  const [internalKey, setInternalKey] = useState<string | null>(null);
  // Use controlled key when provided, otherwise fall back to internal state
  const selectedKey    = selectedId !== undefined ? (selectedId ?? null) : internalKey;
  const setSelectedKey = (key: string | null) => {
    setInternalKey(key);
    onSelect?.(key);
  };

  const mapped = restaurants.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  const selectedRestaurant = mapped.find(
    (r) => (r.id ?? r.fsq_id ?? r.name) === selectedKey
  ) ?? null;

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
      style={{ height, width: "100%" }}
      className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] relative z-0"
    >
      {/* Override Google Maps InfoWindow chrome to match dark theme */}
      <style>{`
        .gm-style-iw-c {
          background: #1e1b18 !important;
          padding: 14px !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.55) !important;
        }
        .gm-style-iw-tc::after { background: #1e1b18 !important; }
        .gm-style-iw-d { overflow: visible !important; }
        .gm-ui-hover-effect > span { background-color: #a09880 !important; }
        .gm-style-iw-chr { padding: 0 !important; }
        .gm-style-iw-chr button.gm-ui-hover-effect {
          top: 0 !important; right: 0 !important;
          width: 28px !important; height: 28px !important;
        }
      `}</style>

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
          onClick={() => setSelectedKey(null)}
        >
          {/* Auto-fit bounds when data arrives */}
          <BoundsUpdater restaurants={restaurants} />

          {/* ── Markers ────────────────────────────────────────────────── */}
          {mapped.map((r) => {
            const key   = r.id ?? r.fsq_id ?? r.name;
            const isDb  = r.source === "supabase";
            return (
              <AdvancedMarker
                key={key}
                position={{ lat: r.latitude as number, lng: r.longitude as number }}
                onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                title={r.name}
              >
                <Pin
                  background={isDb ? "#e65100" : "#4285f4"}
                  borderColor={isDb ? "#bf360c" : "#1a73e8"}
                  glyphColor={isDb ? "#fff8f0" : "#ffffff"}
                />
              </AdvancedMarker>
            );
          })}

          {/* ── InfoWindow ─────────────────────────────────────────────── */}
          {selectedRestaurant && (
            <InfoWindow
              position={{
                lat: selectedRestaurant.latitude as number,
                lng: selectedRestaurant.longitude as number,
              }}
              onCloseClick={() => setSelectedKey(null)}
              pixelOffset={[0, -42]}
            >
              <PlaceCard r={selectedRestaurant} />
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Empty-state overlay */}
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
