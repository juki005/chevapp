"use client";

import { useState, useCallback, useRef } from "react";
import type { PlaceResult } from "@/types/places";

export interface UsePlacesSearchReturn {
  placeResults:   PlaceResult[];
  placesLoading:  boolean;
  placesError:    string | null;
  placesSearched: boolean;
  searchPlaces:   (query: string) => Promise<void>;
  clearPlaces:    () => void;
}

/**
 * Manages Google Places search state and fetch logic.
 * The caller is responsible for deciding WHEN to call searchPlaces/clearPlaces
 * (e.g. on debounced input change).
 */
export function usePlacesSearch(): UsePlacesSearchReturn {
  const [placeResults,   setPlaceResults]   = useState<PlaceResult[]>([]);
  const [placesLoading,  setPlacesLoading]  = useState(false);
  const [placesError,    setPlacesError]    = useState<string | null>(null);
  const [placesSearched, setPlacesSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const searchPlaces = useCallback(async (query: string) => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPlacesLoading(true);
    setPlacesError(null);

    try {
      const params = new URLSearchParams({
        near:  query,
        query: "cevapi rostilj grill",
        limit: "20",
      });
      const res  = await fetch(`/api/places?${params.toString()}`, { signal: ctrl.signal });
      const json = await res.json() as { results?: PlaceResult[]; hint?: string; error?: string };

      if (!res.ok) {
        setPlacesError(json.hint ?? json.error ?? `HTTP ${res.status}`);
        setPlaceResults([]);
      } else {
        setPlaceResults(json.results ?? []);
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

  const clearPlaces = useCallback(() => {
    abortRef.current?.abort();
    setPlaceResults([]);
    setPlacesError(null);
    setPlacesSearched(false);
  }, []);

  return { placeResults, placesLoading, placesError, placesSearched, searchPlaces, clearPlaces };
}
