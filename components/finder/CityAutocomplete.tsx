"use client";

// ── CityAutocomplete.tsx ──────────────────────────────────────────────────────
// Google Places Autocomplete bound to a city input.
//
// - Uses useMapsLibrary("places") from @vis.gl/react-google-maps
// - Filters suggestions to cities only (types: ["(cities)"])
// - Fires onSelect(name, lat, lng) when user picks a suggestion
// - Falls back to a plain <input> when no API key is present
// - Wraps in its own APIProvider (singleton loader — no duplicate script)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import dynamic from "next/dynamic";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires when user selects a suggestion — gives exact coordinates */
  onSelect: (name: string, lat: number, lng: number) => void;
  /** Fires when user manually edits the text (clears any previously resolved coords) */
  onClear?: () => void;
  placeholder?: string;
  /** Icon element rendered on the left side of the input */
  leadingIcon?: React.ReactNode;
}

// ── Inner component (requires APIProvider context) ────────────────────────────
function AutocompleteInner({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder,
  leadingIcon,
}: CityAutocompleteProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const placesLib  = useMapsLibrary("places");

  // Keep uncontrolled input in sync with external value resets
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const ac = new placesLib.Autocomplete(inputRef.current, {
      types: ["(cities)"],
      fields: ["name", "geometry", "formatted_address"],
    });

    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        const lat  = place.geometry.location.lat();
        const lng  = place.geometry.location.lng();
        // Prefer `name` (short city name) over the full address string
        const name = place.name ?? place.formatted_address ?? inputRef.current?.value ?? "";
        onChange(name);
        onSelect(name, lat, lng);
      }
    });

    return () => {
      // Clean up the Places listener when the component unmounts
      google.maps.event.removeListener(listener);
    };
  }, [placesLib]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      {leadingIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex">
          {leadingIcon}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => {
          onChange(e.target.value);
          onClear?.();
        }}
        placeholder={placeholder}
        className={`input-base${leadingIcon ? " pl-10" : ""}`}
        autoComplete="off"
      />
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
// Wraps in APIProvider so it can be used anywhere on the page without needing
// to be nested inside the RouteMapClient's APIProvider.
// @vis.gl/react-google-maps uses a global singleton loader — the script is only
// fetched once even when multiple APIProvider instances share the same key.
function CityAutocomplete(props: CityAutocompleteProps) {
  if (!API_KEY) {
    // No Maps key — render a plain input
    return (
      <div className="relative">
        {props.leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex">
            {props.leadingIcon}
          </span>
        )}
        <input
          type="text"
          value={props.value}
          onChange={(e) => { props.onChange(e.target.value); props.onClear?.(); }}
          placeholder={props.placeholder}
          className={`input-base${props.leadingIcon ? " pl-10" : ""}`}
        />
      </div>
    );
  }

  return (
    <>
      {/* Dark-theme overrides for the Google Places dropdown */}
      <style>{`
        .pac-container {
          background: #1e1b18 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 28px rgba(0,0,0,0.55) !important;
          margin-top: 4px !important;
          font-family: system-ui, sans-serif !important;
        }
        .pac-item {
          background: transparent !important;
          border-top: 1px solid rgba(255,255,255,0.06) !important;
          color: #c9b99a !important;
          padding: 8px 12px !important;
          cursor: pointer !important;
          font-size: 13px !important;
        }
        .pac-item:hover,
        .pac-item-selected {
          background: rgba(230,81,0,0.15) !important;
        }
        .pac-item-query {
          color: #fff8f0 !important;
          font-size: 13px !important;
        }
        .pac-matched { color: rgb(230,81,0) !important; font-weight: 600 !important; }
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

// Export as dynamic to avoid SSR (window.google only exists client-side)
export default dynamic(() => Promise.resolve(CityAutocomplete), { ssr: false });
