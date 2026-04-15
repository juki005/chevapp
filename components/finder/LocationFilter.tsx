"use client";

// ── LocationFilter ─────────────────────────────────────────────────────────────
// 2-step location picker: Country (ISO code) → City (Google Places Autocomplete).
//
// • Country: fixed list from COUNTRY_CONFIG (Balkans + diaspora)
// • City:    disabled until country chosen; suggestions from /api/autocomplete
//            with componentRestrictions applied server-side
// • Geolocation button: auto-fills both fields via reverse geocode
// • Persistence: localStorage key "chevapp_last_location"
// • Framer Motion: city row slides down when enabled; dropdown fades in
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Navigation, MapPin, X, Compass } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
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
  const locale = useLocale();

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
      "flex flex-col rounded-[20px] gap-3",
      "sm:flex-row sm:rounded-none sm:gap-3",
      className,
    )}>

      {/* ── Country Select ──────────────────────────────────────────────────── */}
      <div className="relative sm:w-52 flex-shrink-0">
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))] pointer-events-none z-10" />
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={cn(
            "w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-sm",
            "transition-all outline-none cursor-pointer",
            "bg-[rgb(var(--background))]",
            value.country
              ? "border-[#FF6B00]/60 text-[rgb(var(--foreground))] shadow-[0_0_0_2px_rgba(255,107,0,0.10)]"
              : "border-[rgb(var(--border))] text-[rgb(var(--muted))]",
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
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B00] animate-spin pointer-events-none" />
          ) : (
            <MapPin className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
              cityEnabled ? "text-[rgb(var(--muted))]" : "text-[rgb(var(--muted))/0.4]",
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
              "w-full pl-9 py-2.5 rounded-xl border text-sm",
              "bg-[rgb(var(--background))] placeholder:text-[rgb(var(--muted))]",
              "transition-all outline-none",
              value.city ? "pr-8" : "pr-3",
              cityEnabled
                ? cn(
                    "text-[rgb(var(--foreground))] cursor-text",
                    value.city
                      ? "border-[#FF6B00]/60 shadow-[0_0_0_2px_rgba(255,107,0,0.10)]"
                      : "border-[rgb(var(--border))] focus:border-[#FF6B00]/50 focus:shadow-[0_0_0_2px_rgba(255,107,0,0.08)]",
                  )
                : "border-[rgb(var(--border))/0.5] text-[rgb(var(--muted))] cursor-not-allowed",
            )}
          />

          {/* Clear city button */}
          {value.city && cityEnabled && (
            <button
              onClick={handleClearCity}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
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
              className={cn(
                "absolute top-full mt-1.5 left-0 right-0 z-50",
                "rounded-xl overflow-hidden",
                // Dark card — brand-orange accent — matches sprint spec
                "bg-[#161616] border border-[#FF6B00]/20",
                "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
              )}
            >
              {predictions.map((p, i) => (
                <button
                  key={p.place_id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click registers
                    handleCitySelect(p.city);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                    "transition-colors hover:bg-[#FF6B00]/12 active:bg-[#FF6B00]/20",
                    i < predictions.length - 1 && "border-b border-white/[0.05]",
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate leading-snug">{p.city}</p>
                    <p className="text-xs text-white/35 truncate leading-snug">{p.subtitle}</p>
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
          "w-full sm:w-[44px] h-[44px] rounded-xl border text-sm",
          "transition-all active:scale-95",
          geolocating
            ? "border-[#FF6B00]/40 bg-[#FF6B00]/08 text-[#FF6B00] cursor-wait"
            : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-[#FF6B00]/50 hover:text-[#FF6B00] hover:bg-[#FF6B00]/06",
        )}
      >
        {geolocating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Navigation className="w-4 h-4" />
        }
        <span className="sm:hidden ml-2 text-xs font-medium">Koristi lokaciju</span>
      </button>

      {/* ── "Istraži" — TripAdvisor-green link to Community / Explore tab ─── */}
      <Link
        href={`/${locale}/community?tab=explore${value.city ? `&search=${encodeURIComponent(value.city)}` : ""}`}
        title="Istraži grad na TripAdvisoru i zajednici"
        aria-label="Istraži Community stranicu"
        className={cn(
          "flex-shrink-0 flex items-center justify-center gap-1.5",
          "w-full sm:w-auto sm:px-3 h-[44px] rounded-xl text-sm font-semibold",
          "transition-all active:scale-95",
          "bg-[#00af87] text-white hover:bg-[#008a6a]",
          "shadow-sm hover:shadow-md",
        )}
      >
        <Compass className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline text-xs whitespace-nowrap">Istraži</span>
        <span className="sm:hidden text-xs font-medium">Istraži zajednicu</span>
      </Link>
    </div>
  );
}
