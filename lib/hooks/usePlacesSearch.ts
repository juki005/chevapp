"use client";

import { useState, useCallback, useRef } from "react";
import type { PlaceResult } from "@/types/places";

export interface UsePlacesSearchReturn {
  placeResults:      PlaceResult[];
  placesLoading:     boolean;
  loadingMorePlaces: boolean;
  placesError:       string | null;
  placesSearched:    boolean;
  hasMorePlaces:     boolean;
  searchPlaces:      (query: string) => Promise<void>;
  loadMorePlaces:    () => Promise<void>;
  clearPlaces:       () => void;
}

const BASE_PARAMS = {
  query: "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill",
  limit: "20",
};

/**
 * Manages Google Places search state and fetch logic.
 *
 * searchPlaces(query)  — fresh search, replaces results, resets pagination
 * loadMorePlaces()     — appends next page using the stored next_page_token
 * clearPlaces()        — resets all state
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,      setPlaceResults]      = useState<PlaceResult[]>([]);
  const [placesLoading,     setPlacesLoading]     = useState(false);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [placesError,       setPlacesError]       = useState<string | null>(null);
  const [placesSearched,    setPlacesSearched]    = useState(false);
  const [nextPageToken,     setNextPageToken]      = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fresh search — replaces results, resets pagination ──────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);

    try {
      const params = new URLSearchParams({ ...BASE_PARAMS, near: query });
      const res    = await fetch(`/api/places?${params}`, { signal: ctrl.signal });
      const json   = await res.json() as {
        results?: PlaceResult[];
        nextPageToken?: string | null;
        hint?: string;
        error?: string;
      };

      if (!res.ok) {
        setPlacesError(json.hint ?? json.error ?? `HTTP ${res.status}`);
        setPlaceResults([]);
      } else {
        setPlaceResults(json.results ?? []);
        setNextPageToken(json.nextPageToken ?? null);
        setPlacesSearched(true);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  // ── Load next page — appends results ────────────────────────────────────────
  // Google Places requires ~2 s before a next_page_token is valid. We add a
  // small delay to avoid INVALID_REQUEST on fast clicks.
  const loadMorePlaces = useCallback(async () => {
    if (!nextPageToken || loadingMorePlaces) return;

    setLoadingMorePlaces(true);
    setPlacesError(null);

    try {
      // Small mandatory wait — Google's token needs ~2 s to activate
      await new Promise((r) => setTimeout(r, 2000));

      const params = new URLSearchParams({ pagetoken: nextPageToken });
      const res    = await fetch(`/api/places?${params}`);
      const json   = await res.json() as {
        results?: PlaceResult[];
        nextPageToken?: string | null;
        hint?: string;
        error?: string;
      };

      if (!res.ok) {
        setPlacesError(json.hint ?? json.error ?? `HTTP ${res.status}`);
      } else {
        setPlaceResults((prev) => [...prev, ...(json.results ?? [])]);
        setNextPageToken(json.nextPageToken ?? null);
      }
    } catch (err) {
      setPlacesError("Greška pri učitavanju sljedeće stranice.");
      console.error("[usePlacesSearch] loadMore error:", err);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [nextPageToken, loadingMorePlaces]);

  // ── Clear ────────────────────────────────────────────────────────────────────
  const clearPlaces = useCallback(() => {
    abortRef.current?.abort();
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
    setNextPageToken(null);
  }, []);

  return {
    placeResults,
    placesLoading,
    loadingMorePlaces,
    placesError,
    placesSearched,
    hasMorePlaces:  !!nextPageToken,
    searchPlaces,
    loadMorePlaces,
    clearPlaces,
  };
}
