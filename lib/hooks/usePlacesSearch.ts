"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PlaceResult } from "@/types/places";

export interface UsePlacesSearchReturn {
  placeResults:      PlaceResult[];
  placesLoading:     boolean;  // true during a fresh/replace search
  appendingPlaces:   boolean;  // true while "Search This Area" appends results
  loadingMorePlaces: boolean;  // true while Load More fetches next page
  placesError:       string | null;
  placesSearched:    boolean;
  hasMorePlaces:     boolean;  // true when a next_page_token is available
  tokenReady:        boolean;  // true after the 2.5 s token activation delay
  /** Replace existing results with a keyword text search */
  searchPlaces:    (query: string) => Promise<void>;
  /**
   * City-scoped search — REPLACES results.
   * When cityFilter is provided the search uses Google text search
   * (`near=cityName`) so the query is naturally scoped to that city and
   * Load More (next_page_token) continues the same city context.
   * Falls back to coordinate search when no city name is available.
   */
  searchByCoords:  (lat: number, lng: number, cityFilter?: string) => Promise<void>;
  /** Append deduped results from a coordinate search ("Search This Area" button) */
  appendByCoords:  (lat: number, lng: number) => Promise<void>;
  /** Fetch the next page via the stored next_page_token (Load More) */
  loadMorePlaces:  () => Promise<void>;
  clearPlaces:     () => void;
}

const BASE_PARAMS = {
  query: "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill",
  limit: "20",
};

type PlacesJson = {
  results?:       PlaceResult[];
  nextPageToken?: string | null;
  hint?:          string;
  error?:         string;
};

/**
 * City-scoped Places search with pagination.
 *
 * City selected → searchByCoords(lat, lng, city)
 *                 Uses ?near=city text search → Google naturally scopes to
 *                 that city, returns 20 results, emits next_page_token.
 * Load More     → loadMorePlaces()
 *                 Continues the same city-scoped query via next_page_token.
 * Map pan       → appendByCoords(lat, lng)
 *                 Coordinate search — appends deduped results for exploration.
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,      setPlaceResults]      = useState<PlaceResult[]>([]);
  const [placesLoading,     setPlacesLoading]     = useState(false);
  const [appendingPlaces,   setAppendingPlaces]   = useState(false);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [placesError,       setPlacesError]       = useState<string | null>(null);
  const [placesSearched,    setPlacesSearched]    = useState(false);
  const [nextPageToken,     setNextPageToken]      = useState<string | null>(null);
  const [tokenReady,        setTokenReady]         = useState(false);

  const abortRef       = useRef<AbortController | null>(null);
  const appendAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  // ── Token activation timer ───────────────────────────────────────────────────
  // Google requires ~2 s before a next_page_token is usable.
  // We wait 2.5 s after receiving one before enabling the Load More button.
  useEffect(() => {
    if (!nextPageToken) {
      setTokenReady(false);
      return;
    }
    setTokenReady(false);
    const timerId = setTimeout(() => setTokenReady(true), 2500);
    return () => clearTimeout(timerId);
  }, [nextPageToken]);

  // ── Internal fetch ───────────────────────────────────────────────────────────
  const doFetch = useCallback(async (
    params: URLSearchParams,
    signal: AbortSignal,
  ): Promise<{ results: PlaceResult[]; nextPageToken: string | null }> => {
    const res  = await fetch(`/api/places?${params}`, { signal });
    const json = await res.json() as PlacesJson;
    if (!res.ok) throw new Error(json.hint ?? json.error ?? `HTTP ${res.status}`);
    return {
      results:       json.results ?? [],
      nextPageToken: json.nextPageToken ?? null,
    };
  }, []);

  // ── Fresh text search — replaces results ─────────────────────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);

    try {
      const { results, nextPageToken: npt } = await doFetch(
        new URLSearchParams({ ...BASE_PARAMS, near: query }),
        ctrl.signal,
      );
      setPlaceResults(results);
      setNextPageToken(npt);
      setPlacesSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doFetch]);

  // ── City-scoped search — replaces results ────────────────────────────────────
  // When cityFilter is provided we do a TEXT search (?near=Zagreb) instead of
  // a coordinate search. This gives full 20 city-scoped results and lets
  // next_page_token naturally continue the same city query for Load More.
  // Coordinate search is only used as a fallback when no city name is known.
  const searchByCoords = useCallback(async (lat: number, lng: number, cityFilter?: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);

    try {
      const params = cityFilter
        ? new URLSearchParams({ ...BASE_PARAMS, near: cityFilter })
        : new URLSearchParams({ ...BASE_PARAMS, lat: String(lat), lng: String(lng) });

      const { results, nextPageToken: npt } = await doFetch(params, ctrl.signal);
      setPlaceResults(results);
      setNextPageToken(npt);
      setPlacesSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doFetch]);

  // ── Load More — uses next_page_token to append next page ────────────────────
  // CRITICAL: when using a pagetoken, Google requires NO other params.
  const loadMorePlaces = useCallback(async () => {
    if (!nextPageToken || !tokenReady || loadingMorePlaces) return;

    loadMoreAbortRef.current?.abort();
    const ctrl = new AbortController();
    loadMoreAbortRef.current = ctrl;

    setLoadingMorePlaces(true);
    setPlacesError(null);

    try {
      const { results, nextPageToken: npt } = await doFetch(
        new URLSearchParams({ pagetoken: nextPageToken }),
        ctrl.signal,
      );

      setPlaceResults((prev) => {
        const seen = new Set(prev.map((r) => r.place_id));
        const fresh = results.filter((r) => !seen.has(r.place_id));
        console.log(`[Places] loadMore +${fresh.length} new (${results.length - fresh.length} dupes skipped)`);
        return [...prev, ...fresh];
      });
      setNextPageToken(npt);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri učitavanju stranice.");
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [nextPageToken, tokenReady, loadingMorePlaces, doFetch]);

  // ── Area append — APPENDS deduped results ("Search This Area" button) ────────
  const appendByCoords = useCallback(async (lat: number, lng: number) => {
    if (appendingPlaces) return;
    appendAbortRef.current?.abort();
    const ctrl = new AbortController();
    appendAbortRef.current = ctrl;

    setAppendingPlaces(true);
    setPlacesError(null);

    try {
      const { results: incoming } = await doFetch(
        new URLSearchParams({ ...BASE_PARAMS, lat: String(lat), lng: String(lng) }),
        ctrl.signal,
      );

      setPlaceResults((prev) => {
        const seen = new Set(prev.map((r) => r.place_id));
        const fresh = incoming.filter((r) => !seen.has(r.place_id));
        console.log(`[Places] append +${fresh.length} new (${incoming.length - fresh.length} dupes skipped)`);
        return [...prev, ...fresh];
      });
      setPlacesSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri pretraživanju područja.");
    } finally {
      setAppendingPlaces(false);
    }
  }, [appendingPlaces, doFetch]);

  // ── Clear ────────────────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    abortRef.current?.abort();
    appendAbortRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
    setNextPageToken(null);
    setTokenReady(false);
  }, []);

  return {
    placeResults,
    placesLoading,
    appendingPlaces,
    loadingMorePlaces,
    placesError,
    placesSearched,
    hasMorePlaces:  !!nextPageToken,
    tokenReady,
    searchPlaces,
    searchByCoords,
    appendByCoords,
    loadMorePlaces,
    clearPlaces,
  };
}
