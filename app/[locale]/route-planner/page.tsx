"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  Route, MapPin, Navigation, Loader2, AlertCircle, CheckCircle, Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveCityCoords, resolveExpectedCountries } from "@/constants/cities";
import { filterByRoute, distanceToSegmentKm, haversineKm } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import type { Restaurant } from "@/types";
import type { RouteRestaurant, SearchArgs } from "@/components/finder/RouteMapClient";
import type { PlaceResult } from "@/app/api/places/route";

// ── Map loaded client-side only (uses window / Google Maps JS API) ─────────────
const RouteMap = dynamic(() => import("@/components/finder/RouteMapClient"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] flex flex-col items-center justify-center gap-3"
      style={{ height: "420px" }}
    >
      <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
      <p className="text-sm text-fg-muted">Učitavanje karte…</p>
    </div>
  ),
});

const RADIUS_OPTIONS = [5, 10, 20] as const;
type RadiusKm = (typeof RADIUS_OPTIONS)[number];

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Extend RouteRestaurant with an optional source tag
type AnyRouteRestaurant = RouteRestaurant & { source?: "db" | "places" | "waypoint" };

/** Fetch ćevapi from Google Places for a city, return as RouteRestaurant rows */
async function fetchPlacesForCity(
  city: string,
  coordsA: [number, number],
  coordsB: [number, number],
  radiusKm: number,
): Promise<AnyRouteRestaurant[]> {
  try {
    const res = await fetch(
      `/api/places?near=${encodeURIComponent(city)}&query=cevapi+rostilj+grill&limit=20`,
    );
    if (!res.ok) return [];
    const json = await res.json() as { results?: PlaceResult[] };
    return (json.results ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => {
        const distKm = distanceToSegmentKm(
          p.latitude!, p.longitude!,
          coordsA[0], coordsA[1],
          coordsB[0], coordsB[1],
        );
        return {
          id:             p.place_id,
          name:           p.name,
          city:           p.city,
          address:        p.address,
          latitude:       p.latitude,
          longitude:      p.longitude,
          lepinja_rating: p.rating ? Math.round(p.rating * 10) / 10 : 0,
          is_verified:    false,
          style:          null,
          distanceKm:     distKm,
          source:         "places" as const,
          // Required Restaurant fields with sensible defaults
          google_place_id: p.place_id,
          phone:           null,
          website:         null,
          image_url:       null,
          open_now:        p.open_now,
          types:           p.types,
          created_at:      "",
          updated_at:      "",
        } as unknown as AnyRouteRestaurant;
      })
      .filter((r) => r.distanceKm <= radiusKm);
  } catch {
    return [];
  }
}

// All country names that appear in Google Places formatted_address strings.
// Used to detect cross-border results without false-positives on addresses
// that don't mention a country at all (e.g. short city-only addresses).
const KNOWN_COUNTRIES = [
  "Croatia", "Bosnia and Herzegovina", "Serbia", "Montenegro",
  "Slovenia", "North Macedonia", "Kosovo", "Albania",
  "Hungary", "Austria", "Italy", "Greece", "Romania", "Bulgaria",
];

/**
 * Returns true ONLY when the address explicitly names a country that is NOT
 * in the expected set. Addresses with no country mention are kept (returned false).
 */
function isCrossBorder(address: string, expected: Set<string>): boolean {
  if (expected.size === 0) return false; // unknown route — no filtering
  for (const country of KNOWN_COUNTRIES) {
    if (address.includes(country)) {
      // We found a named country — block it only if it's not expected
      return !expected.has(country);
    }
  }
  // No known country in address → keep the result
  return false;
}

/**
 * Fetch ćevapi near a single lat/lng waypoint (coordinate-based Places search).
 * Uses the user's full selected radius (no hard cap).
 * If primary search returns 0 results, retries once at +50% radius ("deep search").
 */
async function fetchPlacesForWaypoint(
  lat: number,
  lng: number,
  coordsA: [number, number],
  coordsB: [number, number],
  corridorKm: number,
  expectedCountries: Set<string>,
  cap = 3,
): Promise<AnyRouteRestaurant[]> {
  const toRouteResult = (p: PlaceResult): AnyRouteRestaurant => {
    const distKm = distanceToSegmentKm(
      p.latitude!, p.longitude!,
      coordsA[0], coordsA[1],
      coordsB[0], coordsB[1],
    );
    return {
      id:              p.place_id,
      name:            p.name,
      city:            p.city,
      address:         p.address,
      latitude:        p.latitude,
      longitude:       p.longitude,
      lepinja_rating:  p.rating ? Math.round(p.rating * 10) / 10 : 0,
      is_verified:     false,
      style:           null,
      distanceKm:      distKm,
      source:          "waypoint" as const,
      google_place_id: p.place_id,
      phone:           null,
      website:         null,
      image_url:       null,
      open_now:        p.open_now,
      types:           p.types,
      created_at:      "",
      updated_at:      "",
    } as unknown as AnyRouteRestaurant;
  };

  const runFetch = async (radius: number): Promise<AnyRouteRestaurant[]> => {
    try {
      const res = await fetch(
        `/api/places?lat=${lat}&lng=${lng}&query=cevapi+rostilj+grill&limit=10`,
      );
      if (!res.ok) return [];
      const json = await res.json() as { results?: PlaceResult[] };
      return (json.results ?? [])
        .filter((p) => p.latitude != null && p.longitude != null)
        .filter((p) => !isCrossBorder(p.address, expectedCountries))
        .map(toRouteResult)
        .filter((r) => r.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, cap);
    } catch {
      return [];
    }
  };

  // Primary search with user-selected radius
  const primary = await runFetch(corridorKm);
  if (primary.length > 0) return primary;

  // Deep-search fallback: +50% radius — finds the nearest town if the road is sparse
  return runFetch(corridorKm * 1.5);
}

/**
 * Build waypoints from actual road sample points (from RouteMapClient polyline).
 * Falls back to straight-line interpolation when the map hasn't loaded yet.
 * Spacing adapts to the chosen radius: tighter radius = more waypoints.
 */
function buildWaypointsFromRoad(
  roadPoints: Array<{ lat: number; lng: number }>,
  coordsA:    [number, number],
  coordsB:    [number, number],
  radiusKm:   number,
  edgeKm = 30,
): Array<[number, number]> {
  // Adaptive spacing: at 5km radius every ~10km, at 20km every ~25km
  const spacingKm = radiusKm <= 5 ? 10 : radiusKm <= 10 ? 15 : 25;

  if (roadPoints.length >= 3) {
    // Use actual road points, thinned to `spacingKm` intervals
    const kept: Array<[number, number]> = [];
    let lastKept: [number, number] = [roadPoints[0].lat, roadPoints[0].lng];

    for (const p of roadPoints) {
      const dA = haversineKm(p.lat, p.lng, coordsA[0], coordsA[1]);
      const dB = haversineKm(p.lat, p.lng, coordsB[0], coordsB[1]);
      if (dA <= edgeKm || dB <= edgeKm) continue; // skip near endpoints
      const distFromLast = haversineKm(p.lat, p.lng, lastKept[0], lastKept[1]);
      if (kept.length === 0 || distFromLast >= spacingKm) {
        kept.push([p.lat, p.lng]);
        lastKept = [p.lat, p.lng];
      }
    }
    return kept;
  }

  // Fallback: straight-line interpolation
  const totalKm = haversineKm(coordsA[0], coordsA[1], coordsB[0], coordsB[1]);
  if (totalKm < edgeKm * 2 + spacingKm) return [];
  const tMin  = edgeKm / totalKm;
  const tMax  = 1 - edgeKm / totalKm;
  const steps = Math.max(1, Math.floor((totalKm - edgeKm * 2) / spacingKm));
  const pts: Array<[number, number]> = [];
  for (let i = 1; i <= steps; i++) {
    const t = tMin + ((tMax - tMin) * i) / (steps + 1);
    pts.push([coordsA[0] + (coordsB[0] - coordsA[0]) * t, coordsA[1] + (coordsB[1] - coordsA[1]) * t]);
  }
  return pts;
}

/** Merge DB results (priority) with Places results, deduplicate by name+city. */
function mergeResults(
  db:     AnyRouteRestaurant[],
  places: AnyRouteRestaurant[],
): AnyRouteRestaurant[] {
  const seen = new Set(db.map((r) => `${r.name.toLowerCase()}::${r.city.toLowerCase()}`));
  const unique = places.filter(
    (p) => !seen.has(`${p.name.toLowerCase()}::${p.city.toLowerCase()}`),
  );
  return [...db, ...unique].sort((a, b) => a.distanceKm - b.distanceKm);
}

export default function RoutePlannerPage() {
  const tNav = useTranslations("nav");

  const [cityA,      setCityA]      = useState("");
  const [cityB,      setCityB]      = useState("");
  const [radius,     setRadius]     = useState<RadiusKm>(10);
  const [loading,    setLoading]    = useState(false);
  const [results,    setResults]    = useState<AnyRouteRestaurant[] | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [resolvedA,  setResolvedA]  = useState<string | null>(null);
  const [resolvedB,  setResolvedB]  = useState<string | null>(null);
  const [searchArgs, setSearchArgs] = useState<SearchArgs | null>(null);

  // Cached restaurants from the last Supabase fetch (avoid re-fetching when
  // the user just changes the radius on an existing route).
  const [cachedRestaurants, setCachedRestaurants] = useState<Restaurant[]>([]);
  const [cachedPlaces,      setCachedPlaces]      = useState<AnyRouteRestaurant[]>([]);
  // Actual road sample points received from RouteMapClient polyline decode
  const [routePoints,       setRoutePoints]       = useState<Array<{ lat: number; lng: number }>>([]);

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (overrideRadius?: RadiusKm) => {
    const activeRadius = overrideRadius ?? radius;

    setError(null);
    setResults(null);
    setResolvedA(null);
    setResolvedB(null);

    const coordsA = resolveCityCoords(cityA);
    const coordsB = resolveCityCoords(cityB);

    if (!coordsA) {
      setError(`Grad "${cityA}" nije pronađen. Provjeri pravopis (npr. "Banja Luka", "Sarajevo", "Zagreb").`);
      return;
    }
    if (!coordsB) {
      setError(`Grad "${cityB}" nije pronađen. Provjeri pravopis.`);
      return;
    }

    setResolvedA(`${coordsA[0].toFixed(4)}°, ${coordsA[1].toFixed(4)}°`);
    setResolvedB(`${coordsB[0].toFixed(4)}°, ${coordsB[1].toFixed(4)}°`);
    setLoading(true);

    try {
      // Determine which countries are valid for this route
      const expectedCountries = resolveExpectedCountries([cityA, cityB]);

      // Use actual road points if available (from a previous map render), else straight-line
      const waypoints = buildWaypointsFromRoad(routePoints, coordsA, coordsB, activeRadius);

      // Fetch Supabase DB + Google Places for both cities + waypoints — all in parallel
      const supabase = createClient();
      const [dbRes, placesA, placesB, ...waypointResults] = await Promise.all([
        supabase.from("restaurants").select("*").order("lepinja_rating", { ascending: false }),
        fetchPlacesForCity(cityA, coordsA, coordsB, activeRadius),
        fetchPlacesForCity(cityB, coordsA, coordsB, activeRadius),
        ...waypoints.map((wp) =>
          fetchPlacesForWaypoint(wp[0], wp[1], coordsA, coordsB, activeRadius, expectedCountries),
        ),
      ]);

      if (dbRes.error) throw dbRes.error;

      const all = (dbRes.data ?? []) as Restaurant[];
      setCachedRestaurants(all);

      // Merge & deduplicate all Places results (city + waypoints) by name+city
      // Also apply country filter to city-level results (removes cross-border bleed)
      const allPlaces = [...placesA, ...placesB, ...waypointResults.flat()]
        .filter((r) => !isCrossBorder(r.address, expectedCountries));
      const placesMerged = allPlaces.filter(
        (r, i, arr) =>
          arr.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase() && x.city === r.city) === i,
      );

      if (!API_KEY) {
        // No Maps key → straight-line Haversine filter for DB rows
        const dbFiltered = filterByRoute(
          all, coordsA[0], coordsA[1], coordsB[0], coordsB[1], activeRadius,
        ) as RouteRestaurant[];

        // Merge DB + Places (DB rows take priority if same name)
        const combined = mergeResults(dbFiltered, placesMerged);
        setResults(combined);
        setLoading(false);
        return;
      }

      // With Maps key: hand off route filtering to RouteMapClient, but we
      // already have Places results — store them and merge after map callback.
      setCachedPlaces(placesMerged);
      setSearchArgs({ coordsA, coordsB, radiusKm: activeRadius, allRestaurants: all });
    } catch (err) {
      setError("Greška pri dohvatu restorana: " + String(err));
      setLoading(false);
    }
  }, [cityA, cityB, radius]);

  // ── Callback from RouteMapClient once Directions + filtering is done ────────
  const handleSearchComplete = useCallback((restaurants: RouteRestaurant[]) => {
    setResults(mergeResults(restaurants as AnyRouteRestaurant[], cachedPlaces));
    setLoading(false);
  }, [cachedPlaces]);

  // ── Actual road sample points from the decoded polyline ───────────────────
  const handleRoutePoints = useCallback((pts: Array<{ lat: number; lng: number }>) => {
    setRoutePoints(pts);
  }, []);

  // ── Increase-radius re-search ─────────────────────────────────────────────
  // If we already have a route (searchArgs set), just rebuild searchArgs with
  // the new radius — the map will re-filter without calling Directions API again
  // because the origin/dest didn't change (a new object triggers useEffect).
  const handleIncreaseRadius = (bigger: RadiusKm) => {
    setRadius(bigger);
    if (searchArgs && cachedRestaurants.length > 0) {
      setResults(null);
      setLoading(true);
      setSearchArgs({
        coordsA:        searchArgs.coordsA,
        coordsB:        searchArgs.coordsB,
        radiusKm:       bigger,
        allRestaurants: cachedRestaurants,
      });
    } else {
      handleSearch(bigger);
    }
  };

  const btnBase   = "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all";
  const btnActive = "border-[rgb(var(--primary)/0.6)] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]";
  const btnIdle   = "border-[rgb(var(--border))] text-fg-muted hover:text-fg";

  return (
    <div className="min-h-screen bg-app text-fg">

      {/* Header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <Route className="w-5 h-5 text-accent" />
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-fg uppercase tracking-wide"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {tNav("routePlanner")}
            </h1>
          </div>
          <p className="text-fg-muted pl-[52px]">Planiraj gastro rutu između dva grada.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Route form */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* City A */}
            <div>
              <label className="block text-xs text-fg-muted font-semibold mb-2 uppercase tracking-widest">
                🟢 Polazište (A)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                <input
                  type="text"
                  value={cityA}
                  onChange={(e) => setCityA(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="npr. Zagreb, Sarajevo…"
                  className="input-base pl-10"
                />
              </div>
              {resolvedA && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Koordinate: {resolvedA}
                </p>
              )}
            </div>

            {/* City B */}
            <div>
              <label className="block text-xs text-fg-muted font-semibold mb-2 uppercase tracking-widest">
                🔴 Odredište (B)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                <input
                  type="text"
                  value={cityB}
                  onChange={(e) => setCityB(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="npr. Banja Luka, Split…"
                  className="input-base pl-10"
                />
              </div>
              {resolvedB && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Koordinate: {resolvedB}
                </p>
              )}
            </div>
          </div>

          {/* Radius */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <label className="text-xs text-fg-muted uppercase tracking-widest font-medium">
              Radijus od rute:
            </label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRadius(r);
                    // Re-search immediately if we already have a route loaded
                    if (results !== null || searchArgs !== null) handleSearch(r);
                  }}
                  className={`${btnBase} ${radius === r ? btnActive : btnIdle}`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={() => handleSearch()}
            disabled={!cityA.trim() || !cityB.trim() || loading}
            className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Pretražujem rutu i Google Places…</>
            ) : (
              <><Navigation className="w-4 h-4" /> Pronađi Ćevap Stanice</>
            )}
          </button>
        </div>

        {/* ── Map (always rendered when API key is set) ─────────────────────── */}
        {API_KEY && (
          <div suppressHydrationWarning>
            <RouteMap
              height="420px"
              searchArgs={searchArgs}
              onSearchComplete={handleSearchComplete}
              onRoutePoints={handleRoutePoints}
            />
          </div>
        )}

        {/* ── Initial hint (no API key + nothing searched yet) ─────────────── */}
        {!API_KEY && results === null && !loading && !error && (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🗺️</div>
            <h3
              className="text-lg font-semibold text-fg-muted mb-2"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              Kako funkcionira?
            </h3>
            <p className="text-fg-muted text-sm max-w-md mx-auto leading-relaxed">
              Unesi polazni i dolazni grad. Uzorkujemo stvarnu rutu po cestama i
              pronalazimo sve restorane unutar odabranog radijusa.
            </p>
            <div className="mt-5 flex justify-center flex-wrap gap-4 text-xs text-fg-muted">
              <span>✅ Google Directions API</span>
              <span>✅ Polyline sampling (svakih 7 km)</span>
              <span>✅ Supabase baza</span>
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-fg" style={{ fontFamily: "Oswald, sans-serif" }}>
                {results.length === 0
                  ? "Nema ćevap stanica na ovoj ruti"
                  : `${results.length} ćevap ${results.length === 1 ? "stanica" : "stanica"} pronađeno`}
              </h2>
              <span className="text-xs text-fg-muted bg-surface px-2 py-1 rounded-lg">
                {cityA} → {cityB} · ±{radius} km
              </span>
            </div>

            {results.length === 0 ? (
              <div className="card p-10 text-center">
                <span className="text-5xl block mb-3">😢</span>
                <p className="text-fg font-semibold mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                  Nema ćevap stanica na ovoj ruti
                </p>
                <p className="text-fg-muted text-sm mb-6">
                  Nema restorana unutar <strong>{radius} km</strong> od rute {cityA} → {cityB}.
                  Pokušaj povećati radijus pretrage.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {(RADIUS_OPTIONS.filter((r) => r > radius) as RadiusKm[]).map((bigger) => (
                    <button
                      key={bigger}
                      onClick={() => handleIncreaseRadius(bigger)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white font-bold text-sm hover:bg-[rgb(var(--primary)/0.85)] transition-colors"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      <Navigation className="w-4 h-4" />
                      Povećaj radijus → {bigger} km
                    </button>
                  ))}
                  {radius === (Math.max(...RADIUS_OPTIONS) as RadiusKm) && (
                    <p className="text-fg-muted text-xs">
                      Već si na max radijusu ({radius} km). Provjeri nazive gradova.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((r, i) => (
                  <RouteResultRow key={`${r.id}-${i}`} restaurant={r} index={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Result row card ───────────────────────────────────────────────────────────
const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski: "🕌", "Banjalučki": "🌊", "Travnički": "⛰️", "Leskovački": "🌶️", Ostalo: "🔥",
};

function RouteResultRow({ restaurant, index }: { restaurant: AnyRouteRestaurant; index: number }) {
  const isPlaces   = restaurant.source === "places";
  const isWaypoint = restaurant.source === "waypoint";
  const isGoogle   = isPlaces || isWaypoint;
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: "rgb(var(--primary)/0.15)", color: "rgb(var(--primary))", fontFamily: "Oswald,sans-serif" }}
      >
        {index}
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: "rgb(var(--surface))" }}
      >
        {STYLE_EMOJIS[restaurant.style ?? ""] ?? "🔥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-fg text-sm truncate" style={{ fontFamily: "Oswald,sans-serif" }}>
            {restaurant.name}
          </h3>
          {restaurant.is_verified && <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
          {isWaypoint && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-green-500/30 bg-green-500/10 text-green-400 flex-shrink-0">
              🚗 Na ruti
            </span>
          )}
          {isPlaces && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400 flex-shrink-0">
              <Globe className="w-2.5 h-2.5" /> Google
            </span>
          )}
        </div>
        <p className="text-xs text-fg-muted truncate">{restaurant.city} · {restaurant.address}</p>
        {isGoogle
          ? restaurant.lepinja_rating > 0 && (
              <p className="text-xs text-amber-400 mt-1">⭐ {restaurant.lepinja_rating.toFixed(1)} / 5</p>
            )
          : <LepinjaRating rating={restaurant.lepinja_rating} size="sm" className="mt-1" />
        }
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-accent" style={{ fontFamily: "Oswald,sans-serif" }}>
          {restaurant.distanceKm.toFixed(1)} km
        </div>
        <div className="text-xs text-fg-muted">od rute</div>
      </div>
      <DirectionsButton
        name={restaurant.name}
        address={restaurant.address}
        city={restaurant.city}
        lat={restaurant.latitude}
        lng={restaurant.longitude}
      />
    </div>
  );
}
