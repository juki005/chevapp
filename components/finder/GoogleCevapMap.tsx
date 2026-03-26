"use client";

// ── GoogleCevapMap.tsx ────────────────────────────────────────────────────────
// Custom-themed Google Maps for the Cevap Finder.
//
// Features:
//   • Per-style thematic markers (emoji + style colour + pointer triangle)
//   • Verified green dot badge on marker
//   • Dim/highlight based on active style filter
//   • Rich dark InfoWindow card (name, rating, style, tags, CTA buttons)
//   • Floating style-filter overlay (top-right of map)
//
// Stack: @vis.gl/react-google-maps v1.7.1
// Loaded via dynamic({ ssr: false }) from RestaurantMap.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

// ── Public types ──────────────────────────────────────────────────────────────
export interface MapRestaurant {
  id?:           string;
  fsq_id?:       string;
  name:          string;
  city:          string;
  address:       string;
  latitude:      number | null;
  longitude:     number | null;
  lepinja_rating?: number;
  is_verified?:  boolean;
  tags?:         string[];
  style?:        string;
  source?:       "supabase" | "foursquare" | "google";
}

interface Props {
  restaurants:    MapRestaurant[];
  height?:        string;
  selectedId?:    string | null;
  onSelect?:      (id: string | null) => void;
  activeStyle?:   string | null;
  onStyleChange?: (style: string) => void;
  onOpenProfile?: (id: string) => void;
}

// ── Style metadata ────────────────────────────────────────────────────────────
const STYLE_META: Record<string, { color: string; emoji: string }> = {
  Sarajevski:   { color: "#e65100", emoji: "🕌" },
  "Banjalučki": { color: "#2563eb", emoji: "🌊" },
  "Travnički":  { color: "#16a34a", emoji: "⛰️" },
  "Leskovački": { color: "#dc2626", emoji: "🌶️" },
  Ostalo:       { color: "#6b7280", emoji: "🔥" },
};
const GOOGLE_META = { color: "#4285f4", emoji: "📍" };
const DEFAULT_META = { color: "#e65100", emoji: "🔥" };

function getStyleMeta(style?: string | null, isGoogle?: boolean) {
  if (isGoogle) return GOOGLE_META;
  return (style && STYLE_META[style]) ? STYLE_META[style] : DEFAULT_META;
}

const STYLE_PILLS = [
  { value: "",            label: "Sve",        emoji: "🔥", color: "#e65100" },
  { value: "Sarajevski",  label: "Sarajevski", emoji: "🕌", color: "#e65100" },
  { value: "Banjalučki",  label: "Banjalučki", emoji: "🌊", color: "#2563eb" },
  { value: "Travnički",   label: "Travnički",  emoji: "⛰️", color: "#16a34a" },
  { value: "Leskovački",  label: "Leskovački", emoji: "🌶️", color: "#dc2626" },
  { value: "Ostalo",      label: "Ostalo",     emoji: "🔥", color: "#6b7280" },
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

// ── Custom thematic marker ────────────────────────────────────────────────────
function CevapMarker({
  r,
  isSelected,
  isDimmed,
}: {
  r:          MapRestaurant;
  isSelected: boolean;
  isDimmed:   boolean;
}) {
  const isGoogle = r.source === "google";
  const { color, emoji } = getStyleMeta(r.style, isGoogle);
  const size = isSelected ? 40 : 34;

  return (
    <div style={{
      display:        "inline-flex",
      flexDirection:  "column",
      alignItems:     "center",
      opacity:        isDimmed ? 0.28 : 1,
      transition:     "opacity 0.2s ease, transform 0.15s ease",
      transform:      isSelected ? "scale(1.15) translateY(-2px)" : "scale(1)",
      cursor:         "pointer",
      filter:         isSelected ? `drop-shadow(0 0 8px ${color}99)` : undefined,
    }}>
      {/* Circle badge */}
      <div style={{
        width:          size,
        height:         size,
        borderRadius:   "50%",
        background:     color,
        border:         `2.5px solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.35)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       isSelected ? 20 : 17,
        boxShadow:      isSelected
          ? `0 0 0 4px ${color}40, 0 6px 20px rgba(0,0,0,0.6)`
          : "0 2px 10px rgba(0,0,0,0.5)",
        position:       "relative",
        flexShrink:     0,
      }}>
        {emoji}

        {/* Verified green dot */}
        {r.is_verified && (
          <div style={{
            position:     "absolute",
            top:          -2,
            right:        -2,
            width:        12,
            height:       12,
            borderRadius: "50%",
            background:   "#22c55e",
            border:       "2px solid #161412",
          }} />
        )}
      </div>

      {/* Pointer triangle */}
      <div style={{
        width:        0,
        height:       0,
        borderLeft:   "5px solid transparent",
        borderRight:  "5px solid transparent",
        borderTop:    `6px solid ${color}`,
        marginTop:    -1,
      }} />
    </div>
  );
}

// ── Rich InfoWindow card ──────────────────────────────────────────────────────
function PlaceCard({
  r,
  onOpenProfile,
}: {
  r:               MapRestaurant;
  onOpenProfile?:  () => void;
}) {
  const isDb     = r.source === "supabase";
  const isGoogle = r.source === "google";
  const { color, emoji } = getStyleMeta(r.style, isGoogle);
  const lepinji  = r.lepinja_rating ?? 0;
  const mapsUrl  = `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`;

  return (
    <div style={{
      width:       260,
      fontFamily:  "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background:   `linear-gradient(135deg, ${color}25 0%, transparent 65%)`,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding:      "14px 14px 10px",
        display:      "flex",
        gap:          10,
        alignItems:   "flex-start",
      }}>
        <div style={{
          width:          42,
          height:         42,
          borderRadius:   12,
          background:     `${color}22`,
          border:         `1px solid ${color}38`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       22,
          flexShrink:     0,
        }}>
          {emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <p style={{
              margin:       0,
              fontWeight:   700,
              fontSize:     14,
              fontFamily:   "Oswald, sans-serif",
              color:        "#f0ece4",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
              maxWidth:     155,
              lineHeight:   1.2,
            }}>
              {r.name}
            </p>
            {r.is_verified && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="7" fill="#22c55e" />
                <path d="M4 7L6.5 9.5L10 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#6b6358" }}>
            📍 {r.city}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 14px 14px" }}>
        {/* Style / source badges */}
        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          {r.style && (
            <span style={{
              fontSize:   10,
              padding:    "2px 8px",
              borderRadius: 999,
              background: `${color}1a`,
              color:      color,
              border:     `1px solid ${color}38`,
              fontWeight: 600,
            }}>
              {r.style}
            </span>
          )}
          {isGoogle && (
            <span style={{
              fontSize:   10,
              padding:    "2px 8px",
              borderRadius: 999,
              background: "rgba(66,133,244,0.15)",
              color:      "#4285f4",
              border:     "1px solid rgba(66,133,244,0.28)",
              fontWeight: 600,
            }}>
              Google
            </span>
          )}
        </div>

        {/* Lepinja rating */}
        {lepinji > 0 && (
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} style={{ fontSize: 14, opacity: i <= lepinji ? 1 : 0.18 }}>🔥</span>
            ))}
          </div>
        )}

        {/* Tags */}
        {(r.tags ?? []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {(r.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} style={{
                fontSize:     10,
                padding:      "2px 7px",
                borderRadius: 999,
                background:   "rgba(255,255,255,0.07)",
                color:        "#9e9580",
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Address */}
        {r.address && (
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#5a5248", lineHeight: 1.4 }}>
            {r.address}
          </p>
        )}

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {isDb && onOpenProfile && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
              style={{
                flex:        1,
                padding:     "8px 0",
                borderRadius: 10,
                background:  color,
                color:       "#fff",
                border:      "none",
                cursor:      "pointer",
                fontSize:    11,
                fontWeight:  700,
                fontFamily:  "Oswald, sans-serif",
                letterSpacing: "0.06em",
              }}
            >
              OTVORI PROFIL
            </button>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex:           isDb ? "0 0 auto" : 1,
              padding:        isDb ? "8px 12px" : "8px 0",
              borderRadius:   10,
              background:     "rgba(255,255,255,0.08)",
              color:          "#c0b0a0",
              border:         "1px solid rgba(255,255,255,0.1)",
              cursor:         "pointer",
              fontSize:       11,
              fontWeight:     600,
              textDecoration: "none",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            4,
              whiteSpace:     "nowrap",
            }}
          >
            🧭 Kreni
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Floating map style filter ─────────────────────────────────────────────────
function MapStyleFilter({
  active,
  onChange,
}: {
  active:   string;
  onChange: (s: string) => void;
}) {
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
              padding:        "4px 10px 4px 7px",
              borderRadius:   999,
              background:     isActive ? color : "rgba(16,14,12,0.80)",
              border:         `1px solid ${isActive ? color : "rgba(255,255,255,0.10)"}`,
              color:          isActive ? "#fff" : "#b0a898",
              fontSize:       11,
              fontWeight:     isActive ? 700 : 500,
              cursor:         "pointer",
              backdropFilter: "blur(10px)",
              boxShadow:      isActive
                ? `0 2px 12px ${color}55`
                : "0 1px 5px rgba(0,0,0,0.45)",
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
  selectedId,
  onSelect,
  activeStyle: controlledStyle,
  onStyleChange,
  onOpenProfile,
}: Props) {
  const [internalKey,   setInternalKey]   = useState<string | null>(null);
  const [internalStyle, setInternalStyle] = useState<string>("");

  const selectedKey    = selectedId !== undefined ? (selectedId ?? null) : internalKey;
  const setSelectedKey = (key: string | null) => {
    setInternalKey(key);
    onSelect?.(key);
  };

  // Controlled or internal style
  const activeStyle    = controlledStyle !== undefined ? (controlledStyle ?? "") : internalStyle;
  const handleStyleChange = (s: string) => {
    setInternalStyle(s);
    onStyleChange?.(s);
  };

  const mapped = restaurants.filter((r) => r.latitude != null && r.longitude != null);

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
      style={{ height, width: "100%", position: "relative" }}
      className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] z-0"
    >
      {/* InfoWindow chrome overrides */}
      <style>{`
        .gm-style-iw-c {
          background: #161412 !important;
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 36px rgba(0,0,0,.7) !important;
          max-width: none !important;
        }
        .gm-style-iw-tc::after {
          background: #161412 !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
        }
        .gm-style-iw-chr {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          z-index: 2 !important;
          padding: 0 !important;
        }
        .gm-style-iw-chr button.gm-ui-hover-effect {
          width: 22px !important;
          height: 22px !important;
          opacity: 0.55 !important;
        }
        .gm-ui-hover-effect > span {
          background-color: #a09880 !important;
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
          <BoundsUpdater restaurants={restaurants} />

          {/* ── Thematic markers ─────────────────────────────────────────── */}
          {mapped.map((r) => {
            const key      = r.id ?? r.fsq_id ?? r.name;
            const isSelected = key === selectedKey;
            const isDimmed   = !!activeStyle && !!r.style && r.style !== activeStyle;

            return (
              <AdvancedMarker
                key={key}
                position={{ lat: r.latitude as number, lng: r.longitude as number }}
                onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                title={r.name}
                zIndex={isSelected ? 100 : undefined}
              >
                <CevapMarker r={r} isSelected={isSelected} isDimmed={isDimmed} />
              </AdvancedMarker>
            );
          })}

          {/* ── InfoWindow ───────────────────────────────────────────────── */}
          {selectedRestaurant && (
            <InfoWindow
              position={{
                lat: selectedRestaurant.latitude  as number,
                lng: selectedRestaurant.longitude as number,
              }}
              onCloseClick={() => setSelectedKey(null)}
              pixelOffset={[0, -50]}
            >
              <PlaceCard
                r={selectedRestaurant}
                onOpenProfile={
                  selectedRestaurant.id
                    ? () => {
                        onOpenProfile?.(selectedRestaurant.id!);
                        setSelectedKey(null);
                      }
                    : undefined
                }
              />
            </InfoWindow>
          )}
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
