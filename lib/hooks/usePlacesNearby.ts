"use client";

// ── Client-side Google Places NearbySearch hook ───────────────────────────────
// Uses google.maps.places.PlacesService directly in the browser.
// MUST be used inside a component that is wrapped by <APIProvider>.
//
// Why not the server-side proxy?
//   The REST API's next_page_token is a one-time-use, 2-min-expiry string.
//   When Vercel caches the initial search response, multiple users share the
//   same token. Only the first Load More call succeeds; every subsequent one
//   gets INVALID_REQUEST. The client-side PlacesService avoids this entirely:
//   pagination.nextPage() is a native method — Google manages the state
//   internally, no token string is ever exposed, and it always works.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { PlaceResult } from "@/types/places";

const KEYWORD =
  "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill";
const RADIUS = 15_000; // 15 km — wide enough to cover city + suburbs

export interface UsePlacesNearbyReturn {
  placeResults:   PlaceResult[];
  placesLoading:  boolean;   // initial search in-flight
  loadingMore:    boolean;   // load-more in-flight
  placesSearched: boolean;   // true once a search has returned
  hasMorePlaces:  boolean;   // true if pagination.hasNextPage
  tokenReady:     boolean;   // true 2.5 s after page arrives (Google's warm-up)
  placesError:    string | null;
  /** Trigger a fresh NearbySearch for the given city */
  searchNearby:   (coords: { lat: number; lng: number }, cityName: string) => void;
  /** Load the next page — only callable when tokenReady */
  loadMorePlaces: () => void;
  clearPlaces:    () => void;
}

export function usePlacesNearby(): UsePlacesNearbyReturn {
  // useMapsLibrary requires being inside <APIProvider>
  const placesLib = useMapsLibrary("places");

  const [placeResults,   setPlaceResults]   = useState<PlaceResult[]>([]);
  const [placesLoading,  setPlacesLoading]  = useState(false);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [placesSearched, setPlacesSearched] = useState(false);
  const [hasMorePlaces,  setHasMorePlaces]  = useState(false);
  const [tokenReady,     setTokenReady]     = useState(false);
  const [placesError,    setPlacesError]    = useState<string | null>(null);

  // Refs — survive re-renders without causing them
  const serviceRef    = useRef<google.maps.places.PlacesService | null>(null);
  const paginationRef = useRef<google.maps.places.PlaceSearchPagination | null>(null);
  const cityNameRef   = useRef<string>("");
  const isLoadMoreRef = useRef(false);
  const tokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build the PlacesService once the lib is loaded ───────────────────────────
  useEffect(() => {
    if (!placesLib || serviceRef.current) return;
    // PlacesService needs a map instance or a hidden div for attributions
    serviceRef.current = new placesLib.PlacesService(document.createElement("div"));
  }, [placesLib]);

  // ── Stable result handler ────────────────────────────────────────────────────
  // CRITICAL: This callback is passed to nearbySearch AND re-invoked by
  // pagination.nextPage(). It MUST be stable (empty deps array) so that the
  // pagination object always calls the same function reference.
  // All mutable values are accessed through refs, never closed over directly.
  const handleResults = useCallback(
    (
      results:    google.maps.places.PlaceResult[] | null,
      status:     google.maps.places.PlacesServiceStatus,
      pagination: google.maps.places.PlaceSearchPagination | null,
    ) => {
      const isLM = isLoadMoreRef.current;
      isLoadMoreRef.current = false;

      // Clear the spinner for whichever action triggered this callback
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

      // Arm the 2.5 s readiness timer — Google needs this warm-up before
      // nextPage() returns valid results (same as next_page_token delay).
      if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
      setTokenReady(false);
      if (hasMore) {
        tokenTimerRef.current = setTimeout(() => setTokenReady(true), 2500);
      }

      // Normalise to ChevApp's PlaceResult shape
      const mapped: PlaceResult[] = (results ?? []).map((p) => ({
        place_id:  p.place_id ?? `${p.name}-${Math.random()}`,
        name:      p.name ?? "",
        address:   p.vicinity ?? p.formatted_address ?? "",
        city:      cityNameRef.current,
        latitude:  p.geometry?.location?.lat() ?? null,
        longitude: p.geometry?.location?.lng() ?? null,
        rating:    p.rating     ?? null,
        open_now:  p.opening_hours?.isOpen?.() ?? null,
        types:     p.types      ?? [],
        source:    "google" as const,
      }));

      if (isLM) {
        // Append and dedupe by place_id
        setPlaceResults((prev) => {
          const seen  = new Set(prev.map((r) => r.place_id));
          const fresh = mapped.filter((r) => !seen.has(r.place_id));
          console.log(`[Places] loadMore +${fresh.length} new (${mapped.length - fresh.length} dupes skipped)`);
          return [...prev, ...fresh];
        });
      } else {
        setPlaceResults(mapped);
        setPlacesSearched(true);
      }
    },
    [], // ← intentionally empty — every mutable value accessed via refs or stable setters
  );

  // ── Fresh city search ────────────────────────────────────────────────────────
  const searchNearby = useCallback(
    (coords: { lat: number; lng: number }, cityName: string) => {
      if (!serviceRef.current) {
        console.warn("[usePlacesNearby] PlacesService not yet initialised — is APIProvider mounted?");
        return;
      }

      // Reset all pagination state
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
          location: { lat: coords.lat, lng: coords.lng }, // LatLngLiteral — no constructor needed
          radius:   RADIUS,
          keyword:  KEYWORD,
          type:     "restaurant",
        },
        handleResults, // stable reference — pagination.nextPage() will re-call this
      );
    },
    [handleResults],
  );

  // ── Load next page ───────────────────────────────────────────────────────────
  // pagination.nextPage() re-invokes the original handleResults callback.
  // NO other parameters are passed — this is Google's contract.
  const loadMorePlaces = useCallback(() => {
    if (!paginationRef.current?.hasNextPage || !tokenReady || loadingMore) return;
    isLoadMoreRef.current = true;
    setLoadingMore(true);
    paginationRef.current.nextPage(); // ← Google manages the token internally
  }, [tokenReady, loadingMore]);

  // ── Clear all state ──────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
    paginationRef.current = null;
    setPlaceResults([]);
    setPlacesSearched(false);
    setHasMorePlaces(false);
    setTokenReady(false);
    setPlacesError(null);
  }, []);

  return {
    placeResults,
    placesLoading,
    loadingMore,
    placesSearched,
    hasMorePlaces,
    tokenReady,
    placesError,
    searchNearby,
    loadMorePlaces,
    clearPlaces,
  };
}
