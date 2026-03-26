"use client";

// ── RouteMapClient.tsx ────────────────────────────────────────────────────────
// Google Maps component for the Gastro Route Planner.
//
// Features:
//   - Calls google.maps.DirectionsService when searchArgs change
//   - Draws the actual road route as an orange polyline
//   - Decodes the overview_polyline, samples every ~5 km (high-density)
//   - Finds restaurants within the user's radius of any sample point
//   - Drops green (origin), red (destination), and orange (restaurant) markers
//   - Auto-zooms to fit the full route + all found restaurants
//   - Falls back to straight-line if Directions API returns an error
//
// Loaded via dynamic({ ssr: false }) from RouteMap.tsx.
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
import { samplePolyline, filterByPolylineSamples, decodePolyline } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import type { Restaurant } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ── Charcoal dark map style (matches the rest of the app) ─────────────────────
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
  // useMapsLibrary ensures the "routes" library (DirectionsService, TravelMode)
  // is fully loaded before we try to instantiate it.
  const routesLib   = useMapsLibrary("routes");
  const polyRef     = useRef<google.maps.Polyline | null>(null);
  const searchRef   = useRef<SearchArgs | null>(null);

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

      // Draw the orange route polyline
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
      path:        Array<{ lat: number; lng: number }>,
      bounds:      google.maps.LatLngBounds,
      a:           [number, number],
      b:           [number, number],
      allRests:    typeof allRestaurants,
      radius:      number,
    ) {
      const samples  = samplePolyline(path, 5);
      const filtered = filterByPolylineSamples(allRests, samples, radius);

      console.log("[RouteMap] Sampled", samples.length, "points →", filtered.length, "restaurants within", radius, "km");

      // Give the parent actual road waypoints for accurate Places searches
      onRoutePoints?.(samples);

      setRestaurants(filtered);
      onSearchComplete(filtered);

      // Auto-zoom to cover route + all markers
      const fitBounds = new google.maps.LatLngBounds();
      fitBounds.union(bounds);
      filtered.forEach((r) => {
        if (r.latitude != null && r.longitude != null) {
          fitBounds.extend({ lat: r.latitude, lng: r.longitude });
        }
      });
      // Ensure origin + destination are always in frame
      fitBounds.extend({ lat: a[0], lng: a[1] });
      fitBounds.extend({ lat: b[0], lng: b[1] });
      map?.fitBounds(fitBounds, 56);
    }

    return () => { polyRef.current?.setMap(null); polyRef.current = null; };
  }, [map, routesLib, searchArgs, onSearchComplete]);

  const selectedR = restaurants.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      {/* Directions API error banner — rendered as a DOM overlay, not a Maps overlay */}
      {directionsErr && (
        <div
          style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 text-white text-xs font-semibold shadow-lg pointer-events-none"
        >
          ⚠️ Directions API: <code className="font-mono">{directionsErr}</code> — provjeri Browser konzolu za detalje
        </div>
      )}

      {/* Origin marker — green */}
      {searchArgs && (
        <AdvancedMarker position={{ lat: searchArgs.coordsA[0], lng: searchArgs.coordsA[1] }} title="Polazište">
          <Pin background="#22c55e" borderColor="#16a34a" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}

      {/* Destination marker — red */}
      {searchArgs && (
        <AdvancedMarker position={{ lat: searchArgs.coordsB[0], lng: searchArgs.coordsB[1] }} title="Odredište">
          <Pin background="#ef4444" borderColor="#dc2626" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}

      {/* Restaurant markers — orange */}
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
    return (
      <div
        style={{ height }}
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-3 text-center px-6"
      >
        <MapPin className="w-10 h-10 text-amber-400 opacity-60" />
        <p className="font-semibold text-amber-300" style={{ fontFamily: "Oswald, sans-serif" }}>
          Google Maps API ključ nije postavljen
        </p>
        <p className="text-xs text-[rgb(var(--muted))] max-w-xs leading-relaxed">
          Dodaj{" "}
          <code className="px-1 rounded bg-[rgb(var(--surface))] text-amber-300">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…
          </code>{" "}
          u{" "}
          <code className="px-1 rounded bg-[rgb(var(--surface))] text-amber-300">.env.local</code>.
          Pretraga radi i bez karte (Haversine, ravna linija).
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] relative z-0"
    >
      {/* Dark InfoWindow chrome override */}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgb(var(--surface)/0.88)] z-10 rounded-2xl pointer-events-none">
          <span className="text-5xl mb-3">🗺️</span>
          <p className="text-fg font-semibold" style={{ fontFamily: "Oswald, sans-serif" }}>
            Unesi gradove za pretragu
          </p>
          <p className="text-fg-muted text-sm mt-1 max-w-xs text-center px-4 leading-relaxed">
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
