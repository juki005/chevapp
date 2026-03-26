"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  Route, MapPin, Navigation, Loader2, AlertCircle, CheckCircle, Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveCityCoords, resolveExpectedCountries } from "@/constants/cities";
import { filterByRoute, distanceToSegmentKm, distanceToPolylineKm, haversineKm } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import CityAutocomplete from "@/components/finder/CityAutocomplete";
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
 *
 * Distance is calculated as the true perpendicular distance to the nearest segment
 * of the decoded polyline (distanceToPolylineKm) — not haversine to a sample point
 * and not straight-line A→B. This is the same geometry the map uses, so the "X km
 * from route" value on cards is accurate even on curved mountain roads.
 *
 * A final sanity check discards any result whose polyline distance exceeds
 * `corridorKm` — this eliminates ghost results that slipped past the Places API
 * radius bias (e.g. a restaurant in Bosnia showing up on a Zagreb–Split search).
 */
async function fetchPlacesForWaypoint(
  lat: number,
  lng: number,
  coordsA: [number, number],
  coordsB: [number, number],
  corridorKm: number,
  expectedCountries: Set<string>,
  cap = 3,
  routePoints: Array<{ lat: number; lng: number }> = [],
): Promise<AnyRouteRestaurant[]> {
  const toRouteResult = (p: PlaceResult): AnyRouteRestaurant => {
    // True perpendicular distance to the nearest polyline segment.
    // Falls back to straight-line A→B only when we don't have the decoded path yet
    // (first search before the map has finished loading).
    const distKm = routePoints.length >= 2
      ? distanceToPolylineKm(p.latitude!, p.longitude!, routePoints)
      : distanceToSegmentKm(p.latitude!, p.longitude!, coordsA[0], coordsA[1], coordsB[0], coordsB[1]);
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
        // Primary corridor filter using true polyline distance
        .filter((r) => r.distanceKm <= radius)
        // ── Sanity check ──────────────────────────────────────────────────
        // Even if a result survived the radius filter (possible when routePoints
        // is empty and we fell back to straight-line distance), re-validate
        // against the full polyline if we have it. Eliminates ghost results
        // that sit on the far side of a mountain range or national border.
        .filter((r) => {
          if (routePoints.length < 2) return true; // no polyline yet — trust the API
          const trueDist = distanceToPolylineKm(r.latitude!, r.longitude!, routePoints);
          return trueDist <= corridorKm;
        })
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
  // High-density spacing: at 5km radius every ~12km, at 10km every ~15km, at 20km every ~20km
  const spacingKm = radiusKm <= 5 ? 12 : radiusKm <= 10 ? 15 : 20;

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

  const [cityA,        setCityA]        = useState("");
  const [cityB,        setCityB]        = useState("");
  const [radius,       setRadius]       = useState<RadiusKm>(10);
  const [loading,      setLoading]      = useState(false);
  const [results,      setResults]      = useState<AnyRouteRestaurant[] | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [resolvedA,    setResolvedA]    = useState<string | null>(null);
  const [resolvedB,    setResolvedB]    = useState<string | null>(null);
  const [searchArgs,   setSearchArgs]   = useState<SearchArgs | null>(null);

  // Coordinates resolved from Google Places Autocomplete selection.
  // When set, these take precedence over the resolveCityCoords() lookup table.
  const [autoCoordA, setAutoCoordA] = useState<[number, number] | null>(null);
  const [autoCoordB, setAutoCoordB] = useState<[number, number] | null>(null);

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

    // Prefer coordinates from Google Places Autocomplete; fall back to lookup table
    const coordsA: [number, number] | null = autoCoordA ?? resolveCityCoords(cityA);
    const coordsB: [number, number] | null = autoCoordB ?? resolveCityCoords(cityB);

    if (!coordsA) {
      setError(`Grad "${cityA}" nije pronađen. Odaberi grad iz padajuće liste ili provjeri pravopis (npr. "Banja Luka", "Sarajevo", "Zagreb").`);
      return;
    }
    if (!coordsB) {
      setError(`Grad "${cityB}" nije pronađen. Odaberi grad iz padajuće liste ili provjeri pravopis.`);
      return;
    }

    setResolvedA(`${coordsA[0].toFixed(4)}°, ${coordsA[1].toFixed(4)}°`);
    setResolvedB(`${coordsB[0].toFixed(4)}°, ${coordsB[1].toFixed(4)}°`);
    setLoading(true);

    try {
      const totalKm = haversineKm(coordsA[0], coordsA[1], coordsB[0], coordsB[1]);

      // Dynamic exclusion zone: 20km each end, or 15% of total on short routes
      const edgeKm = totalKm < 60
        ? Math.round(totalKm * 0.15)
        : 20;

      // Normalised city names for address filtering (strip accents for loose match)
      const originToken = cityA.trim().toLowerCase();
      const destToken   = cityB.trim().toLowerCase();

      /** True if a result is from one of the endpoint cities — should be hidden */
      const isEndpointCity = (r: AnyRouteRestaurant) => {
        const addr = (r.address + " " + r.city).toLowerCase();
        return addr.includes(originToken) || addr.includes(destToken);
      };

      // Determine which countries are valid for this route
      const expectedCountries = resolveExpectedCountries([cityA, cityB]);

      // Waypoints ONLY in the middle zone (edgeKm excluded from each end)
      const waypoints = buildWaypointsFromRoad(routePoints, coordsA, coordsB, activeRadius, edgeKm);

      // Fetch Supabase DB + waypoint Places only — no city-level city searches
      const supabase = createClient();
      const [dbRes, ...waypointResults] = await Promise.all([
        supabase.from("restaurants").select("*").order("lepinja_rating", { ascending: false }),
        ...waypoints.map((wp) =>
          fetchPlacesForWaypoint(wp[0], wp[1], coordsA, coordsB, activeRadius, expectedCountries, 3, routePoints),
        ),
      ]);

      if (dbRes.error) throw dbRes.error;

      const all = (dbRes.data ?? []) as Restaurant[];
      setCachedRestaurants(all);

      // Merge, deduplicate, then strip endpoint-city noise
      const allPlaces = waypointResults.flat()
        .filter((r) => !isCrossBorder(r.address, expectedCountries));
      const placesMerged = allPlaces
        .filter(
          (r, i, arr) =>
            arr.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase() && x.city === r.city) === i,
        )
        .filter((r) => !isEndpointCity(r));

      if (!API_KEY) {
        // No Maps key → straight-line Haversine filter for DB rows, also exclude endpoints
        const dbFiltered = (filterByRoute(
          all, coordsA[0], coordsA[1], coordsB[0], coordsB[1], activeRadius,
        ) as RouteRestaurant[]).filter((r) => {
          const dA = haversineKm(r.latitude!, r.longitude!, coordsA[0], coordsA[1]);
          const dB = haversineKm(r.latitude!, r.longitude!, coordsB[0], coordsB[1]);
          return dA > edgeKm && dB > edgeKm;
        }) as AnyRouteRestaurant[];

        setResults(mergeResults(dbFiltered, placesMerged));
        setLoading(false);
        return;
      }

      // With Maps key: hand off route filtering to RouteMapClient, merge Places after callback.
      setCachedPlaces(placesMerged);
      setSearchArgs({ coordsA, coordsB, radiusKm: activeRadius, allRestaurants: all });
    } catch (err) {
      setError("Greška pri dohvatu restorana: " + String(err));
      setLoading(false);
    }
  }, [cityA, cityB, radius, autoCoordA, autoCoordB, routePoints]);

  // ── Callback from RouteMapClient once Directions + filtering is done ────────
  const handleSearchComplete = useCallback((restaurants: RouteRestaurant[]) => {
    const originToken = cityA.trim().toLowerCase();
    const destToken   = cityB.trim().toLowerCase();
    // Prefer autocomplete coords — same source used in handleSearch
    const coordsA: [number, number] | null = autoCoordA ?? resolveCityCoords(cityA);
    const coordsB: [number, number] | null = autoCoordB ?? resolveCityCoords(cityB);
    const totalKm = coordsA && coordsB
      ? haversineKm(coordsA[0], coordsA[1], coordsB[0], coordsB[1])
      : 999;
    const edgeKm = totalKm < 60 ? Math.round(totalKm * 0.15) : 20;

    const filtered = (restaurants as AnyRouteRestaurant[]).filter((r) => {
      // Strip endpoint-city noise
      const addr = (r.address + " " + r.city).toLowerCase();
      if (addr.includes(originToken) || addr.includes(destToken)) return false;
      // Strip results within the edge exclusion zone
      if (r.latitude == null || r.longitude == null) return true;
      if (!coordsA || !coordsB) return true;
      const dA = haversineKm(r.latitude, r.longitude, coordsA[0], coordsA[1]);
      const dB = haversineKm(r.latitude, r.longitude, coordsB[0], coordsB[1]);
      return dA > edgeKm && dB > edgeKm;
    });

    setResults(mergeResults(filtered, cachedPlaces));
    setLoading(false);
  }, [cachedPlaces, cityA, cityB, autoCoordA, autoCoordB]);

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
              <CityAutocomplete
                value={cityA}
                onChange={setCityA}
                onSelect={(_name, lat, lng) => {
                  setAutoCoordA([lat, lng]);
                  setResolvedA(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
                }}
                onClear={() => { setAutoCoordA(null); setResolvedA(null); }}
                placeholder="npr. Zagreb, Sarajevo…"
                leadingIcon={<MapPin className="w-4 h-4 text-green-500" />}
              />
              {resolvedA && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {autoCoordA ? "Google Places:" : "Koordinate:"} {resolvedA}
                </p>
              )}
            </div>

            {/* City B */}
            <div>
              <label className="block text-xs text-fg-muted font-semibold mb-2 uppercase tracking-widest">
                🔴 Odredište (B)
              </label>
              <CityAutocomplete
                value={cityB}
                onChange={setCityB}
                onSelect={(_name, lat, lng) => {
                  setAutoCoordB([lat, lng]);
                  setResolvedB(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
                }}
                onClear={() => { setAutoCoordB(null); setResolvedB(null); }}
                placeholder="npr. Banja Luka, Split…"
                leadingIcon={<MapPin className="w-4 h-4 text-red-500" />}
              />
              {resolvedB && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {autoCoordB ? "Google Places:" : "Koordinate:"} {resolvedB}
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
              <span>✅ Polyline sampling (svakih 5 km)</span>
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
                  ? "Stanice na putu (Izvan polazišta i cilja)"
                  : `Stanice na putu (${results.length}) — Izvan polazišta i cilja`}
              </h2>
              <span className="text-xs text-fg-muted bg-surface px-2 py-1 rounded-lg">
                {cityA} → {cityB} · ±{radius} km
              </span>
            </div>

            {results.length === 0 ? (
              <div className="card p-10 text-center">
                <span className="text-5xl block mb-3">😢</span>
                <p className="text-fg font-semibold mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                  Nismo pronašli ništa na samoj ruti
                </p>
                <p className="text-fg-muted text-sm mb-6">
                  Nema ćevapnica između <strong>{cityA}</strong> i <strong>{cityB}</strong> unutar <strong>{radius} km</strong> od ceste.
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
