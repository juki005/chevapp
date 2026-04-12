"use client";

// ── Client-side Google Places NearbySearch hook ───────────────────────────────
// Uses google.maps.places.PlacesService directly in the browser.
// MUST be used inside a component wrapped by <APIProvider>.
//
// Sprint 8.1 — three bugs fixed:
//
//   1. STALE STATE: clearPlaces() is now called by the parent before
//      searchNearby (the hook itself no longer assumes callers do it).
//
//   2. WRONG CITY ON CARDS: normalise() now derives city from the place's
//      own vicinity string ("Ilica 5, Zagreb" → "Zagreb"), NOT from
//      cityNameRef. This means cards always display the actual place city.
//
//   3. STALE CALLBACKS / ABORT: handleResults is no longer a shared stable
//      useCallback(fn, []). Each searchNearby creates its own closure that
//      captures (gen, cityName). If a newer searchNearby fires before the
//      async result arrives, genRef.current !== gen → results are discarded.
//      This acts as an AbortController for the Places API (which has none).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { PlaceResult } from "@/types/places";

const KEYWORD =
  "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill";
const RADIUS = 15_000; // 15 km

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the city name from a Google Places vicinity string.
 *  "Ilica 5, Zagreb"          → "Zagreb"
 *  "Veselina Masleše 6, Banja Luka" → "Banja Luka"
 *  Falls back to `fallback` if parsing yields nothing useful. */
function cityFromVicinity(vicinity: string, fallback = ""): string {
  if (!vicinity) return fallback;
  const parts = vicinity.split(",").map((s) => s.trim()).filter(Boolean);
  // Google vicinity: last segment is typically the city
  const last = parts[parts.length - 1] ?? "";
  // Reject numeric-only values (zip codes like "10000")
  return /^\d+$/.test(last) ? fallback : (last || fallback);
}

/** Iron Wall: accept a result if the city name appears in its address or city. */
function matchesCity(result: PlaceResult, cityName: string): boolean {
  if (!cityName) return true;
  const city = cityName.toLowerCase();
  return (
    result.city.toLowerCase().includes(city) ||
    result.address.toLowerCase().includes(city)
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UsePlacesNearbyOptions {
  /** Called after every successful response with the new places and city name.
   *  Use for background Supabase harvesting (fire-and-forget). */
  onHarvest?: (places: PlaceResult[], cityName: string) => void;
}

export interface UsePlacesNearbyReturn {
  // List view — city-filtered
  placeResults:    PlaceResult[];
  placesLoading:   boolean;
  loadingMore:     boolean;
  placesSearched:  boolean;
  hasMorePlaces:   boolean;
  tokenReady:      boolean;
  placesError:     string | null;
  // Map view — all area discoveries (never injected into list)
  appendedPins:    PlaceResult[];
  appendingPlaces: boolean;
  // Actions
  searchNearby:    (coords: { lat: number; lng: number }, cityName: string) => void;
  loadMorePlaces:  () => void;
  appendByCoords:  (lat: number, lng: number) => void;
  clearPlaces:     () => void;
}

export function usePlacesNearby(
  options: UsePlacesNearbyOptions = {},
): UsePlacesNearbyReturn {
  const placesLib = useMapsLibrary("places");

  const [placeResults,    setPlaceResults]    = useState<PlaceResult[]>([]);
  const [appendedPins,    setAppendedPins]    = useState<PlaceResult[]>([]);
  const [placesLoading,   setPlacesLoading]   = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [appendingPlaces, setAppendingPlaces] = useState(false);
  const [placesSearched,  setPlacesSearched]  = useState(false);
  const [hasMorePlaces,   setHasMorePlaces]   = useState(false);
  const [tokenReady,      setTokenReady]      = useState(false);
  const [placesError,     setPlacesError]     = useState<string | null>(null);

  const serviceRef    = useRef<google.maps.places.PlacesService | null>(null);
  const appendSvcRef  = useRef<google.maps.places.PlacesService | null>(null);
  const paginationRef = useRef<google.maps.places.PlaceSearchPagination | null>(null);
  const isLoadMoreRef = useRef(false);
  const genRef        = useRef(0);   // monotonically incremented per searchNearby
  const tokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHarvestRef  = useRef(options.onHarvest);
  onHarvestRef.current = options.onHarvest;

  // ── Build PlacesService instances ────────────────────────────────────────────
  useEffect(() => {
    if (!placesLib) return;
    if (!serviceRef.current) {
      serviceRef.current = new placesLib.PlacesService(document.createElement("div"));
    }
    if (!appendSvcRef.current) {
      appendSvcRef.current = new placesLib.PlacesService(document.createElement("div"));
    }
  }, [placesLib]);

  // ── Normalise a Google Place to ChevApp's PlaceResult shape ──────────────────
  // City is derived from the place's own vicinity, not from the search context.
  const normalise = useCallback(
    (p: google.maps.places.PlaceResult, searchCity: string): PlaceResult => {
      const vicinity = p.vicinity ?? p.formatted_address ?? "";
      return {
        place_id:  p.place_id ?? `${p.name}-${Math.random()}`,
        name:      p.name ?? "",
        address:   vicinity,
        city:      cityFromVicinity(vicinity, searchCity), // actual city, not search city
        latitude:  p.geometry?.location?.lat() ?? null,
        longitude: p.geometry?.location?.lng() ?? null,
        rating:    p.rating ?? null,
        open_now:  p.opening_hours?.isOpen?.() ?? null,
        types:     p.types ?? [],
        source:    "google" as const,
      };
    },
    [],
  );

  // ── City search ───────────────────────────────────────────────────────────────
  // Creates a per-search closure that captures (gen, cityName).
  // If a newer searchNearby fires before results arrive, gen !== genRef.current
  // and the stale results are silently discarded — acting as an abort.
  const searchNearby = useCallback(
    (coords: { lat: number; lng: number }, cityName: string) => {
      if (!serviceRef.current) {
        console.warn("[usePlacesNearby] PlacesService not initialised — is APIProvider mounted?");
        return;
      }

      // Increment generation — any in-flight callbacks for older gens are now stale
      genRef.current += 1;
      const myGen = genRef.current;

      paginationRef.current = null;
      isLoadMoreRef.current = false;
      if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);

      setPlacesLoading(true);
      setPlacesError(null);
      setTokenReady(false);
      setHasMorePlaces(false);

      // ── Per-search result handler ──────────────────────────────────────────────
      // Closure captures (myGen, cityName) — these never change for this search.
      // pagination.nextPage() re-invokes THIS specific function — correct because
      // it continues the same search session with the same city context.
      function handleResults(
        results:    google.maps.places.PlaceResult[] | null,
        status:     google.maps.places.PlacesServiceStatus,
        pagination: google.maps.places.PlaceSearchPagination | null,
      ) {
        const isLM = isLoadMoreRef.current;
        isLoadMoreRef.current = false;

        // Stale check — a newer search has started; discard these results
        if (genRef.current !== myGen) {
          if (isLM) setLoadingMore(false);
          else      setPlacesLoading(false);
          return;
        }

        if (isLM) setLoadingMore(false);
        else      setPlacesLoading(false);

        if (status !== "OK" && status !== "ZERO_RESULTS") {
          setPlacesError(`Google Places greška: ${status}`);
          return;
        }

        paginationRef.current = pagination;
        const hasMore = !!pagination?.hasNextPage;
        setHasMorePlaces(hasMore);

        // Arm 2.5 s readiness timer (Google's warm-up before nextPage is callable)
        if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
        setTokenReady(false);
        if (hasMore) {
          tokenTimerRef.current = setTimeout(() => setTokenReady(true), 2500);
        }

        // Normalise — city is derived from each place's own vicinity
        const mapped = (results ?? []).map((p) => normalise(p, cityName));

        // Iron Wall: only keep results whose address/city matches the searched city
        const ironWalled = mapped.filter((r) => matchesCity(r, cityName));

        if (isLM) {
          setPlaceResults((prev) => {
            const seen  = new Set(prev.map((r) => r.place_id));
            const fresh = ironWalled.filter((r) => !seen.has(r.place_id));
            console.log(`[Places] loadMore +${fresh.length} (${mapped.length - ironWalled.length} Iron Wall rejected)`);
            return [...prev, ...fresh];
          });
        } else {
          setPlaceResults(ironWalled);
          setPlacesSearched(true);
          console.log(`[Places] searchNearby: ${ironWalled.length} of ${mapped.length} passed Iron Wall`);
        }

        if (ironWalled.length > 0) {
          onHarvestRef.current?.(ironWalled, cityName);
        }
      }

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
    [normalise],
  );

  // ── Load next page ────────────────────────────────────────────────────────────
  // Calls the ORIGINAL handleResults closure stored by the pagination object —
  // no params, no token string. Google manages pagination state internally.
  const loadMorePlaces = useCallback(() => {
    if (!paginationRef.current?.hasNextPage || !tokenReady || loadingMore) return;
    isLoadMoreRef.current = true;
    setLoadingMore(true);
    paginationRef.current.nextPage();
  }, [tokenReady, loadingMore]);

  // ── Map area search (Iron Wall — results go to appendedPins ONLY) ─────────────
  const appendByCoords = useCallback(
    (lat: number, lng: number) => {
      if (!appendSvcRef.current || appendingPlaces) return;
      setAppendingPlaces(true);

      // Snapshot city at call time for harvest labelling
      const cityAtCall = ""; // map area results are city-agnostic

      appendSvcRef.current.nearbySearch(
        { location: { lat, lng }, radius: RADIUS, keyword: KEYWORD, type: "restaurant" },
        (results, status) => {
          setAppendingPlaces(false);
          if (status !== "OK" && status !== "ZERO_RESULTS") return;

          const mapped = (results ?? []).map((p) => normalise(p, cityAtCall));

          setAppendedPins((prev) => {
            const seen  = new Set(prev.map((r) => r.place_id));
            const fresh = mapped.filter((r) => !seen.has(r.place_id));
            console.log(`[Places] appendByCoords +${fresh.length} map pins`);
            return [...prev, ...fresh];
          });

          if (mapped.length > 0) {
            // Harvest map discoveries (city-agnostic — DB grows regardless)
            onHarvestRef.current?.(mapped, cityFromVicinity(mapped[0]?.address ?? ""));
          }
        },
      );
    },
    [appendingPlaces, normalise],
  );

  // ── Clear ─────────────────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
    paginationRef.current = null;
    setPlaceResults([]);
    setAppendedPins([]);
    setPlacesSearched(false);
    setHasMorePlaces(false);
    setTokenReady(false);
    setPlacesError(null);
  }, []);

  return {
    placeResults, appendedPins,
    placesLoading, loadingMore, appendingPlaces,
    placesSearched, hasMorePlaces, tokenReady, placesError,
    searchNearby, loadMorePlaces, appendByCoords, clearPlaces,
  };
}
