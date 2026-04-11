"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PlaceResult } from "@/types/places";

export interface UsePlacesSearchReturn {
  placeResults:      PlaceResult[];
  placesLoading:     boolean;
  loadingMorePlaces: boolean;
  placesError:       string | null;
  placesSearched:    boolean;
  hasMorePlaces:     boolean;
  /**
   * Becomes true ~2.5 s after `nextPageToken` is received.
   * The "Load More" button MUST be disabled while this is false —
   * that guarantees the token is activated before any request fires.
   */
  tokenReady:     boolean;
  searchPlaces:   (query: string) => Promise<void>;
  searchByCoords: (lat: number, lng: number) => Promise<void>;
  loadMorePlaces: () => Promise<void>;
  clearPlaces:    () => void;
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
 * Manages Google Places search state.
 *
 * Token-readiness strategy (no sleep / no retry):
 *   A useEffect watches nextPageToken.  Whenever a new token arrives it
 *   resets tokenReady to false and schedules setTokenReady(true) after 2.5 s.
 *   The cleanup auto-cancels the timer if the token is replaced or cleared.
 *   Because the "Load More" button is disabled while !tokenReady, it is
 *   physically impossible to call loadMorePlaces before the token activates.
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,      setPlaceResults]      = useState<PlaceResult[]>([]);
  const [placesLoading,     setPlacesLoading]     = useState(false);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [placesError,       setPlacesError]       = useState<string | null>(null);
  const [placesSearched,    setPlacesSearched]    = useState(false);
  const [nextPageToken,     setNextPageToken]      = useState<string | null>(null);
  const [tokenReady,        setTokenReady]         = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Token-readiness countdown ────────────────────────────────────────────────
  // Triggered whenever nextPageToken changes (new search, load-more, or clear).
  // The effect cleanup auto-cancels the pending timer when the token is replaced.
  useEffect(() => {
    if (!nextPageToken) {
      setTokenReady(false);
      return;
    }
    // Token just arrived — wait 2.5 s before enabling "Load More"
    setTokenReady(false);
    const timer = setTimeout(() => setTokenReady(true), 2500);
    return () => clearTimeout(timer);
  }, [nextPageToken]);

  // ── Shared fresh-search fetch ────────────────────────────────────────────────
  const doSearch = useCallback(async (
    params:  URLSearchParams,
    signal:  AbortSignal,
  ): Promise<void> => {
    const res  = await fetch(`/api/places?${params}`, { signal });
    const json = await res.json() as PlacesJson;

    if (!res.ok) {
      setPlacesError(json.hint ?? json.error ?? "Greška pri Google pretraživanju.");
      setPlaceResults([]);
    } else {
      setPlaceResults(json.results ?? []);
      setNextPageToken(json.nextPageToken ?? null); // triggers countdown above
      setPlacesSearched(true);
    }
  }, []);

  // ── Fresh text search ────────────────────────────────────────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null); // clears tokenReady immediately via the effect above

    try {
      await doSearch(
        new URLSearchParams({ ...BASE_PARAMS, near: query }),
        ctrl.signal,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doSearch]);

  // ── Coordinate search — "Search This Area" button on the map ────────────────
  const searchByCoords = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);

    try {
      await doSearch(
        new URLSearchParams({ ...BASE_PARAMS, lat: String(lat), lng: String(lng) }),
        ctrl.signal,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doSearch]);

  // ── Load next page ───────────────────────────────────────────────────────────
  // CLEAN request: ONLY pagetoken — no other parameters.
  // No sleep needed here; tokenReady already guarantees the token is activated.
  const loadMorePlaces = useCallback(async () => {
    if (!nextPageToken || !tokenReady || loadingMorePlaces) return;

    setLoadingMorePlaces(true);
    setPlacesError(null);

    try {
      // Strictly isolated request — only the token, nothing else.
      const params = new URLSearchParams({ pagetoken: nextPageToken });
      console.log("[Places] loadMore →", nextPageToken.slice(0, 20) + "…");

      const res  = await fetch(`/api/places?${params}`);
      const json = await res.json() as PlacesJson;

      if (!res.ok) {
        console.error("[Places] loadMore error:", json);
        setPlacesError(json.hint ?? json.error ?? "Greška pri dohvatu sljedeće stranice.");
      } else {
        setPlaceResults((prev) => [...prev, ...(json.results ?? [])]);
        setNextPageToken(json.nextPageToken ?? null); // triggers new countdown if another page exists
        console.log("[Places] loadMore ✓", json.results?.length, "new results");
      }
    } catch (err) {
      setPlacesError("Greška pri učitavanju sljedeće stranice.");
      console.error("[Places] loadMore exception:", err);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [nextPageToken, tokenReady, loadingMorePlaces]);

  // ── Clear ────────────────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    abortRef.current?.abort();
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
    setNextPageToken(null); // clears tokenReady via effect
  }, []);

  return {
    placeResults,
    placesLoading,
    loadingMorePlaces,
    placesError,
    placesSearched,
    hasMorePlaces: !!nextPageToken,
    tokenReady,
    searchPlaces,
    searchByCoords,
    loadMorePlaces,
    clearPlaces,
  };
}
