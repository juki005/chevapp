"use client";

// ── RestaurantAutocomplete · profile (Sprint 26w · DS-migrated) ──────────────
// Google Places Autocomplete bound to an establishment (restaurant) input.
//
// - Uses useMapsLibrary("places") from @vis.gl/react-google-maps
// - Filters suggestions to establishments (restaurants, cafes, etc.)
// - Fires onSelect(name, city, placeId) when user picks a suggestion
// - Extracts city from address_components for auto-fill
// - Falls back to a plain <input> when no API key is present
// - Lazy-loaded (ssr: false) so the profile page stays fast
//
// Sprint 26w changes:
//   - Both <input> classNames: rgb(var(--token)) chains → semantic aliases.
//   - Inline <style> block for .pac-container (Google's autocomplete dropdown
//     renders OUTSIDE React in document.body, so its styles must be global).
//     Previously hardcoded Ugljen-only hex colours (#1e1b18 surface, #c9b99a
//     muted cream, #fff8f0 bright cream, rgb(230,81,0) orange) — would render
//     mode-mismatched on Somun (dark dropdown floating over a light page).
//     Migrated to rgb(var(--token)) so the dropdown follows mode automatically.
//     Same latent-bug fix pattern as GastroMapClient (Sprint 26v).
//   - rounded-lg input → rounded-chip (DS shape scale).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import dynamic from "next/dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface RestaurantAutocompleteProps {
  value:     string;
  onChange:  (value: string) => void;
  /** Fires when user selects a Place — city is extracted from address_components */
  onSelect:  (name: string, city: string, placeId: string) => void;
  onClear?:  () => void;
  placeholder?: string;
}

/** Pull the city name out of Google Places address_components */
function extractCity(
  components: google.maps.GeocoderAddressComponent[],
): string {
  const find = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)));
  return (
    find("locality")?.long_name ??
    find("sublocality", "sublocality_level_1")?.long_name ??
    find("administrative_area_level_2")?.long_name ??
    find("administrative_area_level_1")?.long_name ??
    ""
  );
}

// Shared input className — DRY across the autocomplete + fallback paths
const inputCls =
  "w-full px-3 py-2 rounded-chip border border-border bg-surface/50 text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/50 transition-colors";

// ── Inner component (requires APIProvider context) ────────────────────────────
function AutocompleteInner({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder,
}: RestaurantAutocompleteProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary("places");

  // Keep uncontrolled input in sync with external value resets
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const ac = new placesLib.Autocomplete(inputRef.current, {
      types:  ["establishment"],
      fields: ["name", "geometry", "formatted_address", "address_components", "place_id"],
    });

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place.name) {
        const city    = extractCity(place.address_components ?? []);
        const placeId = place.place_id ?? "";
        onChange(place.name);
        onSelect(place.name, city, placeId);
      }
    });

    return () => { google.maps.event.removeListener(listener); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => { onChange(e.target.value); onClear?.(); }}
        placeholder={placeholder ?? "npr. Željo 1, Kod Muje…"}
        className={inputCls}
        autoComplete="off"
      />
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
function RestaurantAutocomplete(props: RestaurantAutocompleteProps) {
  if (!API_KEY) {
    // No Maps key — render a plain input
    return (
      <input
        type="text"
        value={props.value}
        onChange={(e) => { props.onChange(e.target.value); props.onClear?.(); }}
        placeholder={props.placeholder ?? "npr. Željo 1, Kod Muje…"}
        className={inputCls}
      />
    );
  }

  return (
    <>
      {/* Google's pac-container dropdown is portal'd to document.body, so it
          can't inherit Tailwind utilities — needs raw global CSS. Using
          rgb(var(--token)) so it follows Ugljen/Somun mode automatically.
          Previously hardcoded dark-only hex (#1e1b18, #c9b99a, #fff8f0)
          rendered mode-mismatched on Somun pages. */}
      <style>{`
        .pac-container {
          background: rgb(var(--surface)) !important;
          border: 1px solid rgb(var(--border)) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,0.35) !important;
          margin-top: 4px !important;
          font-family: system-ui, sans-serif !important;
        }
        .pac-item {
          background: transparent !important;
          border-top: 1px solid rgb(var(--border) / 0.5) !important;
          color: rgb(var(--muted)) !important;
          padding: 8px 12px !important;
          cursor: pointer !important;
          font-size: 13px !important;
        }
        .pac-item:hover, .pac-item-selected {
          background: rgb(var(--primary) / 0.1) !important;
        }
        .pac-item-query { color: rgb(var(--foreground)) !important; font-size: 13px !important; }
        .pac-matched { color: rgb(var(--primary)) !important; font-weight: 600 !important; }
        .pac-icon { display: none !important; }
        .pac-logo::after { display: none !important; }
        .hdpi .pac-icon { display: none !important; }
      `}</style>
      <APIProvider apiKey={API_KEY} libraries={["places"]}>
        <AutocompleteInner {...props} />
      </APIProvider>
    </>
  );
}

// Export as dynamic to avoid SSR — window.google only exists client-side
export default dynamic(() => Promise.resolve(RestaurantAutocomplete), { ssr: false });
