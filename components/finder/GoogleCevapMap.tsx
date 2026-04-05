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
// Discovery Mode (🏛️ FAB, bottom-left):
//   When ON, fetches tourist landmarks for the current map bounds and renders
//   them as smaller grey markers on a lower z-layer. Clicking a landmark opens
//   a minimal popup with name, rating, and a TripAdvisor link.
//
// Stack: @vis.gl/react-google-maps v1.7.1
// Loaded via dynamic({ ssr: false }) from RestaurantMap.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin, X, Star, ExternalLink } from "lucide-react";
import {
  getLandmarksForBounds,
  getTripAdvisorUrl,
  type Landmark,
} from "@/lib/actions/discovery";

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

// ── Landmark type icons ───────────────────────────────────────────────────────
function landmarkEmoji(types: string[]): string {
  if (types.includes("museum"))  return "🏛";
  if (types.includes("church"))  return "⛪";
  if (types.includes("mosque"))  return "🕌";
  if (types.includes("park"))    return "🌳";
  return "📍";
}

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

// ── BoundsTracker — fires onBoundsChange when map becomes idle ────────────────
// Computes center + radius from map bounds so the caller can fetch landmarks.
function BoundsTracker({
  enabled,
  onBoundsChange,
}: {
  enabled:        boolean;
  onBoundsChange: (lat: number, lng: number, radiusMeters: number) => void;
}) {
  const map         = useMap();
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  useEffect(() => {
    if (!map || !enabled) return;

    const compute = () => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      if (!bounds || !center) return;

      const ne   = bounds.getNorthEast();
      // Haversine: distance from center to NE corner (= visible radius)
      const R    = 6_371_000;
      const lat1 = center.lat() * (Math.PI / 180);
      const lat2 = ne.lat()     * (Math.PI / 180);
      const dLat = lat2 - lat1;
      const dLng = (ne.lng() - center.lng()) * (Math.PI / 180);
      const a    = Math.sin(dLat / 2) ** 2
                 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const dist = 2 * R * Math.asin(Math.sqrt(a));
      const radius = Math.min(dist, 50_000); // cap at 50 km

      callbackRef.current(center.lat(), center.lng(), radius);
    };

    // Fire once immediately, then on every "idle" (after pan/zoom settles)
    compute();
    const listener = map.addListener("idle", compute);
    return () => google.maps.event.removeListener(listener);
  }, [map, enabled]);

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

// ── Landmark mini-marker ──────────────────────────────────────────────────────
function LandmarkPin({ landmark, onClick }: { landmark: Landmark; onClick: () => void }) {
  return (
    <AdvancedMarker
      position={{ lat: landmark.lat, lng: landmark.lng }}
      onClick={onClick}
      title={landmark.name}
      zIndex={0}
    >
      <div
        style={{
          width:           24,
          height:          24,
          borderRadius:    "50%",
          background:      "rgba(190,190,190,0.82)",
          border:          "1.5px solid rgba(160,160,160,0.9)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          fontSize:        11,
          cursor:          "pointer",
          boxShadow:       "0 1px 5px rgba(0,0,0,0.35)",
          transition:      "transform 0.12s ease",
          backdropFilter:  "blur(4px)",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.25)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {landmarkEmoji(landmark.types)}
      </div>
    </AdvancedMarker>
  );
}

// ── Landmark popup (absolute overlay) ────────────────────────────────────────
function LandmarkPopup({
  landmark,
  onClose,
}: {
  landmark: Landmark;
  onClose:  () => void;
}) {
  const tripUrl = getTripAdvisorUrl(landmark.name);
  return (
    <div
      style={{
        position:       "absolute",
        bottom:         72,
        left:           "50%",
        transform:      "translateX(-50%)",
        zIndex:         20,
        width:          260,
        borderRadius:   14,
        background:     "rgba(20,18,16,0.94)",
        border:         "1px solid rgba(255,255,255,0.10)",
        padding:        "14px 14px 12px",
        boxShadow:      "0 8px 32px rgba(0,0,0,0.6)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position:   "absolute",
          top:        8,
          right:      8,
          background: "none",
          border:     "none",
          cursor:     "pointer",
          color:      "rgba(180,170,160,0.8)",
          padding:    2,
        }}
      >
        <X size={14} />
      </button>

      {/* Landmark type badge */}
      <div style={{ fontSize: 9, color: "#a09070", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 }}>
        {landmarkEmoji(landmark.types)}&nbsp;
        {landmark.types.find(t => ["museum","church","park","tourist_attraction"].includes(t))?.replace("_"," ") ?? "Atrakcija"}
      </div>

      {/* Name */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f0e8", lineHeight: 1.3, marginBottom: 6, paddingRight: 20 }}>
        {landmark.name}
      </div>

      {/* Rating row */}
      {landmark.rating !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f5f0e8" }}>{landmark.rating.toFixed(1)}</span>
          <span style={{ fontSize: 11, color: "#8a7a68" }}>
            ({landmark.userRatingCount >= 1000
              ? `${(landmark.userRatingCount / 1000).toFixed(1)}k`
              : landmark.userRatingCount} ocjena)
          </span>
        </div>
      )}

      {/* Vicinity */}
      {landmark.vicinity && (
        <div style={{ fontSize: 11, color: "#7a6a58", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {landmark.vicinity}
        </div>
      )}

      {/* TripAdvisor CTA */}
      <a
        href={tripUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            6,
          padding:        "8px 12px",
          borderRadius:   8,
          background:     "rgba(0,170,75,0.15)",
          border:         "1px solid rgba(0,170,75,0.3)",
          color:          "#34d399",
          fontSize:       11,
          fontWeight:     600,
          textDecoration: "none",
          transition:     "background 0.15s",
        }}
      >
        <ExternalLink size={11} />
        Vidi na TripAdvisor-u
      </a>
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

  // ── Discovery Mode ─────────────────────────────────────────────────────────
  const [discoveryMode,     setDiscoveryMode]     = useState(false);
  const [landmarks,         setLandmarks]         = useState<Landmark[]>([]);
  const [landmarksLoading,  setLandmarksLoading]  = useState(false);
  const [selectedLandmark,  setSelectedLandmark]  = useState<Landmark | null>(null);

  const handleBoundsChange = useCallback(async (lat: number, lng: number, radius: number) => {
    setLandmarksLoading(true);
    const results = await getLandmarksForBounds(lat, lng, radius);
    setLandmarks(results);
    setLandmarksLoading(false);
  }, []);

  // Clear landmarks + popup when discovery mode is turned off
  const toggleDiscovery = () => {
    setDiscoveryMode(prev => {
      if (prev) { setLandmarks([]); setSelectedLandmark(null); }
      return !prev;
    });
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
          onClick={() => setSelectedLandmark(null)}
        >
          <BoundsUpdater restaurants={restaurants} />
          <BoundsTracker enabled={discoveryMode} onBoundsChange={handleBoundsChange} />

          {/* ── Landmark markers — lower z-index, smaller, grey ────────── */}
          {discoveryMode && landmarks.map((lm) => (
            <LandmarkPin
              key={lm.id}
              landmark={lm}
              onClick={() => setSelectedLandmark(prev => prev?.id === lm.id ? null : lm)}
            />
          ))}

          {/* ── Restaurant pin markers — click opens full profile modal ── */}
          {mapped.map((r) => {
            const key    = r.id ?? r.fsq_id ?? r.name;
            const isDb   = r.source === "supabase";
            const dimmed = !!activeStyle && !!r.style && r.style !== activeStyle;

            return (
              <AdvancedMarker
                key={key}
                position={{ lat: r.latitude as number, lng: r.longitude as number }}
                onClick={() => { setSelectedLandmark(null); onOpenProfile?.(r); }}
                title={r.name}
                zIndex={5}
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

      {/* ── Floating style filter (top-right) ────────────────────────────── */}
      <MapStyleFilter active={activeStyle} onChange={handleStyleChange} />

      {/* ── Discovery Mode FAB (bottom-left) ─────────────────────────────── */}
      <button
        onClick={toggleDiscovery}
        title={discoveryMode ? "Isključi Discovery Mode" : "Uključi Discovery Mode"}
        style={{
          position:       "absolute",
          bottom:         16,
          left:           16,
          zIndex:         10,
          width:          40,
          height:         40,
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       18,
          cursor:         "pointer",
          backdropFilter: "blur(10px)",
          transition:     "all 0.2s ease",
          background:     discoveryMode
            ? "rgba(99,102,241,0.85)"
            : "rgba(16,14,12,0.82)",
          border:         discoveryMode
            ? "1px solid rgba(165,180,252,0.6)"
            : "1px solid rgba(255,255,255,0.10)",
          boxShadow:      discoveryMode
            ? "0 2px 16px rgba(99,102,241,0.5)"
            : "0 1px 5px rgba(0,0,0,0.45)",
        }}
      >
        {landmarksLoading ? (
          <span style={{ fontSize: 14, animation: "spin 0.8s linear infinite", display: "inline-block" }}>⟳</span>
        ) : "🏛️"}
      </button>

      {/* Loading hint text next to FAB */}
      {discoveryMode && (
        <div style={{
          position:       "absolute",
          bottom:         22,
          left:           64,
          zIndex:         10,
          background:     "rgba(16,14,12,0.82)",
          border:         "1px solid rgba(255,255,255,0.10)",
          borderRadius:   20,
          padding:        "4px 10px",
          fontSize:       10,
          color:          "rgba(180,170,160,0.9)",
          backdropFilter: "blur(10px)",
          whiteSpace:     "nowrap",
          pointerEvents:  "none",
        }}>
          {landmarksLoading
            ? "Učitavanje atrakcija…"
            : `${landmarks.length} atrakcija u vidnom polju`}
        </div>
      )}

      {/* ── Landmark popup ───────────────────────────────────────────────── */}
      {selectedLandmark && (
        <LandmarkPopup
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmark(null)}
        />
      )}

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
