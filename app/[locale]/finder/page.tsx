"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin, Loader2, ServerCrash, SlidersHorizontal,
  CheckCircle, XCircle, RefreshCw, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { usePlacesNearby } from "@/lib/hooks/usePlacesNearby";
import { APIProvider } from "@vis.gl/react-google-maps";
import { StyleFilter } from "@/components/finder/StyleFilter";
import { RestaurantCard } from "@/components/finder/RestaurantCard";
import { RestaurantGridSkeleton } from "@/components/finder/RestaurantCardSkeleton";
import { RestaurantDetailModal, type ProfileTarget } from "@/components/finder/RestaurantDetailModal";
import { CevapRuletModal } from "@/components/finder/CevapRuletModal";
import { QuickLogModal } from "@/components/journal/QuickLogModal";
import { FinderFilterBar } from "@/components/finder/FinderFilterBar";
import { PlaceResultCard } from "@/components/finder/PlaceResultCard";
import { CITY_COUNTRY, COUNTRY_CONFIG, resolveCityCoords } from "@/constants/cities";
import { getCoordsFromCity } from "@/lib/actions/discovery";
import type { LocationValue } from "@/components/finder/LocationFilter";
import dynamic from "next/dynamic";
import type { MapRestaurant } from "@/components/finder/RestaurantMap";

const RestaurantMap = dynamic(
  () => import("@/components/finder/RestaurantMap").then(m => ({ default: m.RestaurantMap })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[500px]"><Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" /></div> }
);

import { DirectionsButton } from "@/components/finder/DirectionsButton";
import type { Restaurant, CevapStyle } from "@/types";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "map";
const PAGE_SIZE = 20;

// ── Adapters ──────────────────────────────────────────────────────────────────
function toMapPin(r: Restaurant): MapRestaurant {
  return {
    id:             r.id,
    name:           r.name,
    city:           r.city,
    address:        r.address,
    latitude:       r.latitude,
    longitude:      r.longitude,
    lepinja_rating: r.lepinja_rating,
    is_verified:    r.is_verified,
    tags:           r.tags,
    style:          r.style,
    source:         "supabase",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
// FinderPageInner contains all logic; it must live inside <APIProvider> so that
// usePlacesNearby (which calls useMapsLibrary) can access the Maps context.
function FinderPageInner() {
  const t = useTranslations("finder");

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // ── DB restaurants ─────────────────────────────────────────────────────────
  const [dbRestaurants, setDbRestaurants] = useState<Restaurant[]>([]);
  const [dbLoading,     setDbLoading]     = useState(true);
  const [dbError,       setDbError]       = useState<string | null>(null);
  const [totalCount,    setTotalCount]    = useState(0);
  const [page,          setPage]          = useState(0);
  const [loadingMore,   setLoadingMore]   = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchTerm,    setSearchTerm]    = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue>({ country: "", city: "" });
  const [activeStyle,   setActiveStyle]   = useState<CevapStyle | "">("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [staleFilters,  setStaleFilters]  = useState(false);

  // Convenience aliases used by DB query and derived state below
  const selectedCountry = locationValue.country;
  const selectedCity    = locationValue.city;

  // Restore searchTerm + activeStyle from localStorage on mount
  // (location is restored inside LocationFilter itself)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("chevapp:finder_state") ?? "{}");
      if (saved.searchTerm)  setSearchTerm(saved.searchTerm);
      if (saved.activeStyle) setActiveStyle(saved.activeStyle as CevapStyle);
    } catch { /* ignore */ }
  }, []);

  // Persist searchTerm + activeStyle (location persisted by LocationFilter)
  useEffect(() => {
    localStorage.setItem("chevapp:finder_state", JSON.stringify({ searchTerm, activeStyle }));
  }, [searchTerm, activeStyle]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  // ── Review averages ────────────────────────────────────────────────────────
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});

  // ── Google Places (client-side NearbySearch — no server proxy) ────────────
  // Uses google.maps.places.PlacesService; pagination.nextPage() is native so
  // there are no token-expiry or malformed-request issues.
  const {
    placeResults, placesLoading, loadingMore: loadingMorePlaces,
    placesError, placesSearched,
    hasMorePlaces, tokenReady,
    searchNearby, loadMorePlaces, clearPlaces,
  } = usePlacesNearby();

  // ── Profile modal ──────────────────────────────────────────────────────────
  const [selectedRestaurant, setSelectedRestaurant] = useState<ProfileTarget | null>(null);

  // ── Quick Journal Log ──────────────────────────────────────────────────────
  const [quickLogRestaurant, setQuickLogRestaurant] = useState<Restaurant | null>(null);

  // ── Ćevap-Rulet ───────────────────────────────────────────────────────────
  const [ruletOpen, setRuletOpen] = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    const handler = () => setRuletOpen(true);
    window.addEventListener("chevapp:open_rulet", handler);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("rulet") === "1") {
        setRuletOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    return () => window.removeEventListener("chevapp:open_rulet", handler);
  }, []);

  // ── Favorites filter ───────────────────────────────────────────────────────
  const [favOnly,      setFavOnly]      = useState(false);
  const [favPlaceKeys, setFavPlaceKeys] = useState<string[]>([]);
  const [favDbIds,     setFavDbIds]     = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavPlaceKeys(JSON.parse(localStorage.getItem("chevapp:place_favorites") ?? "[]") as string[]);
    } catch { /* ignore */ }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_favorites").select("restaurant_id").eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setFavDbIds((data as { restaurant_id: string }[]).map((r) => r.restaurant_id));
        });
    });
  }, []);

  // ── Map ↔ List selection sync ──────────────────────────────────────────────
  const [selectedMapKey, setSelectedMapKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMapKey || viewMode !== "grid") return;
    document.getElementById(`card-${selectedMapKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedMapKey, viewMode]);

  // ── Seed helper ────────────────────────────────────────────────────────────
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── City list + review averages ────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.from("restaurants").select("city").then(({ data }) => {
      if (data) setAvailableCities([...new Set((data as { city: string }[]).map((r) => r.city))].sort());
    });
    supabase.from("reviews").select("restaurant_id, rating").then(({ data }) => {
      if (!data) return;
      const sums: Record<string, { sum: number; count: number }> = {};
      for (const row of (data as { restaurant_id: string; rating: number }[])) {
        if (!sums[row.restaurant_id]) sums[row.restaurant_id] = { sum: 0, count: 0 };
        sums[row.restaurant_id].sum   += row.rating;
        sums[row.restaurant_id].count += 1;
      }
      setAvgRatings(Object.fromEntries(Object.entries(sums).map(([id, { sum, count }]) => [id, sum / count])));
    });
  }, []);

  // Cities in the selected country — used for DB "country filter without city"
  const citiesForCountry = useMemo(() => {
    if (!selectedCountry) return availableCities;
    const fullName = COUNTRY_CONFIG[selectedCountry]?.fullName ?? "";
    return availableCities.filter(
      (city) => CITY_COUNTRY[city.toLowerCase()] === fullName
    );
  }, [availableCities, selectedCountry]);

  // ── DB pagination fetch ────────────────────────────────────────────────────
  // Single effect handles both filter resets and load-more to avoid the
  // two-effect race condition where `setPage(0)` schedules a re-render but the
  // fetch effect in the same commit still sees the old page value, causing a
  // spurious append before the correct replace.
  //
  // Strategy (filterKeyRef):
  //   • When filters change AND page > 0: reset page and return early.
  //     The resulting re-render (page=0) triggers the actual fetch.
  //   • When filters change AND page === 0: fetch page 0 (replace).
  //   • When only page changes (Load More): fetch that page (append).
  const filterKeyRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    const filterKey = `${debouncedSearch}|${selectedCountry}|${selectedCity}|${activeStyle}`;
    const filtersChanged = filterKey !== filterKeyRef.current;

    if (filtersChanged) {
      filterKeyRef.current = filterKey;
      setStaleFilters(false);
      // If already past page 0, reset — the re-render will re-run this effect
      // with page=0 and filtersChanged=false, doing the real fetch cleanly.
      if (page !== 0) {
        setPage(0);
        return;
      }
    }

    const isFirstPage = page === 0;

    const load = async () => {
      if (isFirstPage) setDbLoading(true);
      else             setLoadingMore(true);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        if (!cancelled) {
          setDbError("NEXT_PUBLIC_SUPABASE_URL ili NEXT_PUBLIC_SUPABASE_ANON_KEY nije postavljen.");
          setDbLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const from     = page * PAGE_SIZE;
        const to       = from + PAGE_SIZE - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from("restaurants")
          .select("*", { count: "exact" })
          .order("lepinja_rating", { ascending: false })
          .range(from, to);

        if (debouncedSearch.trim()) q = q.ilike("name", `%${debouncedSearch.trim()}%`);
        if (selectedCity) {
          q = q.eq("city", selectedCity);
        } else if (selectedCountry && citiesForCountry.length > 0) {
          q = q.in("city", citiesForCountry);
        }
        if (activeStyle) q = q.eq("style", activeStyle);

        const { data, error, count } = await q;

        if (cancelled) return;
        if (error) { console.error("[finder] Supabase query failed", error); throw error; }

        const rows = (data as Restaurant[]) ?? [];

        if (isFirstPage) {
          setDbRestaurants(rows);
          if (rows.length === 0 && (selectedCity || activeStyle || debouncedSearch)) {
            setStaleFilters(true);
          }
        } else {
          setDbRestaurants((prev) => [...prev, ...rows]);
        }

        setTotalCount(count ?? 0);
        setDbError(null);
      } catch (err: unknown) {
        if (!cancelled) {
          const e = err as { code?: string; message?: string };
          const hint = e.code === "42501" ? " (RLS blokira čitanje)" : e.code === "42703" ? " (nepostojeća kolona)" : e.code ? ` (${e.code})` : "";
          setDbError(`Greška pri učitavanju baze${hint}. Detalji u konzoli.`);
        }
      } finally {
        if (!cancelled) {
          setDbLoading(false);
          setLoadingMore(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCountry, selectedCity, activeStyle, page]);


  // ── Tagged place IDs (crowdsourced style sync) ─────────────────────────────
  const [taggedPlaceIds, setTaggedPlaceIds] = useState<Set<string>>(new Set());

  const refreshTaggedIds = useCallback(() => {
    if (!activeStyle || placeResults.length === 0) { setTaggedPlaceIds(new Set()); return; }
    const supabase = createClient();
    supabase.from("restaurants").select("google_place_id").eq("style", activeStyle).not("google_place_id", "is", null)
      .then(({ data }) => {
        setTaggedPlaceIds(new Set(
          (data ?? []).map((r: { google_place_id: string | null }) => r.google_place_id ?? "").filter(Boolean)
        ));
      });
  }, [activeStyle, placeResults.length]);

  useEffect(() => { refreshTaggedIds(); }, [refreshTaggedIds]);

  useEffect(() => {
    const handler = () => refreshTaggedIds();
    window.addEventListener("chevapp:restaurant_tagged", handler);
    return () => window.removeEventListener("chevapp:restaurant_tagged", handler);
  }, [refreshTaggedIds]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(searchTerm || selectedCountry || selectedCity || activeStyle || favOnly);

  const visibleDbRestaurants = favOnly
    ? dbRestaurants.filter((r) => favDbIds.includes(r.id))
    : dbRestaurants;

  const visiblePlaceResults = (() => {
    let results = favOnly
      ? placeResults.filter((r) => favPlaceKeys.includes(`${r.name}::${r.city}`))
      : placeResults;
    if (activeStyle && taggedPlaceIds.size > 0)
      results = results.filter((r) => taggedPlaceIds.has(r.place_id));
    // Local name filter — no extra API call; text search drives DB via SQL,
    // Google results are filtered here in-memory for instant response.
    if (debouncedSearch.trim())
      results = results.filter((r) =>
        r.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    return results;
  })();

  const clearFilters = () => {
    setSearchTerm("");
    setLocationValue({ country: "", city: "" });
    setActiveStyle("");
    setFavOnly(false);
    setStaleFilters(false);
    localStorage.removeItem("chevapp:finder_state");
    localStorage.removeItem("chevapp_last_location");
  };

  const hasMore = dbRestaurants.length < totalCount;

  // ── Map center — static lookup first, geocode fallback for diaspora cities ──
  // resolveCityCoords covers all Balkan cities instantly (no API call).
  // For cities not in the static map (Vienna, Berlin, Amsterdam, etc.) we
  // geocode via getCoordsFromCity so the map still zooms to the right place.
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    if (!selectedCity) { setMapCenter(undefined); return; }

    // 1. Fast path — static lookup
    const staticCoords = resolveCityCoords(selectedCity);
    if (staticCoords) {
      setMapCenter({ lat: staticCoords[0], lng: staticCoords[1] });
      return;
    }

    // 2. Slow path — geocode via Google (for diaspora / unknown cities)
    let cancelled = false;
    getCoordsFromCity(`${selectedCity}${selectedCountry ? `, ${COUNTRY_CONFIG[selectedCountry]?.fullName ?? ""}` : ""}`)
      .then((coords) => {
        if (!cancelled && coords) setMapCenter({ lat: coords.lat, lng: coords.lng });
      })
      .catch(() => { /* silently fail — map stays at region default */ });

    return () => { cancelled = true; };
  }, [selectedCity, selectedCountry]);

  // ── Auto-search Google Places when city + coords are both ready ─────────────
  // searchByCoords REPLACES results (fresh city search).
  // appendByCoords APPENDS deduped results ("Pretraži ovo područje" button).
  // debouncedSearch is now a LOCAL filter on placeResults — no extra API call.
  const prevSearchCityRef = useRef("");
  useEffect(() => {
    if (!selectedCity) {
      prevSearchCityRef.current = "";
      clearPlaces();
      return;
    }
    // Diaspora cities geocode asynchronously — wait for coords before searching
    if (!mapCenter) return;
    // Guard: don't re-fire for the same city on unrelated re-renders
    if (selectedCity === prevSearchCityRef.current) return;
    prevSearchCityRef.current = selectedCity;
    // Native NearbySearch — city-scoped by coords + radius, no proxy needed
    searchNearby(mapCenter, selectedCity);
  // searchByCoords and clearPlaces are stable useCallbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCenter, selectedCity]);

  // Map pins — DB + Google Places (deduped by proximity).
  // useMemo gives a stable array reference: ImperativeMarkers only rebuilds
  // markers when the underlying data changes, not on every unrelated render.
  const mapPins = useMemo<MapRestaurant[]>(() => [
    ...dbRestaurants.map(toMapPin),
    ...(placesSearched && placeResults.length > 0
      ? placeResults
          .map((r) => ({
            fsq_id:    r.place_id,
            name:      r.name,
            city:      r.city,
            address:   r.address,
            latitude:  r.latitude,
            longitude: r.longitude,
            source:    "google" as const,
          }))
          .filter((gp) => !dbRestaurants.some((db) =>
            db.latitude != null &&
            Math.abs(db.latitude  - (gp.latitude  ?? 999)) < 0.002 &&
            Math.abs((db.longitude ?? 0) - (gp.longitude ?? 999)) < 0.002
          ))
      : []),
  ], [dbRestaurants, placeResults, placesSearched]);

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg(null);
    try {
      const res  = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSeedMsg({ ok: true, text: json.message });
        setDbError(null);
        createClient().from("restaurants").select("city").then(({ data }) => {
          if (data) setAvailableCities([...new Set((data as { city: string }[]).map((r) => r.city))].sort());
        });
      } else {
        setSeedMsg({ ok: false, text: json.error ?? "Seed nije uspio." });
      }
    } catch (err) {
      setSeedMsg({ ok: false, text: String(err) });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">

      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--foreground))] uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif" }}>
                {t("title")}
              </h1>
              <p className="text-[rgb(var(--muted))] text-sm mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Filter Bar */}
        <FinderFilterBar
          searchTerm={searchTerm}             onSearchChange={setSearchTerm}
          placesLoading={placesLoading}
          locationValue={locationValue}       onLocationChange={setLocationValue}
          viewMode={viewMode}                 onViewModeChange={setViewMode}
          activeStyle={activeStyle}           onStyleChange={(s) => setActiveStyle(s as CevapStyle | "")}
          favOnly={favOnly}                   onFavOnlyChange={setFavOnly}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onOpenRulet={() => setRuletOpen(true)}
        />

        {/* Stale filter notice */}
        {staleFilters && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-400/8 text-sm mb-4">
            <span className="text-amber-400">⚠️</span>
            <span className="text-amber-300">Sačuvani filteri ne daju rezultate. Provjeri grad ili</span>
            <button onClick={clearFilters} className="text-amber-400 font-semibold hover:underline">poništi filtere</button>
          </div>
        )}

        {/* Alerts */}
        {seedMsg && (
          <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl border text-sm mb-4", seedMsg.ok ? "border-green-500/40 bg-green-500/8 text-green-300" : "border-red-500/40 bg-red-500/8 text-red-300")}>
            {seedMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{seedMsg.text}</span>
            <button onClick={() => setSeedMsg(null)} className="ml-auto text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">×</button>
          </div>
        )}

        {placesSearched && !placesLoading && placeResults.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#4285f4]/25 bg-[#4285f4]/5 text-sm mb-4">
            <span className="text-[#4285f4] text-base font-bold">G</span>
            <span className="text-[rgb(var(--muted))]">
              Google Places:{" "}
              <span className="text-[rgb(var(--foreground))] font-medium">
                {placeResults.length} lokacija
              </span>{" "}
              pronađeno za &ldquo;{selectedCity}&rdquo;
              {loadingMorePlaces && (
                <span className="ml-2 inline-flex items-center gap-1 text-[#4285f4]">
                  <Loader2 className="w-3 h-3 animate-spin" /> učitavam još…
                </span>
              )}
            </span>
          </div>
        )}

        {placesError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 text-sm mb-4">
            <span className="text-amber-400">⚠️</span>
            <span className="text-amber-300">{placesError}</span>
          </div>
        )}

        {dbError && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-red-500/30 bg-red-500/5 mb-5">
            <ServerCrash className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{dbError}</p>
              <p className="text-xs text-[rgb(var(--muted))] mt-1">Provjeri Vercel → Settings → Environment Variables i Supabase → Authentication → Policies.</p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
            {dbLoading ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Učitavanje...</span>
            ) : (
              <>
                <span>
                  <span className="text-[rgb(var(--foreground))] font-medium">{dbRestaurants.length}</span>
                  {totalCount > dbRestaurants.length && (
                    <span className="text-[rgb(var(--muted))]"> / {totalCount}</span>
                  )} verificiranih lokacija
                  {hasActiveFilters && <span className="text-[rgb(var(--primary))] ml-1">(filtrirano)</span>}
                </span>
                {placesSearched && (
                  <span>+ <span className="text-[#4285f4] font-medium">{placeResults.length}</span> Google Places</span>
                )}
              </>
            )}
          </div>

          {!dbLoading && dbRestaurants.length === 0 && !dbError && !hasActiveFilters && (
            <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] text-white text-xs font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-60">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {seeding ? "Seeding..." : "Seed bazu podataka"}
            </button>
          )}
        </div>

        {/* MAP VIEW */}
        {viewMode === "map" && (
          hasActiveFilters || placesSearched ? (
            <RestaurantMap
              restaurants={mapPins}
              height="520px"
              defaultCenter={mapCenter}
              activeStyle={activeStyle || null}
              onStyleChange={(s) => setActiveStyle(s as CevapStyle | "")}
              searchingArea={false}
              onOpenProfile={(pin) => {
                if (pin.id) {
                  const r = dbRestaurants.find((db) => db.id === pin.id);
                  setSelectedRestaurant({ id: pin.id, name: pin.name, city: pin.city, address: pin.address, lat: pin.latitude, lng: pin.longitude, is_verified: r?.is_verified ?? pin.is_verified, rating: (r ? (avgRatings[r.id] ?? r.rating) : null) ?? null });
                } else if (pin.fsq_id) {
                  setSelectedRestaurant({ google_place_id: pin.fsq_id, name: pin.name, city: pin.city, address: pin.address, lat: pin.latitude, lng: pin.longitude });
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl border border-dashed border-[rgb(var(--border))]">
              <span className="text-5xl">🗺️</span>
              <p className="font-semibold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                Odaberi grad za prikaz mape
              </p>
              <p className="text-sm text-[rgb(var(--muted))]">Upiši grad ili odaberi stil ćevapa iznad.</p>
            </div>
          )
        )}

        {/* GRID VIEW */}
        {viewMode === "grid" && (
          <div>
            {dbLoading ? (
              <RestaurantGridSkeleton />

            ) : visibleDbRestaurants.length === 0 && !placesSearched && !hasActiveFilters ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-6xl">🍖</span>
                <p className="text-[rgb(var(--foreground))] font-semibold text-lg" style={{ fontFamily: "Oswald, sans-serif" }}>Nema restorana u bazi</p>
                <p className="text-[rgb(var(--muted))] text-sm text-center max-w-sm">Klikni ispod za automatsko punjenje baze s 6 legendarnih mjesta, ili upiši grad iznad.</p>
                <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white font-semibold text-sm hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-60">
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {seeding ? "Seeding..." : "Seed 6 legendarnih restorana"}
                </button>
              </div>

            ) : visibleDbRestaurants.length === 0 && hasActiveFilters && !(placesSearched && visiblePlaceResults.length > 0) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl">🔍</span>
                <p className="text-[rgb(var(--foreground))] font-semibold" style={{ fontFamily: "Oswald, sans-serif" }}>Nema rezultata</p>
                <p className="text-[rgb(var(--muted))] text-sm text-center max-w-xs">Nijedan restoran ne odgovara odabranim filterima.</p>
                <button onClick={clearFilters} className="mt-1 text-xs text-[rgb(var(--primary))] hover:underline">Obriši filtere</button>
              </div>

            ) : (
              <>
                {/* ── Hero banner — idle state (no filters) ─────────────── */}
                {!hasActiveFilters && !placesSearched && (
                  <div className="py-16 px-6 rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface)/0.9)] to-[rgb(var(--surface)/0.3)] text-center relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-[rgb(var(--primary)/0.08)] blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-[rgb(var(--primary)/0.05)] blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                      <div className="text-5xl mb-4">🥩</div>
                      <h2
                        className="text-3xl md:text-4xl font-bold text-[rgb(var(--foreground))] mb-3"
                        style={{ fontFamily: "Oswald, sans-serif" }}
                      >
                        {t("heroTitle")}
                      </h2>
                      <p className="text-[rgb(var(--muted))] max-w-md mx-auto text-sm leading-relaxed mb-6">
                        {t("heroSubtitle")}
                      </p>
                      <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
                        ↑ Upiši grad ili odaberi stil ćevapa iznad da počneš
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Full verified grid — only shown when filters are active */}
                {(hasActiveFilters || placesSearched) && visibleDbRestaurants.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3 h-3" />
                      Verificirani restorani ({dbRestaurants.length}{totalCount > dbRestaurants.length ? ` / ${totalCount}` : ""})
                      {favOnly && <span className="text-red-400 ml-1">· Samo favoriti ❤️</span>}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {visibleDbRestaurants.map((r) => (
                        <div
                          key={r.id}
                          id={`card-${r.id}`}
                          onClick={() => setSelectedMapKey(r.id === selectedMapKey ? null : r.id)}
                          className={cn("rounded-2xl transition-all cursor-pointer", selectedMapKey === r.id ? "ring-2 ring-[rgb(var(--primary))] ring-offset-2 ring-offset-[rgb(var(--background))]" : "")}
                        >
                          <RestaurantCard
                            restaurant={r}
                            avgRating={avgRatings[r.id] ?? null}
                            onProfileClick={() => setSelectedRestaurant({ id: r.id, name: r.name, city: r.city, address: r.address, is_verified: r.is_verified, rating: avgRatings[r.id] ?? r.rating ?? null })}
                            onAddToJournal={() => setQuickLogRestaurant(r)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* ── Load More ──────────────────────────────────────── */}
                    {hasMore && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={loadingMore}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-[14px] border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--primary))] transition-all disabled:opacity-50 active:scale-95"
                        >
                          {loadingMore ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Učitavam…</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Učitaj još ({totalCount - dbRestaurants.length} preostalo)</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Google Places loading skeleton */}
                {placesLoading && (
                  <div>
                    <p className="text-xs text-[#4285f4] uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                      <span className="font-bold">G</span> Google Places — pretražujem&hellip;
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border border-[#4285f4]/20 bg-[rgb(var(--surface)/0.4)] p-5 animate-pulse">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[rgb(var(--border))]" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-[rgb(var(--border))] rounded w-3/4" />
                              <div className="h-3 bg-[rgb(var(--border))] rounded w-1/2" />
                            </div>
                          </div>
                          <div className="h-3 bg-[rgb(var(--border))] rounded w-full mb-2" />
                          <div className="h-3 bg-[rgb(var(--border))] rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Google Places grid */}
                {placesSearched && visiblePlaceResults.length > 0 && (
                  <div>
                    <p className="text-xs text-[#4285f4] uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                      <span className="font-bold">G</span>
                      Google Places — &ldquo;{selectedCity}&rdquo; ({placeResults.length})
                      {loadingMorePlaces && <Loader2 className="w-3 h-3 animate-spin" />}
                      {favOnly && <span className="text-red-400 ml-1">· Samo favoriti ❤️</span>}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {visiblePlaceResults.map((r) => (
                        <PlaceResultCard
                          key={r.place_id}
                          result={r}
                          isSelected={r.place_id === selectedMapKey}
                          onSelect={() => setSelectedMapKey(r.place_id === selectedMapKey ? null : r.place_id)}
                          onProfileClick={setSelectedRestaurant}
                        />
                      ))}
                      {/* Skeleton cards while Load More is in-flight */}
                      {loadingMorePlaces && [1, 2, 3].map((i) => (
                        <div key={`lm-skeleton-${i}`} className="rounded-2xl border border-[#4285f4]/20 bg-[rgb(var(--surface)/0.4)] p-5 animate-pulse">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[rgb(var(--border))]" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-[rgb(var(--border))] rounded w-3/4" />
                              <div className="h-3 bg-[rgb(var(--border))] rounded w-1/2" />
                            </div>
                          </div>
                          <div className="h-3 bg-[rgb(var(--border))] rounded w-full mb-2" />
                          <div className="h-3 bg-[rgb(var(--border))] rounded w-2/3" />
                        </div>
                      ))}
                    </div>

                    {/* ── Load More button ───────────────────────────────── */}
                    {hasMorePlaces && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMorePlaces}
                          disabled={!tokenReady || loadingMorePlaces}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-[14px] border border-[#FF6B00]/30 text-sm font-semibold text-[#FF6B00] hover:bg-[#FF6B00]/8 transition-all disabled:opacity-40 active:scale-95"
                        >
                          {loadingMorePlaces ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Učitavam jos…</>
                          ) : !tokenReady ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Pričekajte…</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Učitaj još Google rezultata</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {placesSearched && placeResults.length === 0 && !placesLoading && (
                  <div className="mt-6 rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
                    <p className="text-[rgb(var(--muted))] text-sm">
                      Google Places nije pronašao rezultate za &ldquo;{selectedCity}&rdquo;. Provjeri grad ili proširi pretragu.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Restaurant profile modal */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />

      {/* Ćevap-Rulet modal */}
      <CevapRuletModal
        isOpen={ruletOpen}
        onClose={() => setRuletOpen(false)}
        currentCity={selectedCity}
        searchTerm={searchTerm}
        userId={userId}
      />

      {/* Quick Journal Log modal */}
      <QuickLogModal
        restaurant={quickLogRestaurant}
        onClose={() => setQuickLogRestaurant(null)}
      />
    </div>
  );
}

// ── Root export — wraps everything in APIProvider ─────────────────────────────
// APIProvider loads the Google Maps JS SDK once. FinderPageInner uses
// useMapsLibrary("places") which requires this context to be present.
// The map view also benefits because GoogleCevapMap reuses the same loaded SDK.
export default function FinderPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <FinderPageInner />
    </APIProvider>
  );
}
