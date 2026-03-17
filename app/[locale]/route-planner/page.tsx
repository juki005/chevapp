"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  Route, MapPin, Navigation, Loader2, AlertCircle, CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolveCityCoords } from "@/constants/cities";
import { filterByRoute } from "@/lib/geo";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import type { Restaurant } from "@/types";
import type { RouteRestaurant, SearchArgs } from "@/components/finder/RouteMapClient";

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

export default function RoutePlannerPage() {
  const tNav = useTranslations("nav");

  const [cityA,      setCityA]      = useState("");
  const [cityB,      setCityB]      = useState("");
  const [radius,     setRadius]     = useState<RadiusKm>(10);
  const [loading,    setLoading]    = useState(false);
  const [results,    setResults]    = useState<RouteRestaurant[] | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [resolvedA,  setResolvedA]  = useState<string | null>(null);
  const [resolvedB,  setResolvedB]  = useState<string | null>(null);
  const [searchArgs, setSearchArgs] = useState<SearchArgs | null>(null);

  // Cached restaurants from the last Supabase fetch (avoid re-fetching when
  // the user just changes the radius on an existing route).
  const [cachedRestaurants, setCachedRestaurants] = useState<Restaurant[]>([]);

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
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("restaurants")
        .select("*")
        .order("lepinja_rating", { ascending: false });

      if (dbError) throw dbError;

      const all = (data ?? []) as Restaurant[];
      setCachedRestaurants(all);

      if (!API_KEY) {
        // No Maps key → straight-line Haversine search (immediate, no map callback)
        const filtered = filterByRoute(all, coordsA[0], coordsA[1], coordsB[0], coordsB[1], activeRadius) as RouteRestaurant[];
        setResults(filtered);
        setLoading(false);
        return;
      }

      // With Maps key: hand off to the map component which will call the
      // Directions API, sample the polyline, and return filtered results
      // via onSearchComplete — loading stays true until that callback fires.
      setSearchArgs({ coordsA, coordsB, radiusKm: activeRadius, allRestaurants: all });
    } catch (err) {
      setError("Greška pri dohvatu restorana: " + String(err));
      setLoading(false);
    }
  }, [cityA, cityB, radius]);

  // ── Callback from RouteMapClient once Directions + filtering is done ────────
  const handleSearchComplete = useCallback((restaurants: RouteRestaurant[]) => {
    setResults(restaurants);
    setLoading(false);
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
                <button key={r} onClick={() => setRadius(r)}
                  className={`${btnBase} ${radius === r ? btnActive : btnIdle}`}>
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
              <><Loader2 className="w-4 h-4 animate-spin" /> Tražim ćevap stanice…</>
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
                  <RouteResultRow key={r.id} restaurant={r} index={i + 1} />
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

function RouteResultRow({ restaurant, index }: { restaurant: RouteRestaurant; index: number }) {
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
        {STYLE_EMOJIS[restaurant.style] ?? "🔥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-fg text-sm truncate" style={{ fontFamily: "Oswald,sans-serif" }}>
            {restaurant.name}
          </h3>
          {restaurant.is_verified && <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
        </div>
        <p className="text-xs text-fg-muted truncate">{restaurant.city} · {restaurant.address}</p>
        <LepinjaRating rating={restaurant.lepinja_rating} size="sm" className="mt-1" />
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
