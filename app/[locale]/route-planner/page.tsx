"use client";

// ── RoutePlannerPage · app-route (Sprint 26ak · DS-migrated) ─────────────────
// "Gastro Route Planner" — input two cities, get ćevapnice along the route.
// Uses Google Directions API, Places API for waypoints, and Supabase DB.
//
// Sprint 26ak changes:
//   - Normalised globals.css utility aliases to Tailwind semantic tokens for
//     consistency with the rest of the migration:
//       bg-app          → bg-background
//       text-fg         → text-foreground
//       text-fg-muted   → text-muted
//       text-accent     → text-primary
//     (Both resolve to the same rgb(var(--token)) — keeping one source of
//     truth avoids parallel naming conventions across the codebase.)
//   - All rgb(var(--token)) Tailwind classes → semantic aliases.
//   - 6× style={{fontFamily:"Oswald"}} → font-display class.
//   - BUG FIX: <div className="page-header"> was undefined in globals.css —
//     silently rendering empty. Replaced with the same border-b + bg-surface
//     pattern used by AcademyPage / JukeboxPage / FinderPage headers.
//   - Result-row cards used inline style={{ background: "rgb(var(--token))" }}
//     for the index pill + style emoji wrapper — converted to className.
//   - Empty-results CTA "Povećaj radijus →": bg-primary + hover:bg-primary/0.85
//     + text-white → bg-primary + hover:bg-vatra-hover + text-primary-fg
//     (DS rule — explicit hover token, semantic fill).
//   - "Na ruti" green-500 badge → ember-green token family (DS confirm).
//   - "Google" blue-500 badge KEPT as documented external-source categorical
//     marker (precedent: Foursquare blue in SafeMap 26ag).
//   - TripAdvisor green emerald-500 hex KEPT as external-brand exception
//     (precedent: TripAdvisor green in FinderFilterBar 26j).
//   - Star rating amber-400 → amber-xp (DS gamification family — same as
//     ReviewList stars Sprint 26i, ModerationTab review stars 26q).
//   - Error block red-500 family → zar-red token family (DS alert).
//   - 🟢 / 🔴 / 🚗 / 🗺️ / 😢 / ⭐ emoji + STYLE_EMOJIS map tagged TODO(icons)
//     where appropriate; STYLE_EMOJIS kept as categorical content markers.
//   - Geolocation button green-500 hex kept as "origin marker" pair with
//     red-500 destination — same categorical pair as RouteMapClient pin
//     colours (Sprint 26ah).
//   - rounded-xl → rounded-chip; rounded-2xl → rounded-card.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  Route, MapPin, Navigation, Loader2, AlertCircle, CheckCircle, Globe, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveCityCoords, resolveExpectedCountries } from "@/constants/cities";
import { getCityFromCoords } from "@/lib/actions/discovery";
import { filterByRoute, distanceToSegmentKm, distanceToPolylineKm, haversineKm } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import CityAutocomplete from "@/components/finder/CityAutocomplete";
import type { Restaurant } from "@/types";
import type { RouteRestaurant, SearchArgs } from "@/components/finder/RouteMapClient";
import type { PlaceResult } from "@/types/places";

// ── Map loaded client-side only (uses window / Google Maps JS API) ─────────────
const RouteMap = dynamic(() => import("@/components/finder/RouteMapClient"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-card border border-border bg-surface/40 flex flex-col items-center justify-center gap-3"
      style={{ height: "420px" }}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted">Učitavanje karte…</p>
    </div>
  ),
});

const RADIUS_OPTIONS = [5, 10, 20] as const;
type RadiusKm = (typeof RADIUS_OPTIONS)[number];

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Extend RouteRestaurant with an optional source tag
type AnyRouteRestaurant = RouteRestaurant & { source?: "db" | "places" | "waypoint" };

const KNOWN_COUNTRIES = [
  "Croatia", "Bosnia and Herzegovina", "Serbia", "Montenegro",
  "Slovenia", "North Macedonia", "Kosovo", "Albania",
  "Hungary", "Austria", "Italy", "Greece", "Romania", "Bulgaria",
];

function isCrossBorder(address: string, expected: Set<string>): boolean {
  if (expected.size === 0) return false;
  for (const country of KNOWN_COUNTRIES) {
    if (address.includes(country)) {
      return !expected.has(country);
    }
  }
  return false;
}

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
        `/api/places?lat=${lat}&lng=${lng}&query=%C4%87evapi+%C4%87evabdžinica+cevapi+ro%C5%A1tilj+pe%C4%8Denjara+grill&limit=10`,
      );
      if (!res.ok) return [];
      const json = await res.json() as { results?: PlaceResult[] };
      return (json.results ?? [])
        .filter((p) => p.latitude != null && p.longitude != null)
        .filter((p) => !isCrossBorder(p.address, expectedCountries))
        .map(toRouteResult)
        .filter((r) => r.distanceKm <= radius)
        .filter((r) => {
          if (routePoints.length < 2) return true;
          const trueDist = distanceToPolylineKm(r.latitude!, r.longitude!, routePoints);
          return trueDist <= corridorKm;
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, cap);
    } catch {
      return [];
    }
  };

  const primary = await runFetch(corridorKm);
  if (primary.length > 0) return primary;
  return runFetch(corridorKm * 1.5);
}

function buildWaypointsFromRoad(
  roadPoints: Array<{ lat: number; lng: number }>,
  coordsA:    [number, number],
  coordsB:    [number, number],
  radiusKm:   number,
  edgeKm = 30,
): Array<[number, number]> {
  const spacingKm = radiusKm <= 5 ? 12 : radiusKm <= 10 ? 15 : 20;

  if (roadPoints.length >= 3) {
    const kept: Array<[number, number]> = [];
    let lastKept: [number, number] = [roadPoints[0].lat, roadPoints[0].lng];

    for (const p of roadPoints) {
      const dA = haversineKm(p.lat, p.lng, coordsA[0], coordsA[1]);
      const dB = haversineKm(p.lat, p.lng, coordsB[0], coordsB[1]);
      if (dA <= edgeKm || dB <= edgeKm) continue;
      const distFromLast = haversineKm(p.lat, p.lng, lastKept[0], lastKept[1]);
      if (kept.length === 0 || distFromLast >= spacingKm) {
        kept.push([p.lat, p.lng]);
        lastKept = [p.lat, p.lng];
      }
    }
    return kept;
  }

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

  const [autoCoordA, setAutoCoordA] = useState<[number, number] | null>(null);
  const [autoCoordB, setAutoCoordB] = useState<[number, number] | null>(null);

  const [cachedRestaurants, setCachedRestaurants] = useState<Restaurant[]>([]);
  const [cachedPlaces,      setCachedPlaces]      = useState<AnyRouteRestaurant[]>([]);
  const [routePoints,       setRoutePoints]       = useState<Array<{ lat: number; lng: number }>>([]);

  const [geolocating, setGeolocating] = useState(false);
  const handleGeolocateA = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await getCityFromCoords(pos.coords.latitude, pos.coords.longitude);
          setCityA(city);
          const coords = resolveCityCoords(city);
          if (coords) {
            setAutoCoordA(coords);
            setResolvedA(`${coords[0].toFixed(4)}°, ${coords[1].toFixed(4)}°`);
          }
        } finally {
          setGeolocating(false);
        }
      },
      () => setGeolocating(false),
      { timeout: 6000 }
    );
  }, []);

  const handleSearch = useCallback(async (overrideRadius?: RadiusKm) => {
    const activeRadius = overrideRadius ?? radius;

    setError(null);
    setResults(null);
    setResolvedA(null);
    setResolvedB(null);

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
      const edgeKm = totalKm < 60
        ? Math.round(totalKm * 0.15)
        : 20;

      const originToken = cityA.trim().toLowerCase();
      const destToken   = cityB.trim().toLowerCase();

      const isEndpointCity = (r: AnyRouteRestaurant) => {
        const addr = (r.address + " " + r.city).toLowerCase();
        return addr.includes(originToken) || addr.includes(destToken);
      };

      const expectedCountries = resolveExpectedCountries([cityA, cityB]);
      const waypoints = buildWaypointsFromRoad(routePoints, coordsA, coordsB, activeRadius, edgeKm);

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

      const allPlaces = waypointResults.flat()
        .filter((r) => !isCrossBorder(r.address, expectedCountries));
      const placesMerged = allPlaces
        .filter(
          (r, i, arr) =>
            arr.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase() && x.city === r.city) === i,
        )
        .filter((r) => !isEndpointCity(r));

      if (!API_KEY) {
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

      setCachedPlaces(placesMerged);
      setSearchArgs({ coordsA, coordsB, radiusKm: activeRadius, allRestaurants: all });
    } catch (err) {
      setError("Greška pri dohvatu restorana: " + String(err));
      setLoading(false);
    }
  }, [cityA, cityB, radius, autoCoordA, autoCoordB, routePoints]);

  const handleSearchComplete = useCallback((restaurants: RouteRestaurant[]) => {
    const originToken = cityA.trim().toLowerCase();
    const destToken   = cityB.trim().toLowerCase();
    const coordsA: [number, number] | null = autoCoordA ?? resolveCityCoords(cityA);
    const coordsB: [number, number] | null = autoCoordB ?? resolveCityCoords(cityB);
    const totalKm = coordsA && coordsB
      ? haversineKm(coordsA[0], coordsA[1], coordsB[0], coordsB[1])
      : 999;
    const edgeKm = totalKm < 60 ? Math.round(totalKm * 0.15) : 20;

    const filtered = (restaurants as AnyRouteRestaurant[]).filter((r) => {
      const addr = (r.address + " " + r.city).toLowerCase();
      if (addr.includes(originToken) || addr.includes(destToken)) return false;
      if (r.latitude == null || r.longitude == null) return true;
      if (!coordsA || !coordsB) return true;
      const dA = haversineKm(r.latitude, r.longitude, coordsA[0], coordsA[1]);
      const dB = haversineKm(r.latitude, r.longitude, coordsB[0], coordsB[1]);
      return dA > edgeKm && dB > edgeKm;
    });

    setResults(mergeResults(filtered, cachedPlaces));
    setLoading(false);
  }, [cachedPlaces, cityA, cityB, autoCoordA, autoCoordB]);

  const handleRoutePoints = useCallback((pts: Array<{ lat: number; lng: number }>) => {
    setRoutePoints(pts);
  }, []);

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

  const btnBase   = "px-3 py-1.5 rounded-chip text-xs font-medium border transition-all";
  const btnActive = "border-primary/60 bg-primary/10 text-primary";
  const btnIdle   = "border-border text-muted hover:text-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header — pattern matches AcademyPage / FinderPage. Replaces broken
          .page-header global utility (was undefined, silently rendering empty). */}
      <div className="border-b border-border bg-surface/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-chip bg-primary/15 flex items-center justify-center">
              <Route className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide">
              {tNav("routePlanner")}
            </h1>
          </div>
          <p className="text-muted pl-[52px]">Planiraj gastro rutu između dva grada.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Route form */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* City A — green-500 marker, paired categorical with red-500 destination */}
            <div>
              <label className="block text-xs text-muted font-semibold mb-2 uppercase tracking-widest">
                {/* TODO(icons): swap 🟢 for brand <Origin> */}
                <span aria-hidden="true">🟢</span> Polazište (A)
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
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
                </div>
                {/* Geolocation — green-500 categorical pair with red destination */}
                <button
                  onClick={handleGeolocateA}
                  disabled={geolocating}
                  title="Koristi moju lokaciju kao polazište"
                  aria-label="Koristi moju lokaciju kao polazište"
                  className="flex-shrink-0 flex items-center justify-center w-[44px] rounded-chip border border-border text-muted hover:border-green-500/50 hover:text-green-500 hover:bg-green-500/5 transition-all disabled:opacity-50"
                >
                  {geolocating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Navigation className="w-4 h-4" />
                  }
                </button>
              </div>
              {resolvedA && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {autoCoordA ? "Google Places:" : "Koordinate:"} {resolvedA}
                </p>
              )}
            </div>

            {/* City B — red-500 destination marker */}
            <div>
              <label className="block text-xs text-muted font-semibold mb-2 uppercase tracking-widest">
                {/* TODO(icons): swap 🔴 for brand <Destination> */}
                <span aria-hidden="true">🔴</span> Odredište (B)
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
            <label className="text-xs text-muted uppercase tracking-widest font-medium">
              Radijus od rute:
            </label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => handleIncreaseRadius(r)}
                  className={`${btnBase} ${radius === r ? btnActive : btnIdle}`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-chip border border-zar-red/30 bg-zar-red/5 text-zar-red text-sm mb-4">
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

        {/* Map (always rendered when API key is set) */}
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

        {/* Initial hint (no API key + nothing searched yet) */}
        {!API_KEY && results === null && !loading && !error && (
          <div className="text-center py-10">
            {/* TODO(icons): swap 🗺️ for brand <Karta> */}
            <div className="text-5xl mb-4" aria-hidden="true">🗺️</div>
            <h3 className="font-display text-lg font-semibold text-muted mb-2">
              Kako funkcionira?
            </h3>
            <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
              Unesi polazni i dolazni grad. Uzorkujemo stvarnu rutu po cestama i
              pronalazimo sve restorane unutar odabranog radijusa.
            </p>
            <div className="mt-5 flex justify-center flex-wrap gap-4 text-xs text-muted">
              <span>✅ Google Directions API</span>
              <span>✅ Polyline sampling (svakih 5 km)</span>
              <span>✅ Supabase baza</span>
            </div>
          </div>
        )}

        {/* Results */}
        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">
                {results.length === 0
                  ? "Stanice na putu (Izvan polazišta i cilja)"
                  : `Stanice na putu (${results.length}) — Izvan polazišta i cilja`}
              </h2>
              <span className="text-xs text-muted bg-surface px-2 py-1 rounded-chip">
                {cityA} → {cityB} · ±{radius} km
              </span>
            </div>

            {results.length === 0 ? (
              <div className="card p-10 text-center">
                {/* TODO(icons): swap 😢 for brand <Sad> / empty-state SVG */}
                <span className="text-5xl block mb-3" aria-hidden="true">😢</span>
                <p className="font-display text-foreground font-semibold mb-1">
                  Nismo pronašli ništa na samoj ruti
                </p>
                <p className="text-muted text-sm mb-6">
                  Nema ćevapnica između <strong>{cityA}</strong> i <strong>{cityB}</strong> unutar <strong>{radius} km</strong> od ceste.
                  Pokušaj povećati radijus pretrage.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {(RADIUS_OPTIONS.filter((r) => r > radius) as RadiusKm[]).map((bigger) => (
                    <button
                      key={bigger}
                      onClick={() => handleIncreaseRadius(bigger)}
                      className="font-display flex items-center gap-2 px-5 py-2.5 rounded-chip bg-primary text-primary-fg font-bold text-sm hover:bg-vatra-hover transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Povećaj radijus → {bigger} km
                    </button>
                  ))}
                  {radius === (Math.max(...RADIUS_OPTIONS) as RadiusKm) && (
                    <p className="text-muted text-xs">
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
// STYLE_EMOJIS — categorical content markers per cevap-style (same precedent
// as RestaurantCard, QuickLogModal, GoogleCevapMap STYLE_PILLS).
const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski: "🕌", "Banjalučki": "🌊", "Travnički": "⛰️", "Leskovački": "🌶️", Ostalo: "🔥",
};

function RouteResultRow({ restaurant, index }: { restaurant: AnyRouteRestaurant; index: number }) {
  const t          = useTranslations("routePlanner");
  const isPlaces   = restaurant.source === "places";
  const isWaypoint = restaurant.source === "waypoint";
  const isGoogle   = isPlaces || isWaypoint;
  const taUrl      = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="font-display w-8 h-8 rounded-chip flex items-center justify-center flex-shrink-0 text-sm font-bold bg-primary/15 text-primary">
        {index}
      </div>
      <div className="w-10 h-10 rounded-chip flex items-center justify-center text-xl flex-shrink-0 bg-surface">
        {/* TODO(icons): per-style emoji are categorical content markers */}
        <span aria-hidden="true">{STYLE_EMOJIS[restaurant.style ?? ""] ?? "🔥"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-bold text-foreground text-sm truncate">
            {restaurant.name}
          </h3>
          {restaurant.is_verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          {isWaypoint && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-ember-green/30 bg-ember-green/10 text-ember-green flex-shrink-0">
              {/* TODO(icons): swap 🚗 for brand <Car> / <Route> */}
              <span aria-hidden="true">🚗</span> Na ruti
            </span>
          )}
          {isPlaces && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400 flex-shrink-0">
              <Globe className="w-2.5 h-2.5" /> Google
            </span>
          )}
        </div>
        <p className="text-xs text-muted truncate">{restaurant.city} · {restaurant.address}</p>
        {isGoogle
          ? restaurant.lepinja_rating > 0 && (
              <p className="text-xs text-amber-xp mt-1">
                {/* TODO(icons): swap ⭐ for <Star> Lucide */}
                <span aria-hidden="true">⭐</span> {restaurant.lepinja_rating.toFixed(1)} / 5
              </p>
            )
          : <LepinjaRating rating={restaurant.lepinja_rating} size="sm" className="mt-1" />
        }
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-display text-sm font-bold text-primary">
          {restaurant.distanceKm.toFixed(1)} km
        </div>
        <div className="text-xs text-muted">od rute</div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
        <DirectionsButton
          name={restaurant.name}
          address={restaurant.address}
          city={restaurant.city}
          lat={restaurant.latitude}
          lng={restaurant.longitude}
        />
        <a
          href={taUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={t("tripAdvisor")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/15 transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="hidden sm:inline">TripAdvisor</span>
          <span className="sm:hidden">TA</span>
        </a>
      </div>
    </div>
  );
}
