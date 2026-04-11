"use client";

import { useState, useCallback, useRef } from "react";
import type { PlaceResult } from "@/types/places";

export interface UsePlacesSearchReturn {
  placeResults:    PlaceResult[];
  placesLoading:   boolean;  // true during a fresh/replace search
  appendingPlaces: boolean;  // true while "Search This Area" appends results
  placesError:     string | null;
  placesSearched:  boolean;
  /** Replace existing results with a keyword text search */
  searchPlaces:    (query: string) => Promise<void>;
  /** Replace existing results with a coordinate-based search (city selection) */
  searchByCoords:  (lat: number, lng: number) => Promise<void>;
  /** Append deduped results from a coordinate search ("Search This Area" button) */
  appendByCoords:  (lat: number, lng: number) => Promise<void>;
  clearPlaces:     () => void;
}

const BASE_PARAMS = {
  query: "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill",
  limit: "20",
};

type PlacesJson = {
  results?: PlaceResult[];
  hint?:    string;
  error?:   string;
};

/**
 * Discovery-mode Places search.
 * No pagination — the user explores by moving the map and clicking
 * "Pretraži ovo područje" which calls appendByCoords.
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,    setPlaceResults]    = useState<PlaceResult[]>([]);
  const [placesLoading,   setPlacesLoading]   = useState(false);
  const [appendingPlaces, setAppendingPlaces] = useState(false);
  const [placesError,     setPlacesError]     = useState<string | null>(null);
  const [placesSearched,  setPlacesSearched]  = useState(false);

  const abortRef       = useRef<AbortController | null>(null);
  const appendAbortRef = useRef<AbortController | null>(null);

  // ── Internal fetch ───────────────────────────────────────────────────────────
  const doFetch = useCallback(async (
    params: URLSearchParams,
    signal: AbortSignal,
  ): Promise<PlaceResult[]> => {
    const res  = await fetch(`/api/places?${params}`, { signal });
    const json = await res.json() as PlacesJson;
    if (!res.ok) throw new Error(json.hint ?? json.error ?? `HTTP ${res.status}`);
    return json.results ?? [];
  }, []);

  // ── Fresh text search — replaces results ─────────────────────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);

    try {
      const results = await doFetch(
        new URLSearchParams({ ...BASE_PARAMS, near: query }),
        ctrl.signal,
      );
      setPlaceResults(results);
      setPlacesSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doFetch]);

  // ── Coordinate search — replaces results (city selection) ────────────────────
  const searchByCoords = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);

    try {
      const results = await doFetch(
        new URLSearchParams({ ...BASE_PARAMS, lat: String(lat), lng: String(lng) }),
        ctrl.signal,
      );
      setPlaceResults(results);
      setPlacesSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError((err as Error).message ?? "Greška pri pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  }, [doFetch]);

  // ── Area append — APPENDS deduped results ("Search This Area" button) ────────
  const appendByCoords = useCallback(async (lat: number, lng: number) => {
    if (appendingPlaces) return;
    appendAbortRef.current?.abort();
    const ctrl = new AbortController();
    appendAbortRef.current = ctrl;

    setAppendingPlaces(true);
    setPlacesError(null);

    try {
      const incoming = await doFetch(
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
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
  }, []);

  return {
    placeResults,
    placesLoading,
    appendingPlaces,
    placesError,
    placesSearched,
    searchPlaces,
    searchByCoords,
    appendByCoords,
    clearPlaces,
  };
}
