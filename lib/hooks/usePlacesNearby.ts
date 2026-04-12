"use client";

// ── Client-side Google Places NearbySearch hook ───────────────────────────────
// Uses google.maps.places.PlacesService directly in the browser.
// MUST be used inside a component that is wrapped by <APIProvider>.
//
// Architecture (Sprint 8 — Hybrid Harvester):
//
//   searchNearby(coords, city)
//     → NearbySearch for city (15 km radius)
//     → Iron Wall: filter results to city-matching places only
//     → placeResults (list view) + harvest callback
//     → pagination stored for loadMorePlaces
//
//   loadMorePlaces()
//     → pagination.nextPage() — NO params, no token string
//     → results appended to placeResults after Iron Wall filter
//     → harvest callback with new places
//
//   appendByCoords(lat, lng)
//     → Map "Search This Area" button
//     → Results go into appendedPins ONLY (map view)
//     → NEVER injected into placeResults (Iron Wall: list ≠ map)
//     → harvest callback with all map results (city-agnostic)
//
// Why not a server proxy?
//   REST API next_page_token is one-time-use, 2-min expiry, cached by CDN.
//   Multiple users sharing the same token → only first Load More works.
//   PlacesService + pagination.nextPage() avoids this entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { PlaceResult } from "@/types/places";

const KEYWORD =
  "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill";
const RADIUS = 15_000; // 15 km — covers city + suburbs

// ── Iron Wall city filter ─────────────────────────────────────────────────────
// Accept a result if the city name appears anywhere in its address or city field.
// This is intentionally lenient — we only reject results that CLEARLY belong to
// another city (i.e. their address doesn't mention the target city at all).
function matchesCity(result: PlaceResult, cityName: string): boolean {
  if (!cityName) return true;
  const city = cityName.toLowerCase();
  return (
    result.city.toLowerCase().includes(city) ||
    result.address.toLowerCase().includes(city)
  );
}

export interface UsePlacesNearbyReturn {
  // ── List view ────────────────────────────────────────────────────────────────
  placeResults:    PlaceResult[];   // city-filtered: used in List View
  placesLoading:   boolean;         // initial searchNearby in-flight
  loadingMore:     boolean;         // loadMorePlaces in-flight
  placesSearched:  boolean;         // true once a search has completed
  hasMorePlaces:   boolean;         // true if pagination.hasNextPage
  tokenReady:      boolean;         // true 2.5 s after page arrives
  placesError:     string | null;

  // ── Map view ─────────────────────────────────────────────────────────────────
  appendedPins:    PlaceResult[];   // map area results — NOT in List (Iron Wall)
  appendingPlaces: boolean;         // appendByCoords in-flight

  // ── Actions ──────────────────────────────────────────────────────────────────
  /** Replace placeResults with a fresh NearbySearch for the given city */
  searchNearby:    (coords: { lat: number; lng: number }, cityName: string) => void;
  /** Append next page via native pagination.nextPage() */
  loadMorePlaces:  () => void;
  /** Map area search — results go into appendedPins ONLY (Iron Wall) */
  appendByCoords:  (lat: number, lng: number) => void;
  clearPlaces:     () => void;

  // ── Harvest callback ──────────────────────────────────────────────────────────
  /** Called with new places after each successful search/load/append.
   *  Parent uses this to fire syncPlacesToSupabase in the background. */
  onNewPlaces?:    never;  // not a prop — see onHarvest in init options
}

export interface UsePlacesNearbyOptions {
  /** Called with newly fetched PlaceResult[] after every successful response.
   *  Fires for searchNearby, loadMorePlaces, and appendByCoords.
   *  Use this for background Supabase harvesting. */
  onHarvest?: (places: PlaceResult[], cityName: string) => void;
}

export function usePlacesNearby(
  options: UsePlacesNearbyOptions = {},
): Omit<UsePlacesNearbyReturn, "onNewPlaces"> {
  const placesLib = useMapsLibrary("places");

  // ── State ─────────────────────────────────────────────────────────────────────
  const [placeResults,    setPlaceResults]    = useState<PlaceResult[]>([]);
  const [appendedPins,    setAppendedPins]    = useState<PlaceResult[]>([]);
  const [placesLoading,   setPlacesLoading]   = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [appendingPlaces, setAppendingPlaces] = useState(false);
  const [placesSearched,  setPlacesSearched]  = useState(false);
  const [hasMorePlaces,   setHasMorePlaces]   = useState(false);
  const [tokenReady,      setTokenReady]      = useState(false);
  const [placesError,     setPlacesError]     = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const serviceRef     = useRef<google.maps.places.PlacesService | null>(null);
  const paginationRef  = useRef<google.maps.places.PlaceSearchPagination | null>(null);
  const appendSvcRef   = useRef<google.maps.places.PlacesService | null>(null);
  const cityNameRef    = useRef<string>("");
  const isLoadMoreRef  = useRef(false);
  const tokenTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHarvestRef   = useRef(options.onHarvest);
  onHarvestRef.current = options.onHarvest; // always latest

  // ── Build PlacesService once the lib is loaded ────────────────────────────────
  useEffect(() => {
    if (!placesLib) return;
    if (!serviceRef.current) {
      serviceRef.current = new placesLib.PlacesService(document.createElement("div"));
    }
    if (!appendSvcRef.current) {
      appendSvcRef.current = new placesLib.PlacesService(document.createElement("div"));
    }
  }, [placesLib]);

  // ── Normalise a Google PlaceResult to our PlaceResult shape ──────────────────
  const normalise = useCallback(
    (p: google.maps.places.PlaceResult, cityOverride?: string): PlaceResult => ({
      place_id:  p.place_id ?? `${p.name}-${Math.random()}`,
      name:      p.name ?? "",
      address:   p.vicinity ?? p.formatted_address ?? "",
      city:      cityOverride ?? cityNameRef.current,
      latitude:  p.geometry?.location?.lat() ?? null,
      longitude: p.geometry?.location?.lng() ?? null,
      rating:    p.rating ?? null,
      open_now:  p.opening_hours?.isOpen?.() ?? null,
      types:     p.types ?? [],
      source:    "google" as const,
    }),
    [],
  );

  // ── Main result handler (searchNearby + loadMorePlaces) ───────────────────────
  // MUST be stable (empty deps) — pagination.nextPage() re-invokes this exact
  // function reference. All mutable values are accessed through refs.
  const handleResults = useCallback(
    (
      results:    google.maps.places.PlaceResult[] | null,
      status:     google.maps.places.PlacesServiceStatus,
      pagination: google.maps.places.PlaceSearchPagination | null,
    ) => {
      const isLM = isLoadMoreRef.current;
      isLoadMoreRef.current = false;

      if (isLM) setLoadingMore(false);
      else      setPlacesLoading(false);

      if (status !== "OK" && status !== "ZERO_RESULTS") {
        setPlacesError(`Google Places greška: ${status}`);
        return;
      }

      // Store pagination for subsequent nextPage() calls
      paginationRef.current = pagination;
      const hasMore = !!pagination?.hasNextPage;
      setHasMorePlaces(hasMore);

      // Arm 2.5 s readiness timer (Google's warm-up requirement before nextPage)
      if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
      setTokenReady(false);
      if (hasMore) {
        tokenTimerRef.current = setTimeout(() => setTokenReady(true), 2500);
      }

      const mapped = (results ?? []).map((p) => normalise(p));

      // ── Iron Wall: only keep results that match the selected city ─────────────
      const cityName   = cityNameRef.current;
      const ironWalled = mapped.filter((r) => matchesCity(r, cityName));

      if (isLM) {
        setPlaceResults((prev) => {
          const seen  = new Set(prev.map((r) => r.place_id));
          const fresh = ironWalled.filter((r) => !seen.has(r.place_id));
          console.log(`[Places] loadMore +${fresh.length} city-matched (${mapped.length - ironWalled.length} Iron Wall rejected)`);
          return [...prev, ...fresh];
        });
      } else {
        setPlaceResults(ironWalled);
        setPlacesSearched(true);
        console.log(`[Places] searchNearby: ${ironWalled.length} city-matched of ${mapped.length} total`);
      }

      // Background harvest — fire-and-forget (parent decides what to do)
      if (ironWalled.length > 0) {
        onHarvestRef.current?.(ironWalled, cityName);
      }
    },
    [normalise], // normalise is stable (empty deps)
  );

  // ── Fresh city search ─────────────────────────────────────────────────────────
  const searchNearby = useCallback(
    (coords: { lat: number; lng: number }, cityName: string) => {
      if (!serviceRef.current) {
        console.warn("[usePlacesNearby] PlacesService not yet initialised");
        return;
      }

      cityNameRef.current = cityName;
      paginationRef.current = null;
      isLoadMoreRef.current = false;
      if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);

      setPlacesLoading(true);
      setPlacesError(null);
      setTokenReady(false);
      setHasMorePlaces(false);

      serviceRef.current.nearbySearch(
        {
          location: { lat: coords.lat, lng: coords.lng },
          radius:   RADIUS,
          keyword:  KEYWORD,
          type:     "restaurant",
        },
        handleResults,
      );
    },
    [handleResults],
  );

  // ── Load next page ────────────────────────────────────────────────────────────
  // pagination.nextPage() re-invokes handleResults — no params, no token string.
  const loadMorePlaces = useCallback(() => {
    if (!paginationRef.current?.hasNextPage || !tokenReady || loadingMore) return;
    isLoadMoreRef.current = true;
    setLoadingMore(true);
    paginationRef.current.nextPage();
  }, [tokenReady, loadingMore]);

  // ── Map area search (Iron Wall — results go to appendedPins ONLY) ─────────────
  // These results are NEVER merged into placeResults (the List View).
  // The Map View uses placeResults + appendedPins for pins.
  // Supabase harvest still receives all results (grows the DB regardless of city).
  const appendByCoords = useCallback(
    (lat: number, lng: number) => {
      if (!appendSvcRef.current || appendingPlaces) return;
      setAppendingPlaces(true);

      appendSvcRef.current.nearbySearch(
        {
          location: { lat, lng },
          radius:   RADIUS,
          keyword:  KEYWORD,
          type:     "restaurant",
        },
        (results, status) => {
          setAppendingPlaces(false);
          if (status !== "OK" && status !== "ZERO_RESULTS") return;

          const mapped = (results ?? []).map((p) => normalise(p));

          // Dedupe against both existing lists
          setAppendedPins((prev) => {
            const seen = new Set([
              ...prev.map((r) => r.place_id),
              // also dedupe against main placeResults
            ]);
            const fresh = mapped.filter((r) => !seen.has(r.place_id));
            console.log(`[Places] appendByCoords +${fresh.length} pins (map only)`);
            return [...prev, ...fresh];
          });

          // Harvest ALL map results (not Iron Walled — grows DB for any city)
          if (mapped.length > 0) {
            onHarvestRef.current?.(mapped, cityNameRef.current);
          }
        },
      );
    },
    [appendingPlaces, normalise],
  );

  // ── Clear all state ───────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
    paginationRef.current = null;
    cityNameRef.current   = "";
    setPlaceResults([]);
    setAppendedPins([]);
    setPlacesSearched(false);
    setHasMorePlaces(false);
    setTokenReady(false);
    setPlacesError(null);
  }, []);

  return {
    placeResults,
    appendedPins,
    placesLoading,
    loadingMore,
    appendingPlaces,
    placesSearched,
    hasMorePlaces,
    tokenReady,
    placesError,
    searchNearby,
    loadMorePlaces,
    appendByCoords,
    clearPlaces,
  };
}
