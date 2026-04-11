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
   * True once the next_page_token has been active for ≥ 2.5 s.
   * The "Load More" button must be disabled until this is true.
   * Resets to false whenever a new search starts or results clear.
   */
  tokenReady:        boolean;
  searchPlaces:      (query: string) => Promise<void>;
  searchByCoords:    (lat: number, lng: number) => Promise<void>;
  loadMorePlaces:    () => Promise<void>;
  clearPlaces:       () => void;
}

const BASE_PARAMS = {
  query: "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill",
  limit: "20",
};

// Google activates next_page_token ~2 s after the search response arrives.
// We guard for 2.5 s so there is always a safety margin.
const TOKEN_ACTIVATION_MS = 2500;

/**
 * Manages Google Places search state.
 *
 * Pagination strategy — NO manual sleep or retry inside loadMorePlaces.
 * Instead we expose `tokenReady` (becomes true after TOKEN_ACTIVATION_MS).
 * Callers MUST disable the "Load More" button while !tokenReady, which
 * guarantees the token is always valid when loadMorePlaces() is called.
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,      setPlaceResults]      = useState<PlaceResult[]>([]);
  const [placesLoading,     setPlacesLoading]     = useState(false);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [placesError,       setPlacesError]       = useState<string | null>(null);
  const [placesSearched,    setPlacesSearched]    = useState(false);
  const [nextPageToken,     setNextPageToken]      = useState<string | null>(null);
  const [tokenReady,        setTokenReady]         = useState(false);

  const abortRef      = useRef<AbortController | null>(null);
  const tokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear token timer on unmount
  useEffect(() => () => {
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
  }, []);

  // ── Arm the 2.5 s countdown ──────────────────────────────────────────────────
  // Called whenever a fresh next_page_token is received.
  const armTokenTimer = useCallback(() => {
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
    setTokenReady(false);
    tokenTimerRef.current = setTimeout(() => setTokenReady(true), TOKEN_ACTIVATION_MS);
  }, []);

  // ── Shared result handler ────────────────────────────────────────────────────
  type PlacesJson = {
    results?:       PlaceResult[];
    nextPageToken?: string | null;
    hint?:          string;
    error?:         string;
  };

  const applyResults = useCallback((json: PlacesJson, ok: boolean) => {
    if (!ok) {
      setPlacesError(json.hint ?? json.error ?? "Greška pri Google pretraživanju.");
      setPlaceResults([]);
    } else {
      setPlaceResults(json.results ?? []);
      if (json.nextPageToken) {
        setNextPageToken(json.nextPageToken);
        armTokenTimer(); // start the 2.5 s countdown
      } else {
        setNextPageToken(null);
        setTokenReady(false);
      }
      setPlacesSearched(true);
    }
  }, [armTokenTimer]);

  // ── Fresh text search ────────────────────────────────────────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);
    setTokenReady(false);
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);

    try {
      const params = new URLSearchParams({ ...BASE_PARAMS, near: query });
      const res    = await fetch(`/api/places?${params}`, { signal: ctrl.signal });
      applyResults(await res.json() as PlacesJson, res.ok);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [applyResults]);

  // ── Coordinate search — "Search This Area" button on the map ────────────────
  const searchByCoords = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);
    setTokenReady(false);
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);

    try {
      const params = new URLSearchParams({ ...BASE_PARAMS, lat: String(lat), lng: String(lng) });
      const res    = await fetch(`/api/places?${params}`, { signal: ctrl.signal });
      applyResults(await res.json() as PlacesJson, res.ok);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [applyResults]);

  // ── Load next page ───────────────────────────────────────────────────────────
  // No sleep or retry — tokenReady guarantees the token is activated before
  // this function can be called (button is disabled while !tokenReady).
  const loadMorePlaces = useCallback(async () => {
    if (!nextPageToken || !tokenReady || loadingMorePlaces) return;

    setLoadingMorePlaces(true);
    setPlacesError(null);

    try {
      const params = new URLSearchParams({ pagetoken: nextPageToken });
      const res    = await fetch(`/api/places?${params}`);
      const json   = await res.json() as PlacesJson;

      if (!res.ok) {
        setPlacesError(json.hint ?? json.error ?? "Greška pri dohvatu sljedeće stranice.");
      } else {
        setPlaceResults((prev) => [...prev, ...(json.results ?? [])]);
        if (json.nextPageToken) {
          setNextPageToken(json.nextPageToken);
          armTokenTimer(); // arm countdown for the new token
        } else {
          setNextPageToken(null);
          setTokenReady(false);
        }
      }
    } catch (err) {
      setPlacesError("Greška pri učitavanju sljedeće stranice.");
      console.error("[usePlacesSearch] loadMore error:", err);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [nextPageToken, tokenReady, loadingMorePlaces, armTokenTimer]);

  // ── Clear ────────────────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    abortRef.current?.abort();
    if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
    setNextPageToken(null);
    setTokenReady(false);
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
