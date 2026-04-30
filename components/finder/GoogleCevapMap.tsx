"use client";

// ── GoogleCevapMap.tsx · finder (Sprint 26ai · DS-migrated) ──────────────────
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
//
// Sprint 26ai changes (DS migration · closes maps cluster):
//   - PAGE-LEVEL surfaces migrated to DS tokens:
//     · API-key-missing fallback panel: amber-500 family → zar-red
//       (admin-attention pattern, consistent with RouteMapClient 26ah and
//       StatsTab 26n).
//     · Empty-state overlay rgb(var(--token)) chains → semantic aliases
//       (bg-surface/90, text-foreground, text-muted).
//     · Outer container rgb(var(--border)) → border-border.
//     · 1× inline Oswald → font-display.
//     · rounded-2xl → rounded-card.
//
//   - MAP-OVERLAY UI kept dark-locked (DOCUMENTED EXCEPTION):
//     The map renders with CHARCOAL_STYLE (Ugljen-locked theme — Google
//     Maps style API takes hex strings, can't read CSS variables; same
//     precedent as RouteMapClient's CHARCOAL_STYLE Sprint 26ah and
//     CevapSnake's retro C palette Sprint 26ac). All UI floating ON the
//     map (style filter pills, "Pretraži ovo područje" button, loading
//     pill, discovery FAB, discovery hint, landmark popup, landmark
//     mini-pins, marker pins, marker pin colors) stays in the dark
//     aesthetic for visual coherence with the map theme — they're integral
//     to the map surface, not page chrome.
//
//   - STYLE_PILLS palette (#e65100 / #2563eb / #16a34a / #dc2626 /
//     #6b7280) kept as categorical content markers per cevap-style —
//     same precedent as RestaurantCard per-style palette and QuickLogModal
//     style tints.
//
//   - Pin colours (#e65100 DB orange, #4285f4 Foursquare/Google blue) —
//     Google Pin API takes hex strings; same map-API-takes-hex pattern as
//     RouteMapClient.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,   // still used for landmark mini-markers
  useMap,
  useMapsLibrary,   // async library loader for imperative marker API
} from "@vis.gl/react-google-maps";
import { MapPin, X, Star, ExternalLink } from "lucide-react";
import {
  getLandmarksForBounds,
  type Landmark,
} from "@/lib/actions/discovery";
import { getTripAdvisorUrl } from "@/lib/tripadvisor";

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
  restaurants:           MapRestaurant[];
  height?:               string;
  activeStyle?:          string | null;
  onStyleChange?:        (style: string) => void;
  onOpenProfile?:        (r: MapRestaurant) => void;
  defaultCenter?:        { lat: number; lng: number };
  initialDiscoveryMode?: boolean;
  showStyleFilter?:      boolean;
  /** Called when user clicks "Pretraži ovo područje" after panning the map */
  onSearchArea?:         (lat: number, lng: number) => void;
  /** Show a loading pill while the area append search is in-flight */
  searchingArea?:        boolean;
}

// ── Style metadata ────────────────────────────────────────────────────────────
// Categorical content markers — per-cevap-style palette. DS doesn't have 5
// mutually-distinct hues for chrome roles, same precedent as RestaurantCard
// per-style palette + QuickLogModal style tints + CmsTab event tags.
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
// STYLISTIC-THEME EXCEPTION: Google Maps style API takes hex, can't read
// CSS variables. Map locked dark in both Ugljen + Somun for marker
// readability. Same precedent as CevapSnake C palette + RouteMapClient.
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

// ── ImperativeMarkers ─────────────────────────────────────────────────────────
// Wipes and rebuilds every marker whenever `restaurants` changes identity.
// Because finder/page.tsx memoizes mapPins with useMemo, this only fires when
// the underlying data actually changes (new search, load-more, style filter).
//
// Bounds:
//   • Initial city-selected load → skip; CenterUpdater owns zoom-13
//   • Count grew (Load More)     → fitBounds so new pins are visible
//   • Count same or fell         → skip; CenterUpdater handles city zoom
function ImperativeMarkers({
  restaurants,
  locked,
  activeStyle,
  onOpenProfile,
}: {
  restaurants:   MapRestaurant[];
  locked:        boolean;
  activeStyle:   string;
  onOpenProfile: ((r: MapRestaurant) => void) | undefined;
}) {
  const map                = useMap();
  const markerLib          = useMapsLibrary("marker");
  const markersRef         = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const prevCountRef       = useRef(0);
  const onOpenProfileRef   = useRef(onOpenProfile);
  onOpenProfileRef.current = onOpenProfile;

  useEffect(() => {
    // Wait until both the map instance AND the marker library are ready
    if (!map || !markerLib) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[ImperativeMarkers] waiting →", { map: !!map, markerLib: !!markerLib });
      }
      return;
    }

    const { AdvancedMarkerElement, PinElement } = markerLib;

    // ── 1. Atomically wipe all existing markers ───────────────────────────────
    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current = [];

    const valid = restaurants.filter(
      (r) => typeof r.latitude === "number" && typeof r.longitude === "number",
    );

    if (process.env.NODE_ENV !== "production") {
      console.log(`[ImperativeMarkers] ${valid.length}/${restaurants.length} pins ready`);
    }

    if (valid.length === 0) {
      prevCountRef.current = 0;
      return;
    }

    const grew     = valid.length > prevCountRef.current;
    prevCountRef.current = valid.length;

    const bounds = new google.maps.LatLngBounds();

    // ── 2. Rebuild every marker ───────────────────────────────────────────────
    valid.forEach((r, idx) => {
      try {
        const lat  = r.latitude  as number;
        const lng  = r.longitude as number;
        const isDb = r.source === "supabase";
        const dim  = !!activeStyle && !!r.style && r.style !== activeStyle;

        // First 3 pins logged in dev so you can verify coords in the console
        if (process.env.NODE_ENV !== "production" && idx < 3) {
          console.log(`  pin[${idx}]`, { name: r.name, lat, lng, source: r.source });
        }

        // Pin colours: orange (#e65100) for DB, Google-brand-blue (#4285f4)
        // for external (Foursquare/Google). Map-API hex literals — same
        // exception pattern as RouteMapClient pins (Sprint 26ah).
        const pin = new PinElement({
          background:  isDb ? "#e65100" : "#4285f4",
          borderColor: isDb ? "#bf360c" : "#1a73e8",
          glyphColor:  isDb ? "#fff8f0" : "#ffffff",
        });
        if (dim) {
          (pin.element as HTMLElement).style.opacity    = "0.3";
          (pin.element as HTMLElement).style.transition = "opacity 0.2s";
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat, lng },
          title:    r.name,
          content:  pin.element,
          zIndex:   5,
        });
        marker.addListener("click", () => onOpenProfileRef.current?.(r));

        markersRef.current.push(marker);
        bounds.extend({ lat, lng });
      } catch (err) {
        console.error("[ImperativeMarkers] marker creation failed:", err, r);
      }
    });

    // ── 3. Fit bounds only when no city is locked (discovery/no-city mode) ───
    // When a city IS selected (locked=true), CenterUpdater owns zoom+pan.
    // Never re-fit on Load More or Search Area — that causes the yo-yo snap.
    if (grew && !locked && !bounds.isEmpty()) {
      map.fitBounds(bounds, 56);
      if (valid.length === 1) map.setZoom(14);
    }

    return () => {
      markersRef.current.forEach((m) => { m.map = null; });
      markersRef.current = [];
    };
  // onOpenProfile is intentionally omitted — we use the ref pattern above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerLib, restaurants, locked, activeStyle]);

  return null;
}

// ── CenterUpdater — imperatively re-centers when city changes ─────────────────
function CenterUpdater({ center }: { center: { lat: number; lng: number } | undefined }) {
  const map       = useMap();
  const prevRef   = useRef<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    if (!map || !center) return;
    if (prevRef.current?.lat === center.lat && prevRef.current?.lng === center.lng) return;
    prevRef.current = center;
    map.panTo(center);
    map.setZoom(13);
  }, [map, center]);

  return null;
}

// ── BoundsTracker — fires onBoundsChange when map becomes idle ────────────────
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
      const R    = 6_371_000;
      const lat1 = center.lat() * (Math.PI / 180);
      const lat2 = ne.lat()     * (Math.PI / 180);
      const dLat = lat2 - lat1;
      const dLng = (ne.lng() - center.lng()) * (Math.PI / 180);
      const a    = Math.sin(dLat / 2) ** 2
                 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const dist = 2 * R * Math.asin(Math.sqrt(a));
      const radius = Math.min(dist, 50_000);

      callbackRef.current(center.lat(), center.lng(), radius);
    };

    compute();
    const listener = map.addListener("idle", compute);
    return () => google.maps.event.removeListener(listener);
  }, [map, enabled]);

  return null;
}

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180))
             * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── MapDriftTracker ───────────────────────────────────────────────────────────
const DRIFT_THRESHOLD_KM = 3;

function MapDriftTracker({
  homeCenter,
  onDrift,
  onHome,
}: {
  homeCenter: { lat: number; lng: number } | undefined;
  onDrift:    (lat: number, lng: number) => void;
  onHome:     () => void;
}) {
  const map        = useMap();
  const driftRef   = useRef(onDrift);
  const homeRef    = useRef(onHome);
  driftRef.current = onDrift;
  homeRef.current  = onHome;

  useEffect(() => {
    if (!map || !homeCenter) {
      homeRef.current();
      return;
    }

    const listener = map.addListener("idle", () => {
      const center = map.getCenter();
      if (!center) return;
      const dist = haversineKm(center.lat(), center.lng(), homeCenter.lat, homeCenter.lng);
      if (dist > DRIFT_THRESHOLD_KM) {
        driftRef.current(center.lat(), center.lng());
      } else {
        homeRef.current();
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, homeCenter]);

  return null;
}

// ── Floating map style filter ─────────────────────────────────────────────────
// MAP-OVERLAY EXCEPTION: floats over CHARCOAL_STYLE dark map; inline styles
// kept dark-locked for visual coherence (see header).
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
            {/* TODO(icons): style-pill emojis are categorical content markers */}
            <span style={{ fontSize: 13 }} aria-hidden="true">{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Landmark mini-marker (MAP-OVERLAY EXCEPTION) ──────────────────────────────
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
        aria-hidden="true"
      >
        {landmarkEmoji(landmark.types)}
      </div>
    </AdvancedMarker>
  );
}

// ── Landmark popup (MAP-OVERLAY EXCEPTION — dark-locked over dark map) ───────
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
        aria-label="Zatvori"
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
        <span aria-hidden="true">{landmarkEmoji(landmark.types)}</span>&nbsp;
        {landmark.types.find(t => ["museum","church","park","tourist_attraction"].includes(t))?.replace("_"," ") ?? "Atrakcija"}
      </div>

      {/* Name */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f0e8", lineHeight: 1.3, marginBottom: 6, paddingRight: 20, fontFamily: "Oswald, sans-serif" }}>
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

      {/* TripAdvisor CTA — kept brand green (external-brand exception,
          same precedent as TripAdvisor green in FinderFilterBar 26j). */}
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
  height               = "500px",
  activeStyle:         controlledStyle,
  onStyleChange,
  onOpenProfile,
  defaultCenter,
  initialDiscoveryMode = false,
  showStyleFilter      = true,
  onSearchArea,
  searchingArea        = false,
}: Props) {
  const hasCityCenter = !!defaultCenter;
  const [internalStyle, setInternalStyle] = useState<string>("");

  const [searchAreaTarget, setSearchAreaTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleDrift = useCallback((lat: number, lng: number) => {
    if (onSearchArea) setSearchAreaTarget({ lat, lng });
  }, [onSearchArea]);

  const handleHome = useCallback(() => setSearchAreaTarget(null), []);

  const activeStyle       = controlledStyle !== undefined ? (controlledStyle ?? "") : internalStyle;
  const handleStyleChange = (s: string) => {
    setInternalStyle(s);
    onStyleChange?.(s);
  };

  // ── Discovery Mode ─────────────────────────────────────────────────────────
  const [discoveryMode,     setDiscoveryMode]     = useState(initialDiscoveryMode);
  const [landmarks,         setLandmarks]         = useState<Landmark[]>([]);
  const [landmarksLoading,  setLandmarksLoading]  = useState(false);
  const [selectedLandmark,  setSelectedLandmark]  = useState<Landmark | null>(null);

  const handleBoundsChange = useCallback(async (lat: number, lng: number, radius: number) => {
    setLandmarksLoading(true);
    const results = await getLandmarksForBounds(lat, lng, radius);
    setLandmarks(results);
    setLandmarksLoading(false);
  }, []);

  const toggleDiscovery = () => {
    setDiscoveryMode(prev => {
      if (prev) { setLandmarks([]); setSelectedLandmark(null); }
      return !prev;
    });
  };

  const mapped = restaurants.filter((r) => r.latitude != null && r.longitude != null);

  // ── API key guard — PAGE-LEVEL fallback (no map rendered) ─────────────────
  // zar-red admin-attention pattern (consistent with RouteMapClient 26ah +
  // StatsTab 26n — DS has no warning-amber slot).
  if (!API_KEY) {
    return (
      <div
        style={{ height }}
        className="rounded-card border border-zar-red/30 bg-zar-red/5 flex flex-col items-center justify-center gap-3 text-center px-6"
      >
        <MapPin className="w-10 h-10 text-zar-red opacity-60" />
        <p className="font-display font-semibold text-zar-red">
          Google Maps API ključ nije postavljen
        </p>
        <p className="text-xs text-muted max-w-xs">
          Dodaj{" "}
          <code className="px-1 py-0.5 rounded bg-surface text-zar-red">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…
          </code>{" "}
          u <code className="px-1 py-0.5 rounded bg-surface text-zar-red">.env.local</code>{" "}
          i ponovo pokreni dev server.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ height, width: "100%", position: "relative" }}
      className="rounded-card overflow-hidden border border-border z-0"
    >
      <APIProvider apiKey={API_KEY}>
        <Map
          mapId="9a4d0b5aaa7f88a18d6286ed"
          defaultCenter={defaultCenter ?? { lat: 44.1, lng: 17.9 }}
          defaultZoom={
            hasCityCenter          ? 13 :
            initialDiscoveryMode   ? 13 :
            mapped.length === 0    ?  6 : 8
          }
          styles={CHARCOAL_STYLE}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl
          zoomControl
          gestureHandling="cooperative"
          onClick={() => setSelectedLandmark(null)}
        >
          <CenterUpdater center={defaultCenter} />

          <ImperativeMarkers
            restaurants={restaurants}
            locked={hasCityCenter}
            activeStyle={activeStyle}
            onOpenProfile={(r) => { setSelectedLandmark(null); onOpenProfile?.(r); }}
          />

          <BoundsTracker enabled={discoveryMode} onBoundsChange={handleBoundsChange} />
          <MapDriftTracker
            homeCenter={defaultCenter}
            onDrift={handleDrift}
            onHome={handleHome}
          />

          {/* Landmark markers — lower z-index, smaller, grey */}
          {discoveryMode && landmarks.map((lm) => (
            <LandmarkPin
              key={lm.id}
              landmark={lm}
              onClick={() => setSelectedLandmark(prev => prev?.id === lm.id ? null : lm)}
            />
          ))}
        </Map>
      </APIProvider>

      {/* ── Floating style filter (top-right) — MAP-OVERLAY EXCEPTION ────── */}
      {showStyleFilter && <MapStyleFilter active={activeStyle} onChange={handleStyleChange} />}

      {/* ── "Pretražujem…" loading pill — MAP-OVERLAY EXCEPTION ──────────── */}
      {searchingArea && !searchAreaTarget && (
        <div
          style={{
            position:  "absolute",
            top:       12,
            left:      "50%",
            transform: "translateX(-50%)",
            zIndex:    10,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            7,
              padding:        "9px 18px",
              borderRadius:   999,
              background:     "rgba(16,14,12,0.88)",
              border:         "1px solid rgba(255,107,0,0.35)",
              color:          "#FF6B00",
              fontSize:       13,
              fontWeight:     700,
              backdropFilter: "blur(12px)",
              boxShadow:      "0 4px 20px rgba(0,0,0,0.5)",
              whiteSpace:     "nowrap",
            }}
          >
            <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }} aria-hidden="true">⟳</span>
            {" "}Pretražujem područje…
          </div>
        </div>
      )}

      {/* ── "Pretraži ovo područje" — MAP-OVERLAY EXCEPTION ──────────────── */}
      {searchAreaTarget && onSearchArea && (
        <div
          style={{
            position:  "absolute",
            top:       12,
            left:      "50%",
            transform: "translateX(-50%)",
            zIndex:    10,
          }}
        >
          <button
            onClick={() => {
              onSearchArea(searchAreaTarget.lat, searchAreaTarget.lng);
              setSearchAreaTarget(null);
            }}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            7,
              padding:        "9px 18px",
              borderRadius:   999,
              background:     "rgba(16,14,12,0.88)",
              border:         "1px solid rgba(255,107,0,0.55)",
              color:          "#FF6B00",
              fontSize:       13,
              fontWeight:     700,
              cursor:         "pointer",
              backdropFilter: "blur(12px)",
              boxShadow:      "0 4px 20px rgba(0,0,0,0.5)",
              whiteSpace:     "nowrap",
              transition:     "all 0.15s ease",
              letterSpacing:  "0.02em",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,107,0,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,14,12,0.88)")}
          >
            {/* TODO(icons): swap 🔍 for brand <Search> */}
            <span aria-hidden="true">🔍</span> Pretraži ovo područje
          </button>
        </div>
      )}

      {/* ── Discovery Mode FAB (bottom-left) — MAP-OVERLAY EXCEPTION ────── */}
      <button
        onClick={toggleDiscovery}
        title={discoveryMode ? "Isključi Discovery Mode" : "Uključi Discovery Mode"}
        aria-label={discoveryMode ? "Isključi Discovery Mode" : "Uključi Discovery Mode"}
        aria-pressed={discoveryMode}
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
        {/* TODO(icons): swap 🏛️ for brand <Discovery> / <Atrakcija> */}
        {landmarksLoading ? (
          <span style={{ fontSize: 14, animation: "spin 0.8s linear infinite", display: "inline-block" }} aria-hidden="true">⟳</span>
        ) : <span aria-hidden="true">🏛️</span>}
      </button>

      {/* Loading hint text next to FAB — MAP-OVERLAY EXCEPTION */}
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

      {/* Landmark popup */}
      {selectedLandmark && (
        <LandmarkPopup
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmark(null)}
        />
      )}

      {/* ── Empty-state overlay — PAGE-LEVEL surface (mode-aware) ─────────── */}
      {mapped.length === 0 && !initialDiscoveryMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 z-10 rounded-card pointer-events-none">
          {/* TODO(icons): swap 🗺️ for brand <Karta> */}
          <span className="text-5xl mb-3" aria-hidden="true">🗺️</span>
          <p className="text-foreground font-semibold text-base">
            Nema lokacija za prikaz
          </p>
          <p className="text-muted text-sm mt-1 text-center max-w-xs px-4">
            Upiši naziv grada ili pretražuj restorane da se prikažu markeri.
          </p>
        </div>
      )}
    </div>
  );
}
