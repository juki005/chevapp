"use client";

// ── RouteMapClient · finder (Sprint 26ah · DS-migrated) ──────────────────────
// Google Maps component for the Gastro Route Planner.
//
// Features:
//   - Calls google.maps.DirectionsService when searchArgs change
//   - Draws the actual road route as an orange polyline
//   - Decodes the full overview_polyline into lat/lng points
//   - Filters DB restaurants using google.maps.geometry.poly.isLocationOnEdge
//     (tolerance = radiusKm / 111.32 degrees) — follows road curves exactly
//   - Falls back to pure-JS distanceToPolylineKm if geometry lib isn't ready
//   - Reports accurate perpendicular distanceKm for each matched restaurant
//   - Passes the FULL decoded path to onRoutePoints so the parent can also run
//     distanceToPolylineKm for Places API results
//   - Drops green (origin), red (destination), and orange (restaurant) markers
//   - Auto-zooms to fit the full route + all found restaurants
//   - Falls back to straight-line if Directions API returns an error
//
// Loaded via dynamic({ ssr: false }) from RouteMap.tsx.
//
// Sprint 26ah changes (DS migration):
//   - CHARCOAL_STYLE Google Maps style array kept as Ugljen-locked
//     stylistic theme — Google Maps doesn't read CSS variables, the
//     hex values are baked into the API config. Same retro-game-aesthetic
//     exception precedent as CevapSnake's C palette (Sprint 26ac). The
//     map is intentionally dark in both Ugljen and Somun modes so the
//     route line + markers stay visible against a consistent backdrop.
//   - Pin colors (#22c55e green origin, #ef4444 red destination, #e65100
//     orange restaurant + #bf360c border) kept inline — Google Pin
//     component takes raw hex strings, not Tailwind classes. These are
//     categorical positional markers paired with the dark map theme.
//   - Polyline #e65100 stroke kept inline (same — Google Polyline API).
//   - InfoWindow CSS overrides kept dark-locked to match the dark map.
//     Documented exception (same as the CHARCOAL_STYLE).
//   - "Otvori na Google Maps →" link kept #4285f4 (Google brand blue,
//     matches the InfoWindow's external-link affordance).
//   - API-key-missing fallback panel: amber-500 family → zar-red token
//     family (DS admin-attention pattern, consistent with StatsTab
//     "Pending" card Sprint 26n and other warning surfaces).
//   - Directions-error banner: bg-amber-500/90 → bg-zar-red (warning
//     state, white text on red for guaranteed contrast).
//   - Hint overlay: bg-[rgb(var(--surface)/0.88)] → bg-surface/90;
//     broken text-fg / text-fg-muted aliases (silently fell back to
//     defaults) → text-foreground / text-muted (correct DS tokens).
//   - 2× inline Oswald → font-display.
//   - 🗺️ hint emoji + ⚠️ error banner emoji tagged TODO(icons) +
//     aria-hidden.
//   - rounded-2xl → rounded-card; rounded-xl → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { decodePolyline, distanceToPolylineKm } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import type { Restaurant } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ── Charcoal dark map style (matches the rest of the app) ─────────────────────
// STYLISTIC-THEME EXCEPTION: Google Maps style API takes hex strings, can't
// read CSS variables. Same precedent as CevapSnake's retro C palette (26ac).
// Map stays dark-locked in both Ugljen and Somun modes for marker readability.
const CHARCOAL_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",            stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1e1b18" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#a09880" }] },
  { featureType: "landscape",           elementType: "geometry",           stylers: [{ color: "#222018" }] },
  { featureType: "road",                elementType: "geometry",           stylers: [{ color: "#2e2b27" }] },
  { featureType: "road",                elementType: "geometry.stroke",    stylers: [{ color: "#3a3630" }] },
  { featureType: "road",                elementType: "labels.text.fill",   stylers: [{ color: "#7a7060" }] },
  { featureType: "road.highway",        elementType: "geometry",           stylers: [{ color: "#3c3530" }] },
  { featureType: "road.highway",        elementType: "geometry.stroke",    stylers: [{ color: "#4a4540" }] },
  { featureType: "road.highway",        elementType: "labels.text.fill",   stylers: [{ color: "#c9b99a" }] },
  { featureType: "water",               elementType: "geometry",           stylers: [{ color: "#162030" }] },
  { featureType: "water",               elementType: "labels.text.fill",   stylers: [{ color: "#3d5a7a" }] },
  { featureType: "poi",                 elementType: "geometry",           stylers: [{ color: "#252220" }] },
  { featureType: "poi",                 elementType: "labels.text.fill",   stylers: [{ color: "#5a5248" }] },
  { featureType: "poi",                 elementType: "labels.icon",        stylers: [{ visibility: "off" }] },
  { featureType: "transit",             elementType: "geometry",           stylers: [{ color: "#2a2725" }] },
  { featureType: "administrative",      elementType: "geometry",           stylers: [{ color: "#3a3530" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c9b99a" }] },
];

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RouteRestaurant extends Restaurant { distanceKm: number; }

export interface SearchArgs {
  coordsA:        [number, number];
  coordsB:        [number, number];
  radiusKm:       number;
  allRestaurants: Restaurant[];
}

interface Props {
  height?:          string;
  searchArgs:       SearchArgs | null;
  onSearchComplete: (restaurants: RouteRestaurant[]) => void;
  /** Fires once the polyline is decoded — gives parent the actual road sample points */
  onRoutePoints?:   (points: Array<{ lat: number; lng: number }>) => void;
}

// ── Inner component (lives inside Map context) ────────────────────────────────
function RouteMapInner({ searchArgs, onSearchComplete, onRoutePoints }: Omit<Props, "height">) {
  const map         = useMap();
  // useMapsLibrary ensures the library JS is loaded before we instantiate its classes.
  const routesLib   = useMapsLibrary("routes");
  // geometry lib → gives us poly.isLocationOnEdge for curved-road filtering
  const geometryLib = useMapsLibrary("geometry");
  // Keep geometry lib in a ref so finalize() (async closure) always reads latest value
  const geometryRef = useRef<google.maps.GeometryLibrary | null>(null);
  useEffect(() => { geometryRef.current = geometryLib; }, [geometryLib]);

  const polyRef   = useRef<google.maps.Polyline | null>(null);
  const searchRef = useRef<SearchArgs | null>(null);

  const [restaurants,  setRestaurants]  = useState<RouteRestaurant[]>([]);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [directionsErr, setDirectionsErr] = useState<string | null>(null);

  useEffect(() => {
    // Wait for both the map instance and the routes library to be ready
    if (!map || !routesLib || !searchArgs) return;
    // StrictMode double-fire guard
    if (searchRef.current === searchArgs) return;
    searchRef.current = searchArgs;

    const { coordsA, coordsB, radiusKm, allRestaurants } = searchArgs;

    // Clear previous route + selections
    polyRef.current?.setMap(null);
    polyRef.current = null;
    setRestaurants([]);
    setSelectedId(null);
    setDirectionsErr(null);

    console.log("[RouteMap] Calling DirectionsService", { coordsA, coordsB, radiusKm });

    const svc = new routesLib.DirectionsService();

    // Promise form — avoids the old callback API which can silently drop in
    // newer Maps JS API versions loaded via @vis.gl/react-google-maps.
    svc.route({
      origin:      { lat: coordsA[0], lng: coordsA[1] },
      destination: { lat: coordsB[0], lng: coordsB[1] },
      travelMode:  routesLib.TravelMode.DRIVING,
    })
    .then((result) => {
      const routeCount  = result.routes?.length ?? 0;
      // overview_polyline is a plain string in @types/google.maps (browser API)
      const encoded     = result.routes?.[0]?.overview_polyline as string | undefined;
      console.log("[RouteMap] DirectionsService OK — routes:", routeCount,
        "| polyline length:", encoded?.length ?? 0);

      const route = result.routes?.[0];

      // Guard: empty routes array (ZERO_RESULTS delivered as a resolved promise in some API versions)
      if (!route || !encoded) {
        console.warn("[RouteMap] Resolved but no usable route — falling back to straight line");
        const fbPath: Array<{ lat: number; lng: number }> = [
          { lat: coordsA[0], lng: coordsA[1] },
          { lat: coordsB[0], lng: coordsB[1] },
        ];
        const fbBounds = new google.maps.LatLngBounds(
          { lat: Math.min(coordsA[0], coordsB[0]), lng: Math.min(coordsA[1], coordsB[1]) },
          { lat: Math.max(coordsA[0], coordsB[0]), lng: Math.max(coordsA[1], coordsB[1]) },
        );
        finalize(fbPath, fbBounds, coordsA, coordsB, allRestaurants, radiusKm);
        return;
      }

      const path = decodePolyline(encoded);

      // Draw the orange route polyline. Hex baked because Google Polyline
      // API takes a hex strokeColor — same map-API-takes-hex pattern as the
      // CHARCOAL_STYLE config and Pin background colors.
      const poly = new google.maps.Polyline({
        path,
        geodesic:      true,
        strokeColor:   "#e65100",
        strokeOpacity: 0.9,
        strokeWeight:  4,
      });
      poly.setMap(map);
      polyRef.current = poly;

      finalize(path, route.bounds, coordsA, coordsB, allRestaurants, radiusKm);
    })
    .catch((err: { code?: number; message?: string } | Error) => {
      // Google wraps DirectionsStatus errors as { code, message } objects
      const status = (err as { code?: number }).code ?? "UNKNOWN";
      const msg    = (err as Error).message ?? String(err);
      console.error("[RouteMap] DirectionsService FAILED — status:", status, "| message:", msg);
      console.info(
        "[RouteMap] Common causes:\n" +
        "  REQUEST_DENIED  → Directions API not enabled in Google Cloud Console\n" +
        "  NOT_FOUND       → Origin / destination not routable (try lat-lng coords)\n" +
        "  ZERO_RESULTS    → No driving route between the two points",
      );

      setDirectionsErr(String(status));

      // Fallback: straight-line corridor search so the list still works
      const fallbackPath: Array<{ lat: number; lng: number }> = [
        { lat: coordsA[0], lng: coordsA[1] },
        { lat: coordsB[0], lng: coordsB[1] },
      ];
      const fallbackBounds = new google.maps.LatLngBounds(
        { lat: Math.min(coordsA[0], coordsB[0]), lng: Math.min(coordsA[1], coordsB[1]) },
        { lat: Math.max(coordsA[0], coordsB[0]), lng: Math.max(coordsA[1], coordsB[1]) },
      );
      finalize(fallbackPath, fallbackBounds, coordsA, coordsB, allRestaurants, radiusKm);
    });

    function finalize(
      path:     Array<{ lat: number; lng: number }>,
      bounds:   google.maps.LatLngBounds,
      a:        [number, number],
      b:        [number, number],
      allRests: typeof allRestaurants,
      radius:   number,
    ) {
      // ── 1. Pass the FULL decoded path to the parent ───────────────────────
      onRoutePoints?.(path);

      // ── 2. Filter DB restaurants against the actual road polyline ─────────
      const geom = geometryRef.current;
      const toleranceDeg = radius / 111.32;

      const seen = new Set<string>();
      const filtered: RouteRestaurant[] = [];

      for (const r of allRests) {
        if (r.latitude == null || r.longitude == null || seen.has(r.id)) continue;

        let onRoute: boolean;
        if (geom) {
          const gmPoly = new google.maps.Polyline({ path });
          onRoute = geom.poly.isLocationOnEdge(
            new google.maps.LatLng(r.latitude, r.longitude),
            gmPoly,
            toleranceDeg,
          );
        } else {
          onRoute = distanceToPolylineKm(r.latitude, r.longitude, path) <= radius;
        }

        if (onRoute) {
          seen.add(r.id);
          const distKm = distanceToPolylineKm(r.latitude, r.longitude, path);
          filtered.push({ ...r, distanceKm: Math.round(distKm * 10) / 10 });
        }
      }

      filtered.sort((a, b) => a.distanceKm - b.distanceKm);

      console.log(
        "[RouteMap]", geom ? "isLocationOnEdge ✓" : "distanceToPolylineKm (fallback)",
        "→", filtered.length, "restaurants within", radius, "km of",
        path.length, "decoded polyline points",
      );

      setRestaurants(filtered);
      onSearchComplete(filtered);

      // ── 3. Auto-zoom ──────────────────────────────────────────────────────
      const fitBounds = new google.maps.LatLngBounds();
      fitBounds.union(bounds);
      filtered.forEach((r) => {
        if (r.latitude != null && r.longitude != null) {
          fitBounds.extend({ lat: r.latitude, lng: r.longitude });
        }
      });
      fitBounds.extend({ lat: a[0], lng: a[1] });
      fitBounds.extend({ lat: b[0], lng: b[1] });
      map?.fitBounds(fitBounds, 56);
    }

    return () => { polyRef.current?.setMap(null); polyRef.current = null; };
  }, [map, routesLib, searchArgs, onSearchComplete]);

  const selectedR = restaurants.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      {/* Directions API error banner — DS admin-attention zar-red token,
          fully-saturated for a visible warning state (not the soft /5 tint
          used for passive pending-status). */}
      {directionsErr && (
        <div
          style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}
          className="flex items-center gap-2 px-3 py-2 rounded-chip bg-zar-red/90 text-white text-xs font-semibold shadow-soft-xl pointer-events-none"
        >
          {/* TODO(icons): swap ⚠️ for brand <Warning> */}
          <span aria-hidden="true">⚠️</span> Directions API: <code className="font-mono">{directionsErr}</code> — provjeri Browser konzolu za detalje
        </div>
      )}

      {/* Origin marker — green (categorical positional, dark-map-locked) */}
      {searchArgs && (
        <AdvancedMarker position={{ lat: searchArgs.coordsA[0], lng: searchArgs.coordsA[1] }} title="Polazište">
          <Pin background="#22c55e" borderColor="#16a34a" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}

      {/* Destination marker — red (categorical positional, dark-map-locked) */}
      {searchArgs && (
        <AdvancedMarker position={{ lat: searchArgs.coordsB[0], lng: searchArgs.coordsB[1] }} title="Odredište">
          <Pin background="#ef4444" borderColor="#dc2626" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}

      {/* Restaurant markers — orange (matches CHARCOAL_STYLE map theme) */}
      {restaurants.map((r) =>
        r.latitude != null && r.longitude != null ? (
          <AdvancedMarker
            key={r.id}
            position={{ lat: r.latitude, lng: r.longitude }}
            title={r.name}
            onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
          >
            <Pin background="#e65100" borderColor="#bf360c" glyphColor="#fff8f0" />
          </AdvancedMarker>
        ) : null,
      )}

      {/* InfoWindow on selected restaurant */}
      {selectedR?.latitude != null && selectedR?.longitude != null && (
        <InfoWindow
          position={{ lat: selectedR.latitude, lng: selectedR.longitude }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -42]}
        >
          <div style={{ minWidth: 200, maxWidth: 260, fontFamily: "system-ui, sans-serif" }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14, fontFamily: "Oswald, sans-serif" }}>
              {selectedR.name}
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 11, opacity: 0.65 }}>
              {selectedR.city} · {selectedR.distanceKm.toFixed(1)} km od rute
            </p>
            <LepinjaRating rating={selectedR.lepinja_rating} size="sm" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedR.latitude},${selectedR.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 11, color: "#4285f4" }}
            >
              Otvori na Google Maps →
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function RouteMapClient({ height = "420px", searchArgs, onSearchComplete, onRoutePoints }: Props) {
  if (!API_KEY) {
    // API-key-missing fallback: zar-red admin-attention pattern
    // (consistent with StatsTab "Pending" Sprint 26n and other warning
    // surfaces — DS has no warning-amber slot since amber-xp is locked
    // to gamification).
    return (
      <div
        style={{ height }}
        className="rounded-card border border-zar-red/30 bg-zar-red/5 flex flex-col items-center justify-center gap-3 text-center px-6"
      >
        <MapPin className="w-10 h-10 text-zar-red opacity-60" />
        <p className="font-display font-semibold text-zar-red">
          Google Maps API ključ nije postavljen
        </p>
        <p className="text-xs text-muted max-w-xs leading-relaxed">
          Dodaj{" "}
          <code className="px-1 rounded bg-surface text-zar-red">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…
          </code>{" "}
          u{" "}
          <code className="px-1 rounded bg-surface text-zar-red">.env.local</code>.
          Pretraga radi i bez karte (Haversine, ravna linija).
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-card overflow-hidden border border-border relative z-0"
    >
      {/* Dark InfoWindow chrome override. DOCUMENTED EXCEPTION: matches the
          dark-locked CHARCOAL_STYLE map theme. InfoWindow floats over the
          map so it inherits the dark visual context regardless of host
          page mode. */}
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

      {/* Hint overlay shown before first search */}
      {!searchArgs && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 z-10 rounded-card pointer-events-none">
          {/* TODO(icons): swap 🗺️ for brand <Karta> */}
          <span className="text-5xl mb-3" aria-hidden="true">🗺️</span>
          <p className="font-display text-foreground font-semibold">
            Unesi gradove za pretragu
          </p>
          <p className="text-muted text-sm mt-1 max-w-xs text-center px-4 leading-relaxed">
            Ruta se crta po cestama. Ćevapnice uz rutu pojavljuju se kao markeri.
          </p>
        </div>
      )}

      <APIProvider apiKey={API_KEY}>
        <Map
          mapId="9a4d0b5aaa7f88a18d6286ed"
          defaultCenter={{ lat: 44.1, lng: 17.9 }}
          defaultZoom={6}
          styles={CHARCOAL_STYLE}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl
          zoomControl
          gestureHandling="cooperative"
        >
          <RouteMapInner searchArgs={searchArgs} onSearchComplete={onSearchComplete} onRoutePoints={onRoutePoints} />
        </Map>
      </APIProvider>
    </div>
  );
}
