"use client";

// ── LocationFilter · finder (Sprint 26l · DS-migrated) ────────────────────────
// 2-step location picker: Country (ISO code) → City (Google Places Autocomplete).
//
// • Country: fixed list from COUNTRY_CONFIG (Balkans + diaspora)
// • City:    disabled until country chosen; suggestions from /api/autocomplete
//            with componentRestrictions applied server-side
// • Geolocation button: auto-fills both fields via reverse geocode
// • Persistence: localStorage key "chevapp_last_location"
// • Framer Motion: city row fades when disabled; dropdown fades in
//
// Sprint 26l changes:
//   - All arbitrary rgb(var(--token)) classes → semantic aliases
//     (bg-background, border-border, text-foreground, text-muted,
//     text-muted/40, border-border/50, placeholder:text-muted).
//   - All hardcoded #FF6B00 → vatra-hover / primary tokens depending on role:
//     · "Selected" border rings keep border-vatra-hover/60 (the brighter
//       accent hue, matches the pre-DS halo tone).
//     · Hover/active affordances on geolocation + dropdown rows use
//       bg-primary / text-primary (the theme-aware base).
//   - Custom halo shadow-[0_0_0_2px_rgba(255,107,0,0.1/0.08)] →
//     ring-2 ring-vatra-hover/10 (cleaner Tailwind idiom, same pixel effect).
//   - Autocomplete dropdown: previously brand-locked bg-[#161616] +
//     text-white + white/[0.05] divider (sprint-spec era, predates DS).
//     Migrated to mode-aware bg-surface + border-border + text-foreground /
//     text-muted to match the Navbar user dropdown (Sprint 26k) and
//     LanguageSwitcher (Sprint 26f). Row marker and hover tint use primary.
//   - shadow-[0_12px_40px_rgba(0,0,0,0.45)] → shadow-soft-xl (DS elevation).
//   - rounded-[20px] wrapper → rounded-card; rounded-xl → rounded-chip
//     (DS shape scale — same pixels, named tokens).
//   - 🌍 globe + country flag emoji kept: native <option> elements can't
//     render custom SVG, and flags are categorical data markers, not chrome.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Navigation, MapPin, X } from "lucide-react";
import { getLocationFromCoords } from "@/lib/actions/discovery";
import { COUNTRY_CONFIG } from "@/constants/cities";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Prediction {
  place_id: string;
  city:     string;
  subtitle: string;
}

export interface LocationValue {
  country: string; // ISO 3166-1 alpha-2, e.g. "BA" | ""
  city:    string;
}

interface LocationFilterProps {
  value:      LocationValue;
  onChange:   (v: LocationValue) => void;
  className?: string;
}

const STORAGE_KEY = "chevapp_last_location";

// ── Component ─────────────────────────────────────────────────────────────────
export function LocationFilter({ value, onChange, className }: LocationFilterProps) {
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [showDrop,     setShowDrop]     = useState(false);
  const [inputValue,   setInputValue]   = useState(value.city);
  const [geolocating,  setGeolocating]  = useState(false);
  const [loadingSugg,  setLoadingSugg]  = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const geoTriedRef = useRef(false);

  const debouncedInput = useDebounce(inputValue, 300);

  // Keep local input in sync when city is set externally (e.g. geolocation)
  useEffect(() => {
    setInputValue(value.city);
  }, [value.city]);

  // ── Init: restore from localStorage, then try silent geolocation ───────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as LocationValue | null;
      if (saved?.country) {
        onChange(saved);
        return; // Skip geolocation — we already have a saved location
      }
    } catch { /* ignore corrupted storage */ }

    // First visit: try silent background geolocation
    if (!geoTriedRef.current && typeof navigator !== "undefined" && "geolocation" in navigator) {
      geoTriedRef.current = true;
      setGeolocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const loc = await getLocationFromCoords(pos.coords.latitude, pos.coords.longitude);
            if (COUNTRY_CONFIG[loc.countryCode]) {
              const next: LocationValue = { country: loc.countryCode, city: loc.city };
              onChange(next);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
          } finally {
            setGeolocating(false);
          }
        },
        () => setGeolocating(false),
        { timeout: 6000, maximumAge: 300_000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist whenever value changes (only if country is set)
  useEffect(() => {
    if (value.country) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  }, [value]);

  // ── Fetch autocomplete suggestions ─────────────────────────────────────────
  useEffect(() => {
    if (!debouncedInput || debouncedInput.length < 2 || !value.country) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    setLoadingSugg(true);

    fetch(`/api/autocomplete?${new URLSearchParams({ input: debouncedInput, country: value.country })}`)
      .then((r) => r.json())
      .then((d: { predictions?: Prediction[] }) => {
        if (!cancelled) {
          setPredictions(d.predictions ?? []);
          setShowDrop(true);
        }
      })
      .catch(() => { /* silently fail */ })
      .finally(() => { if (!cancelled) setLoadingSugg(false); });

    return () => { cancelled = true; };
  }, [debouncedInput, value.country]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDrop) return;
    const handler = (e: MouseEvent) => {
      if (
        !dropRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDrop(false);
        setPredictions([]);
        // Revert unconfirmed text to the last saved city
        setInputValue(value.city);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDrop, value.city]);

  // ── Manual geolocation ─────────────────────────────────────────────────────
  const handleGeolocate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await getLocationFromCoords(pos.coords.latitude, pos.coords.longitude);
          const next: LocationValue = {
            country: COUNTRY_CONFIG[loc.countryCode] ? loc.countryCode : value.country,
            city:    loc.city,
          };
          onChange(next);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } finally {
          setGeolocating(false);
        }
      },
      () => setGeolocating(false),
      { timeout: 6000 },
    );
  }, [onChange, value.country]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCountryChange = (country: string) => {
    const next: LocationValue = { country, city: "" };
    onChange(next);
    setInputValue("");
    setPredictions([]);
    setShowDrop(false);
    if (country) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCitySelect = (city: string) => {
    const next: LocationValue = { ...value, city };
    onChange(next);
    setInputValue(city);
    setPredictions([]);
    setShowDrop(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleClearCity = () => {
    const next: LocationValue = { ...value, city: "" };
    onChange(next);
    setInputValue("");
    setPredictions([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    inputRef.current?.focus();
  };

  const cityEnabled = !!value.country;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "flex flex-col rounded-card gap-3",
      "sm:flex-row sm:rounded-none sm:gap-3",
      className,
    )}>

      {/* ── Country Select ──────────────────────────────────────────────────── */}
      <div className="relative sm:w-52 flex-shrink-0">
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none z-10" />
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={cn(
            "w-full appearance-none pl-3 pr-8 py-2.5 rounded-chip border text-sm",
            "transition-all outline-none cursor-pointer",
            "bg-background",
            value.country
              ? "border-vatra-hover/60 text-foreground ring-2 ring-vatra-hover/10"
              : "border-border text-muted",
          )}
        >
          <option value="">🌍 Odaberi državu</option>
          {Object.entries(COUNTRY_CONFIG).map(([code, { display, flag }]) => (
            <option key={code} value={code}>{flag} {display}</option>
          ))}
        </select>
      </div>

      {/* ── City Autocomplete — slides in when country is selected ─────────── */}
      <motion.div
        className="relative flex-1 min-w-0"
        animate={{ opacity: cityEnabled ? 1 : 0.5 }}
        transition={{ duration: 0.2 }}
      >
        {/* Input */}
        <div className="relative">
          {loadingSugg ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vatra-hover animate-spin pointer-events-none" />
          ) : (
            <MapPin className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
              cityEnabled ? "text-muted" : "text-muted/40",
            )} />
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowDrop(true); }}
            onFocus={() => { if (predictions.length > 0) setShowDrop(true); }}
            disabled={!cityEnabled}
            placeholder={cityEnabled ? "Upiši grad..." : "Prvo odaberi državu"}
            className={cn(
              "w-full pl-9 py-2.5 rounded-chip border text-sm",
              "bg-background placeholder:text-muted",
              "transition-all outline-none",
              value.city ? "pr-8" : "pr-3",
              cityEnabled
                ? cn(
                    "text-foreground cursor-text",
                    value.city
                      ? "border-vatra-hover/60 ring-2 ring-vatra-hover/10"
                      : "border-border focus:border-vatra-hover/50 focus:ring-2 focus:ring-vatra-hover/10",
                  )
                : "border-border/50 text-muted cursor-not-allowed",
            )}
          />

          {/* Clear city button */}
          {value.city && cityEnabled && (
            <button
              onClick={handleClearCity}
              aria-label="Očisti grad"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Autocomplete Dropdown ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showDrop && predictions.length > 0 && (
            <motion.div
              ref={dropRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              role="listbox"
              className={cn(
                "absolute top-full mt-1.5 left-0 right-0 z-50",
                "rounded-chip overflow-hidden",
                // Mode-aware popover — matches Navbar user dropdown + LanguageSwitcher
                "bg-surface border border-border shadow-soft-xl",
              )}
            >
              {predictions.map((p, i) => (
                <button
                  key={p.place_id}
                  role="option"
                  aria-selected={value.city === p.city}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click registers
                    handleCitySelect(p.city);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                    "transition-colors hover:bg-primary/10 active:bg-primary/20",
                    i < predictions.length - 1 && "border-b border-border/50",
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-snug">{p.city}</p>
                    <p className="text-xs text-muted truncate leading-snug">{p.subtitle}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Geolocation button ─────────────────────────────────────────────── */}
      <button
        onClick={handleGeolocate}
        disabled={geolocating}
        title="Koristi moju lokaciju"
        aria-label="Automatski detektuj lokaciju"
        className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-full sm:w-[44px] h-[44px] rounded-chip border text-sm",
          "transition-all active:scale-95",
          geolocating
            ? "border-primary/40 bg-primary/10 text-primary cursor-wait"
            : "border-border text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/10",
        )}
      >
        {geolocating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Navigation className="w-4 h-4" />
        }
        <span className="sm:hidden ml-2 text-xs font-medium">Koristi lokaciju</span>
      </button>

    </div>
  );
}
