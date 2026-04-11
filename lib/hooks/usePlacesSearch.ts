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
  searchByCoords:    (lat: number, lng: number) => Promise<void>;
  loadMorePlaces:    () => Promise<void>;
  clearPlaces:       () => void;
}

const BASE_PARAMS = {
  query: "ćevapi ćevabdžinica cevapi roštilj pečenjara balkanska kuhinja balkanski roštilj grill",
  limit: "20",
};

// Google activates next_page_token ~2 s after the search response arrives.
// We use 2.5 s as a safety margin and deduct however long the user already waited.
const TOKEN_MIN_AGE_MS = 2500;

/**
 * Manages Google Places search state and fetch logic.
 *
 * searchPlaces(query)      — fresh text search, replaces results, resets pagination
 * searchByCoords(lat, lng) — fresh coordinate search (used by "Search This Area")
 * loadMorePlaces()         — appends next page; respects Google's token activation delay
 * clearPlaces()            — resets all state
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,      setPlaceResults]      = useState<PlaceResult[]>([]);
  const [placesLoading,     setPlacesLoading]     = useState(false);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [placesError,       setPlacesError]       = useState<string | null>(null);
  const [placesSearched,    setPlacesSearched]    = useState(false);
  const [nextPageToken,     setNextPageToken]      = useState<string | null>(null);

  const abortRef          = useRef<AbortController | null>(null);
  // Timestamp (ms) of when the current nextPageToken was received from Google.
  // Used in loadMorePlaces to sleep only the remaining gap, not a full 2.5 s.
  const tokenTimestampRef = useRef<number>(0);

  // ── Shared "store results" helper ────────────────────────────────────────────
  type PlacesJson = {
    results?:       PlaceResult[];
    nextPageToken?: string | null;
    hint?:          string;
    error?:         string;
    status?:        string;
  };

  const storeResults = (json: PlacesJson, ok: boolean) => {
    if (!ok) {
      setPlacesError(json.hint ?? json.error ?? "Greška pri Google pretraživanju.");
      setPlaceResults([]);
    } else {
      setPlaceResults(json.results ?? []);
      if (json.nextPageToken) {
        setNextPageToken(json.nextPageToken);
        tokenTimestampRef.current = Date.now();
      } else {
        setNextPageToken(null);
      }
      setPlacesSearched(true);
    }
  };

  // ── Fresh text search ────────────────────────────────────────────────────────
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
      const json   = await res.json() as PlacesJson;
      storeResults(json, res.ok);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Coordinate search — "Search This Area" from map ─────────────────────────
  const searchByCoords = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);
    setNextPageToken(null);

    try {
      const params = new URLSearchParams({
        ...BASE_PARAMS,
        lat: String(lat),
        lng: String(lng),
      });
      const res  = await fetch(`/api/places?${params}`, { signal: ctrl.signal });
      const json = await res.json() as PlacesJson;
      storeResults(json, res.ok);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlacesError("Mrežna greška pri Google pretraživanju.");
      setPlaceResults([]);
    } finally {
      setPlacesLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load next page — appends results ────────────────────────────────────────
  // Strategy:
  //   1. Deduct however long the user already waited from the required TOKEN_MIN_AGE_MS.
  //   2. If the token still isn't ready (INVALID_REQUEST), retry once after 3 s.
  //   3. Disable the button while in-flight to prevent double-clicks.
  const loadMorePlaces = useCallback(async () => {
    if (!nextPageToken || loadingMorePlaces) return;

    setLoadingMorePlaces(true);
    setPlacesError(null);

    try {
      // ── 1. Respect Google's token activation window ──────────────────────────
      const elapsed = Date.now() - tokenTimestampRef.current;
      const waitMs  = Math.max(0, TOKEN_MIN_AGE_MS - elapsed);
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

      // ── 2. Fetch helper ──────────────────────────────────────────────────────
      const doFetch = async () => {
        const params = new URLSearchParams({ pagetoken: nextPageToken });
        const res    = await fetch(`/api/places?${params}`);
        return { ok: res.ok, json: await res.json() as PlacesJson };
      };

      let { ok, json } = await doFetch();

      // ── 3. One retry if token wasn't ready yet ───────────────────────────────
      if (!ok && (json.status === "INVALID_REQUEST" || json.error?.toLowerCase().includes("invalid"))) {
        console.warn("[usePlacesSearch] next_page_token not yet active — retrying in 3 s…");
        await new Promise((r) => setTimeout(r, 3000));
        ({ ok, json } = await doFetch());
      }

      if (!ok) {
        setPlacesError(json.hint ?? json.error ?? "Greška pri dohvatu sljedeće stranice.");
      } else {
        setPlaceResults((prev) => [...prev, ...(json.results ?? [])]);
        if (json.nextPageToken) {
          setNextPageToken(json.nextPageToken);
          tokenTimestampRef.current = Date.now();
        } else {
          setNextPageToken(null);
        }
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
    searchByCoords,
    loadMorePlaces,
    clearPlaces,
  };
}
