"use client";

// ── FinderPage · app-route (Sprint 26al · DS-migrated) ───────────────────────
// Cevap Finder — DB restaurants + Google Places nearby search, grid + map
// views, favorites, style filter, location filter, review modals, journal,
// rulet, submit-place. The biggest single page in the app.
//
// Sprint 26al changes:
//   - All rgb(var(--token)) Tailwind classes → semantic aliases (~58 sites).
//   - 6× style={{fontFamily:"Oswald"}} → font-display class.
//   - Stale-filter notice + places-error notice: amber-400 family → zar-red
//     token family (admin-attention pattern, consistent with RouteMapClient
//     26ah and StatsTab 26n).
//   - Seed-success banner green-500 family → ember-green family (DS confirm).
//   - Seed-error + dbError banners red-500 family → zar-red token family
//     (DS alert).
//   - Favorites heart red-400 → zar-red (DS alert family — heart for favorite
//     fits alert/passion semantic pair, consistent with Sprint 26j
//     FinderFilterBar favorites toggle).
//   - Google Places "G" badge + #4285f4 chrome KEPT as documented external-
//     source categorical marker (precedent: Foursquare blue in SafeMap
//     26ag, RestaurantMapClient 26ah).
//   - "Učitaj još Google rezultata" button: hardcoded #FF6B00 (vatra-hover
//     hex) → vatra-hover token class. Same brand orange, semantic source.
//   - DB "Učitaj još" + Seed CTAs: bg-primary + text-white +
//     hover:bg-primary/0.85 → bg-primary + text-primary-fg + hover:
//     bg-vatra-hover (DS rule — explicit hover token, semantic fill).
//   - rounded-[14px] → rounded-chip (12px, 2px delta imperceptible).
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
//   - 🗺️ / 🍖 / 🔍 / 🥩 / ⚠️ / ❤️ emoji tagged TODO(icons) + aria-hidden.
//   - Stat-row "filtrirano" badge text-primary kept (semantic).
//   - Hero banner gradient bg-gradient-to-br from rgb(var(--surface)/0.9)
//     to rgb(var(--surface)/0.3) → from-surface/90 to-surface/30 (semantic
//     aliases). Decorative blur-3xl orbs use bg-primary/5 + bg-primary/10.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin, Loader2, ServerCrash, SlidersHorizontal,
  CheckCircle, XCircle, RefreshCw, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { usePlacesNearby } from "@/lib/hooks/usePlacesNearby";
import { syncPlacesToSupabase } from "@/lib/actions/harvest";
import { APIProvider } from "@vis.gl/react-google-maps";
import { RestaurantCard } from "@/components/finder/RestaurantCard";
import { RestaurantGridSkeleton } from "@/components/finder/RestaurantCardSkeleton";
import { RestaurantDetailModal, type ProfileTarget } from "@/components/finder/RestaurantDetailModal";
import { CevapRuletModal } from "@/components/finder/CevapRuletModal";
import { QuickLogModal } from "@/components/journal/QuickLogModal";
import { ReviewModal } from "@/components/finder/ReviewModal";
import { SubmitPlaceModal } from "@/components/finder/SubmitPlaceModal";
import { getReviewStatsForPlaces, type PlaceReviewStats } from "@/lib/actions/reviews";
import { FinderFilterBar } from "@/components/finder/FinderFilterBar";
import { PlaceResultCard } from "@/components/finder/PlaceResultCard";
import { CITY_COUNTRY, COUNTRY_CONFIG, resolveCityCoords } from "@/constants/cities";
import { getCoordsFromCity } from "@/lib/actions/discovery";
import type { LocationValue } from "@/components/finder/LocationFilter";
import dynamic from "next/dynamic";
import type { MapRestaurant } from "@/components/finder/RestaurantMap";

const RestaurantMap = dynamic(
  () => import("@/components/finder/RestaurantMap").then(m => ({ default: m.RestaurantMap })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[500px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> }
);

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
function FinderPageInner() {
  const t = useTranslations("finder");

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [dbRestaurants, setDbRestaurants] = useState<Restaurant[]>([]);
  const [dbLoading,     setDbLoading]     = useState(true);
  const [dbError,       setDbError]       = useState<string | null>(null);
  const [totalCount,    setTotalCount]    = useState(0);
  const [page,          setPage]          = useState(0);
  const [loadingMore,   setLoadingMore]   = useState(false);

  const [searchTerm,    setSearchTerm]    = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue>({ country: "", city: "" });
  const [activeStyle,   setActiveStyle]   = useState<CevapStyle | "">("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [staleFilters,  setStaleFilters]  = useState(false);

  const selectedCountry = locationValue.country;
  const selectedCity    = locationValue.city;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("chevapp:finder_state") ?? "{}");
      if (saved.searchTerm)  setSearchTerm(saved.searchTerm);
      if (saved.activeStyle) setActiveStyle(saved.activeStyle as CevapStyle);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("chevapp:finder_state", JSON.stringify({ searchTerm, activeStyle }));
  }, [searchTerm, activeStyle]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});

  const harvestCallback = useCallback(
    (places: import("@/types/places").PlaceResult[], cityName: string) => {
      syncPlacesToSupabase(places, cityName).catch(() => {/* silent */});
    },
    [],
  );

  const {
    placeResults, appendedPins,
    placesLoading, loadingMore: loadingMorePlaces,
    appendingPlaces, placesError, placesSearched,
    hasMorePlaces, tokenReady,
    searchNearby, loadMorePlaces, appendByCoords, clearPlaces,
  } = usePlacesNearby({ onHarvest: harvestCallback });

  const [selectedRestaurant, setSelectedRestaurant] = useState<ProfileTarget | null>(null);
  const [quickLogRestaurant, setQuickLogRestaurant] = useState<Restaurant | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ placeId: string; placeName: string } | null>(null);
  const [submitPlaceOpen, setSubmitPlaceOpen] = useState(false);

  const [reviewStats,     setReviewStats]     = useState<Record<string, PlaceReviewStats>>({});
  const [reviewStatsBump, setReviewStatsBump] = useState(0);

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

  const [selectedMapKey, setSelectedMapKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMapKey || viewMode !== "grid") return;
    document.getElementById(`card-${selectedMapKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedMapKey, viewMode]);

  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  useEffect(() => {
    const ids = [
      ...dbRestaurants.map((r) => r.google_place_id ?? r.id).filter(Boolean),
      ...placeResults.map((r) => r.place_id).filter(Boolean),
    ];
    if (ids.length === 0) return;
    let cancelled = false;
    getReviewStatsForPlaces(ids).then((stats) => {
      if (!cancelled) setReviewStats(stats);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRestaurants.length, placeResults.length, reviewStatsBump]);

  const citiesForCountry = useMemo(() => {
    if (!selectedCountry) return availableCities;
    const fullName = COUNTRY_CONFIG[selectedCountry]?.fullName ?? "";
    return availableCities.filter(
      (city) => CITY_COUNTRY[city.toLowerCase()] === fullName
    );
  }, [availableCities, selectedCountry]);

  const filterKeyRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    const filterKey = `${debouncedSearch}|${selectedCountry}|${selectedCity}|${activeStyle}`;
    const filtersChanged = filterKey !== filterKeyRef.current;

    if (filtersChanged) {
      filterKeyRef.current = filterKey;
      setStaleFilters(false);
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

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    if (!selectedCity) {
      clearPlaces();
      setMapCenter(undefined);
      return;
    }

    clearPlaces();

    let cancelled = false;

    const run = async () => {
      const staticCoords = resolveCityCoords(selectedCity);
      if (staticCoords) {
        if (cancelled) return;
        const center = { lat: staticCoords[0], lng: staticCoords[1] };
        setMapCenter(center);
        searchNearby(center, selectedCity);
        return;
      }

      try {
        const geocoded = await getCoordsFromCity(
          `${selectedCity}${selectedCountry ? `, ${COUNTRY_CONFIG[selectedCountry]?.fullName ?? ""}` : ""}`,
        );
        if (cancelled || !geocoded) return;
        const center = { lat: geocoded.lat, lng: geocoded.lng };
        setMapCenter(center);
        searchNearby(center, selectedCity);
      } catch {
        /* geocode failed — map stays at default */
      }
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedCountry]);

  const toGooglePin = useCallback((r: import("@/types/places").PlaceResult): MapRestaurant => ({
    fsq_id:    r.place_id,
    name:      r.name,
    city:      r.city,
    address:   r.address,
    latitude:  r.latitude,
    longitude: r.longitude,
    source:    "google" as const,
  }), []);

  const mapPins = useMemo<MapRestaurant[]>(() => {
    const dbPins = dbRestaurants.map(toMapPin);

    const googleCandidates = [
      ...(placesSearched ? placeResults : []),
      ...appendedPins,
    ];
    const dedupedGoogle = googleCandidates
      .filter((gp) => !dbRestaurants.some(
        (db) =>
          db.latitude != null &&
          Math.abs(db.latitude  - (gp.latitude  ?? 999)) < 0.002 &&
          Math.abs((db.longitude ?? 0) - (gp.longitude ?? 999)) < 0.002,
      ));

    const seen = new Set<string>();
    const uniqueGoogle = dedupedGoogle.filter((r) => {
      if (seen.has(r.place_id)) return false;
      seen.add(r.place_id);
      return true;
    });

    return [...dbPins, ...uniqueGoogle.map(toGooglePin)];
  }, [dbRestaurants, placeResults, appendedPins, placesSearched, toGooglePin]);

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
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <div className="border-b border-border bg-surface/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-chip bg-primary/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide">
                {t("title")}
              </h1>
              <p className="text-muted text-sm mt-0.5">{t("subtitle")}</p>
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

        {/* Stale filter notice — admin-attention zar-red (DS pattern) */}
        {staleFilters && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-chip border border-zar-red/30 bg-zar-red/5 text-sm mb-4">
            {/* TODO(icons): swap ⚠️ for brand <Warning> */}
            <span aria-hidden="true" className="text-zar-red">⚠️</span>
            <span className="text-zar-red">Sačuvani filteri ne daju rezultate. Provjeri grad ili</span>
            <button onClick={clearFilters} className="text-zar-red font-semibold hover:underline">poništi filtere</button>
          </div>
        )}

        {/* Seed result alert — ember-green confirm OR zar-red alert */}
        {seedMsg && (
          <div className={cn("flex items-center gap-2 px-4 py-3 rounded-chip border text-sm mb-4",
            seedMsg.ok
              ? "border-ember-green/40 bg-ember-green/10 text-ember-green"
              : "border-zar-red/40 bg-zar-red/10 text-zar-red")}>
            {seedMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{seedMsg.text}</span>
            <button
              onClick={() => setSeedMsg(null)}
              aria-label="Zatvori"
              className="ml-auto text-muted hover:text-foreground"
            >×</button>
          </div>
        )}

        {/* Google Places info banner — kept #4285f4 as documented external-source marker */}
        {placesSearched && !placesLoading && placeResults.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-chip border border-[#4285f4]/25 bg-[#4285f4]/5 text-sm mb-4">
            <span className="text-[#4285f4] text-base font-bold">G</span>
            <span className="text-muted">
              Google Places:{" "}
              <span className="text-foreground font-medium">
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

        {/* Places API error — admin-attention zar-red */}
        {placesError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-chip border border-zar-red/30 bg-zar-red/5 text-sm mb-4">
            {/* TODO(icons): swap ⚠️ for brand <Warning> */}
            <span aria-hidden="true" className="text-zar-red">⚠️</span>
            <span className="text-zar-red">{placesError}</span>
          </div>
        )}

        {/* DB error — destructive zar-red */}
        {dbError && (
          <div role="alert" className="flex items-start gap-3 px-4 py-4 rounded-chip border border-zar-red/30 bg-zar-red/5 mb-5">
            <ServerCrash className="w-5 h-5 text-zar-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-zar-red">{dbError}</p>
              <p className="text-xs text-muted mt-1">Provjeri Vercel → Settings → Environment Variables i Supabase → Authentication → Policies.</p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-muted">
            {dbLoading ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Učitavanje...</span>
            ) : (
              <>
                <span>
                  <span className="text-foreground font-medium">{dbRestaurants.length}</span>
                  {totalCount > dbRestaurants.length && (
                    <span className="text-muted"> / {totalCount}</span>
                  )} verificiranih lokacija
                  {hasActiveFilters && <span className="text-primary ml-1">(filtrirano)</span>}
                </span>
                {placesSearched && (
                  <span>+ <span className="text-[#4285f4] font-medium">{placeResults.length}</span> Google Places</span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubmitPlaceOpen(true)}
              className="font-display flex items-center gap-1.5 px-3 py-1.5 rounded-chip border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
            >
              + Predloži mjesto
            </button>

            {!dbLoading && dbRestaurants.length === 0 && !dbError && !hasActiveFilters && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-primary text-primary-fg text-xs font-semibold hover:bg-vatra-hover transition-colors disabled:opacity-60"
              >
                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {seeding ? "Seeding..." : "Seed bazu podataka"}
              </button>
            )}
          </div>
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
              onSearchArea={(lat, lng) => appendByCoords(lat, lng, selectedCity ?? undefined)}
              searchingArea={appendingPlaces}
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-card border border-dashed border-border">
              {/* TODO(icons): swap 🗺️ for brand <Karta> */}
              <span className="text-5xl" aria-hidden="true">🗺️</span>
              <p className="font-display font-semibold text-foreground">
                Odaberi grad za prikaz mape
              </p>
              <p className="text-sm text-muted">Upiši grad ili odaberi stil ćevapa iznad.</p>
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
                {/* TODO(icons): swap 🍖 for brand <Cevapi> */}
                <span className="text-6xl" aria-hidden="true">🍖</span>
                <p className="font-display text-foreground font-semibold text-lg">Nema restorana u bazi</p>
                <p className="text-muted text-sm text-center max-w-sm">Klikni ispod za automatsko punjenje baze s 6 legendarnih mjesta, ili upiši grad iznad.</p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-chip bg-primary text-primary-fg font-semibold text-sm hover:bg-vatra-hover transition-colors disabled:opacity-60"
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {seeding ? "Seeding..." : "Seed 6 legendarnih restorana"}
                </button>
              </div>

            ) : visibleDbRestaurants.length === 0 && hasActiveFilters && !(placesSearched && visiblePlaceResults.length > 0) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                {/* TODO(icons): swap 🔍 for <Search> Lucide */}
                <span className="text-5xl" aria-hidden="true">🔍</span>
                <p className="font-display text-foreground font-semibold">Nema rezultata</p>
                <p className="text-muted text-sm text-center max-w-xs">Nijedan restoran ne odgovara odabranim filterima.</p>
                <button onClick={clearFilters} className="mt-1 text-xs text-primary hover:underline">Obriši filtere</button>
              </div>

            ) : (
              <>
                {/* Hero banner — idle state (no filters) */}
                {!hasActiveFilters && !placesSearched && (
                  <div className="py-16 px-6 rounded-card border border-border bg-gradient-to-br from-surface/90 to-surface/30 text-center relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                      {/* TODO(icons): swap 🥩 for brand <Cevapi> */}
                      <div className="text-5xl mb-4" aria-hidden="true">🥩</div>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                        {t("heroTitle")}
                      </h2>
                      <p className="text-muted max-w-md mx-auto text-sm leading-relaxed mb-6">
                        {t("heroSubtitle")}
                      </p>
                      <p className="text-xs text-muted uppercase tracking-widest font-medium">
                        ↑ Upiši grad ili odaberi stil ćevapa iznad da počneš
                      </p>
                    </div>
                  </div>
                )}

                {/* Verified DB grid */}
                {(hasActiveFilters || placesSearched) && visibleDbRestaurants.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs text-muted uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3 h-3" />
                      Verificirani restorani ({dbRestaurants.length}{totalCount > dbRestaurants.length ? ` / ${totalCount}` : ""})
                      {favOnly && (
                        <span className="text-zar-red ml-1">
                          {/* TODO(icons): swap ❤️ for <Heart> Lucide */}
                          · Samo favoriti <span aria-hidden="true">❤️</span>
                        </span>
                      )}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {visibleDbRestaurants.map((r) => (
                        <div
                          key={r.id}
                          id={`card-${r.id}`}
                          onClick={() => setSelectedMapKey(r.id === selectedMapKey ? null : r.id)}
                          className={cn(
                            "rounded-card transition-all cursor-pointer",
                            selectedMapKey === r.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          )}
                        >
                          <RestaurantCard
                            restaurant={r}
                            avgRating={avgRatings[r.id] ?? null}
                            reviewStats={reviewStats[r.google_place_id ?? r.id] ?? null}
                            onProfileClick={() => setSelectedRestaurant({ id: r.id, name: r.name, city: r.city, address: r.address, is_verified: r.is_verified, rating: avgRatings[r.id] ?? r.rating ?? null })}
                            onAddToJournal={() => setQuickLogRestaurant(r)}
                            onReviewClick={() => setReviewTarget({ placeId: r.google_place_id ?? r.id, placeName: r.name })}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={loadingMore}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-chip border border-border text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 active:scale-95"
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
                        <div key={i} className="rounded-card border border-[#4285f4]/20 bg-surface/40 p-5 animate-pulse">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-border" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-border rounded w-3/4" />
                              <div className="h-3 bg-border rounded w-1/2" />
                            </div>
                          </div>
                          <div className="h-3 bg-border rounded w-full mb-2" />
                          <div className="h-3 bg-border rounded w-2/3" />
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
                      {favOnly && (
                        <span className="text-zar-red ml-1">
                          · Samo favoriti <span aria-hidden="true">❤️</span>
                        </span>
                      )}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {visiblePlaceResults.map((r) => (
                        <PlaceResultCard
                          key={r.place_id}
                          result={r}
                          isSelected={r.place_id === selectedMapKey}
                          reviewStats={reviewStats[r.place_id] ?? null}
                          onSelect={() => setSelectedMapKey(r.place_id === selectedMapKey ? null : r.place_id)}
                          onProfileClick={setSelectedRestaurant}
                          onReviewClick={() => setReviewTarget({ placeId: r.place_id, placeName: r.name })}
                        />
                      ))}
                      {/* Skeleton cards while Load More is in-flight */}
                      {loadingMorePlaces && [1, 2, 3].map((i) => (
                        <div key={`lm-skeleton-${i}`} className="rounded-card border border-[#4285f4]/20 bg-surface/40 p-5 animate-pulse">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-border" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-border rounded w-3/4" />
                              <div className="h-3 bg-border rounded w-1/2" />
                            </div>
                          </div>
                          <div className="h-3 bg-border rounded w-full mb-2" />
                          <div className="h-3 bg-border rounded w-2/3" />
                        </div>
                      ))}
                    </div>

                    {/* Load More — uses vatra-hover (the brighter brand orange) */}
                    {hasMorePlaces && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMorePlaces}
                          disabled={!tokenReady || loadingMorePlaces}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-chip border border-vatra-hover/30 text-sm font-semibold text-vatra-hover hover:bg-vatra-hover/10 transition-all disabled:opacity-40 active:scale-95"
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
                  <div className="mt-6 rounded-chip border border-dashed border-border p-8 text-center">
                    <p className="text-muted text-sm">
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

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal
          placeId={reviewTarget.placeId}
          placeName={reviewTarget.placeName}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewStatsBump((n) => n + 1)}
        />
      )}

      {/* Submit-place modal */}
      {submitPlaceOpen && (
        <SubmitPlaceModal
          onClose={() => setSubmitPlaceOpen(false)}
          defaultCity={selectedCity || undefined}
        />
      )}
    </div>
  );
}

// ── Root export — wraps everything in APIProvider ─────────────────────────────
export default function FinderPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      <FinderPageInner />
    </APIProvider>
  );
}
