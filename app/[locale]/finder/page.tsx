"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  MapPin, Search, Map, List, Loader2, ServerCrash,
  SlidersHorizontal, CheckCircle, XCircle, RefreshCw, X, ChevronDown, Heart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StyleFilter } from "@/components/finder/StyleFilter";
import { RestaurantCard } from "@/components/finder/RestaurantCard";
import { RestaurantGridSkeleton } from "@/components/finder/RestaurantCardSkeleton";
import { RestaurantDetailModal, type ProfileTarget } from "@/components/finder/RestaurantDetailModal";
import { CevapRuletModal } from "@/components/finder/CevapRuletModal";
import { RestaurantMap, type MapRestaurant } from "@/components/finder/RestaurantMap";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import type { Restaurant, CevapStyle } from "@/types";
import { cn } from "@/lib/utils";

// Mirrors the PlaceResult shape returned by /api/places — kept here to avoid
// importing server-only Next.js types (NextRequest/NextResponse) in a client bundle.
interface PlaceResult {
  place_id:  string;
  name:      string;
  address:   string;
  city:      string;
  latitude:  number | null;
  longitude: number | null;
  rating:    number | null;
  open_now:  boolean | null;
  types:     string[];
  source:    "google";
}

type ViewMode = "grid" | "map";

// ── Adapter: PlaceResult → MapRestaurant ─────────────────────────────────────
function placeToMapPin(r: PlaceResult): MapRestaurant {
  return {
    fsq_id:    r.place_id,   // reuse fsq_id slot as the unique key
    name:      r.name,
    city:      r.city,
    address:   r.address,
    latitude:  r.latitude,
    longitude: r.longitude,
    source:    "google",
  };
}

function toMapPin(r: Restaurant): MapRestaurant {
  return {
    id:            r.id,
    name:          r.name,
    city:          r.city,
    address:       r.address,
    latitude:      r.latitude,
    longitude:     r.longitude,
    lepinja_rating: r.lepinja_rating,
    is_verified:   r.is_verified,
    tags:          r.tags,
    source:        "supabase",
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function FinderPage() {
  const t = useTranslations("finder");

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // ── DB restaurants ────────────────────────────────────────────────────────
  const [dbRestaurants, setDbRestaurants] = useState<Restaurant[]>([]);
  const [dbLoading,     setDbLoading]     = useState(true);
  const [dbError,       setDbError]       = useState<string | null>(null);

  // ── Filters — restored from localStorage so search survives page changes ──
  const [searchTerm,      setSearchTerm]      = useState("");
  const [selectedCity,    setSelectedCity]    = useState("");
  const [activeStyle,     setActiveStyle]     = useState<CevapStyle | "">("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [filtersRestored, setFiltersRestored] = useState(false);

  // Restore on first mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("chevapp:finder_state") ?? "{}");
      if (saved.searchTerm)   setSearchTerm(saved.searchTerm);
      if (saved.selectedCity) setSelectedCity(saved.selectedCity);
      if (saved.activeStyle)  setActiveStyle(saved.activeStyle as CevapStyle);
    } catch { /* ignore */ }
    setFiltersRestored(true);
  }, []);

  // Persist on every change (but only after initial restore to avoid overwriting)
  useEffect(() => {
    if (!filtersRestored) return;
    localStorage.setItem("chevapp:finder_state", JSON.stringify({ searchTerm, selectedCity, activeStyle }));
  }, [searchTerm, selectedCity, activeStyle, filtersRestored]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  // ── Review averages (restaurant_id → avg rating 1–5) ─────────────────────
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});

  // ── Google Places results ─────────────────────────────────────────────────
  const [placeResults,  setPlaceResults]  = useState<PlaceResult[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError,   setPlacesError]   = useState<string | null>(null);
  const [placesSearched, setPlacesSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Profile modal — shared between DB cards and Google Places cards ───────
  const [selectedRestaurant, setSelectedRestaurant] = useState<ProfileTarget | null>(null);

  // ── Ćevap-Rulet ───────────────────────────────────────────────────────────
  const [ruletOpen, setRuletOpen] = useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  // Open rulet via custom event (from MobileBottomNav) or ?rulet=1 URL param
  useEffect(() => {
    const handler = () => setRuletOpen(true);
    window.addEventListener("chevapp:open_rulet", handler);

    // Also handle ?rulet=1 from the bottom nav deep-link
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("rulet") === "1") {
        setRuletOpen(true);
        // Clean up the URL without triggering a navigation
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }
    }

    return () => window.removeEventListener("chevapp:open_rulet", handler);
  }, []);

  // ── Favorites-only filter ─────────────────────────────────────────────────
  const [favOnly,       setFavOnly]       = useState(false);
  const [favPlaceKeys,  setFavPlaceKeys]  = useState<string[]>([]);   // localStorage keys
  const [favDbIds,      setFavDbIds]      = useState<string[]>([]);   // Supabase DB ids

  // Load favorites on mount so the filter has data
  useEffect(() => {
    // localStorage (Google Places)
    try {
      const ls = JSON.parse(localStorage.getItem("chevapp:place_favorites") ?? "[]") as string[];
      setFavPlaceKeys(ls);
    } catch { /* ignore */ }

    // Supabase (DB restaurants) — only if logged in
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("user_favorites").select("restaurant_id").eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setFavDbIds((data as { restaurant_id: string }[]).map((r) => r.restaurant_id));
        });
    });
  }, []);

  // ── Map ↔ List selection sync ─────────────────────────────────────────────
  const [selectedMapKey, setSelectedMapKey] = useState<string | null>(null);

  // When map selection changes (map→list), scroll the card into view in list mode
  useEffect(() => {
    if (!selectedMapKey || viewMode !== "grid") return;
    const el = document.getElementById(`card-${selectedMapKey}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedMapKey, viewMode]);

  // ── Seed ──────────────────────────────────────────────────────────────────
  const [seeding,  setSeeding]  = useState(false);
  const [seedMsg,  setSeedMsg]  = useState<{ ok: boolean; text: string } | null>(null);

  // ── Load city list + review averages once ─────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    supabase.from("restaurants").select("city").then(({ data }) => {
      if (data) {
        const cities = [...new Set((data as { city: string }[]).map((r) => r.city))].sort();
        setAvailableCities(cities);
      }
    });

    supabase.from("reviews").select("restaurant_id, rating").then(({ data }) => {
      if (!data) return;
      const sums: Record<string, { sum: number; count: number }> = {};
      for (const row of (data as { restaurant_id: string; rating: number }[])) {
        if (!sums[row.restaurant_id]) sums[row.restaurant_id] = { sum: 0, count: 0 };
        sums[row.restaurant_id].sum   += row.rating;
        sums[row.restaurant_id].count += 1;
      }
      const avgs: Record<string, number> = {};
      for (const [id, { sum, count }] of Object.entries(sums)) {
        avgs[id] = sum / count;
      }
      setAvgRatings(avgs);
    });
  }, []);

  // ── DB fetch — re-runs on filter change ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDbLoading(true);
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from("restaurants")
          .select("id, name, style, city, address, latitude, longitude, lepinja_rating, is_verified, tags, slug, google_place_id, phone, website")
          .order("lepinja_rating", { ascending: false });

        if (debouncedSearch.trim()) q = q.ilike("name", `%${debouncedSearch.trim()}%`);
        if (selectedCity)           q = q.eq("city", selectedCity);
        if (activeStyle)            q = q.eq("style", activeStyle);

        const { data, error } = await q;
        if (cancelled) return;
        if (error) throw error;
        setDbRestaurants((data as Restaurant[]) ?? []);
        setDbError(null);
      } catch (err) {
        if (!cancelled) {
          console.error("[finder] Supabase load error:", err);
          setDbError("Greška pri učitavanju baze. Provjeri Supabase konfiguraciju.");
        }
      } finally {
        if (!cancelled) setDbLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [debouncedSearch, selectedCity, activeStyle]);

  // ── Google Places search ──────────────────────────────────────────────────
  const searchPlaces = useCallback(async (city: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPlacesLoading(true);
    setPlacesError(null);
    try {
      const params = new URLSearchParams({
        near:  city,
        query: "cevapi rostilj grill",
        limit: "20",
      });
      const res  = await fetch(`/api/places?${params.toString()}`, { signal: ctrl.signal });
      const json = await res.json();
      if (!res.ok) {
        setPlacesError(json?.hint ?? json?.error ?? `HTTP ${res.status}`);
        setPlaceResults([]);
      } else {
        setPlaceResults((json.results as PlaceResult[]) ?? []);
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

  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      searchPlaces(debouncedSearch.trim());
    } else {
      setPlaceResults([]);
      setPlacesError(null);
      setPlacesSearched(false);
    }
    return () => { abortRef.current?.abort(); };
  }, [debouncedSearch, searchPlaces]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(searchTerm || selectedCity || activeStyle || favOnly);

  // ── Tagged place IDs per style (for crowdsourced finder sync) ──────────────
  const [taggedPlaceIds, setTaggedPlaceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeStyle || placeResults.length === 0) {
      setTaggedPlaceIds(new Set());
      return;
    }
    const supabase = createClient();
    supabase
      .from("restaurants")
      .select("google_place_id")
      .eq("style", activeStyle)
      .not("google_place_id", "is", null)
      .then(({ data }) => {
        const ids = new Set(
          (data ?? []).map((r: { google_place_id: string | null }) => r.google_place_id ?? "").filter(Boolean)
        );
        setTaggedPlaceIds(ids);
      });
  }, [activeStyle, placeResults.length]);

  // Re-fetch tagged IDs when user tags a new restaurant
  useEffect(() => {
    const handler = () => {
      if (!activeStyle) return;
      const supabase = createClient();
      supabase
        .from("restaurants")
        .select("google_place_id")
        .eq("style", activeStyle)
        .not("google_place_id", "is", null)
        .then(({ data }) => {
          setTaggedPlaceIds(new Set(
            (data ?? []).map((r: { google_place_id: string | null }) => r.google_place_id ?? "").filter(Boolean)
          ));
        });
    };
    window.addEventListener("chevapp:restaurant_tagged", handler);
    return () => window.removeEventListener("chevapp:restaurant_tagged", handler);
  }, [activeStyle]);

  // Apply favorites filter + style tag filter to DB and Google Places results
  const visibleDbRestaurants = favOnly
    ? dbRestaurants.filter((r) => favDbIds.includes(r.id))
    : dbRestaurants;

  const visiblePlaceResults = (() => {
    let results = favOnly
      ? placeResults.filter((r) => favPlaceKeys.includes(`${r.name}::${r.city}`))
      : placeResults;
    // When a style filter is active and we have tagged results, show only tagged places
    if (activeStyle && taggedPlaceIds.size > 0) {
      results = results.filter((r) => taggedPlaceIds.has(r.place_id));
    }
    return results;
  })();

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCity("");
    setActiveStyle("");
    setFavOnly(false);
    localStorage.removeItem("chevapp:finder_state");
  };

  // Merge DB pins + Google Places pins, deduplicating by proximity
  const mapPins: MapRestaurant[] = [
    ...dbRestaurants.map(toMapPin),
    ...(placesSearched && placeResults.length > 0
      ? placeResults.map(placeToMapPin).filter(
          (gp) =>
            !dbRestaurants.some(
              (db) =>
                db.latitude != null &&
                Math.abs(db.latitude  - (gp.latitude  ?? 999)) < 0.002 &&
                Math.abs((db.longitude ?? 0) - (gp.longitude ?? 999)) < 0.002
            )
        )
      : []),
  ];

  // ── Seed helper ───────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res  = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSeedMsg({ ok: true, text: json.message });
        setDbError(null);
        const supabase = createClient();
        supabase.from("restaurants").select("city").then(({ data }) => {
          if (data) setAvailableCities([...new Set((data as { city: string }[]).map((r) => r.city))].sort());
        });
      } else {
        setSeedMsg({ ok: false, text: json.error ?? "Seed nije uspio." });
      }
    } catch (err) {
      setSeedMsg({ ok: false, text: String(err) });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold text-[rgb(var(--foreground))] uppercase tracking-wide"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {t("title")}
              </h1>
              <p className="text-[rgb(var(--muted))] text-sm mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 mb-5 space-y-3">
          {/* Row 1: search + city + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Name search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              {placesLoading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--primary))] animate-spin" />
              )}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors text-sm"
              />
            </div>

            {/* City dropdown */}
            <div className="relative sm:w-48 flex-shrink-0">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--muted))] pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className={cn(
                  "w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border bg-[rgb(var(--background))] text-sm transition-colors outline-none",
                  selectedCity
                    ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--foreground))]"
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
                )}
              >
                <option value="">Svi gradovi</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* View toggle — full-width on mobile, auto on sm+ */}
            <div className="flex rounded-xl border border-[rgb(var(--border))] overflow-hidden w-full sm:w-auto flex-shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[44px] py-2.5 text-sm font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-[rgb(var(--primary))] text-white"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                )}
              >
                <List className="w-4 h-4" />
                <span>Lista</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 min-h-[44px] py-2.5 text-sm font-medium transition-colors border-l border-[rgb(var(--border))]",
                  viewMode === "map"
                    ? "bg-[rgb(var(--primary))] text-white"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                )}
              >
                <Map className="w-4 h-4" />
                <span>Mapa</span>
              </button>
            </div>
          </div>

          {/* Row 2: style filter + favorites toggle + clear */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <StyleFilter
              activeStyle={activeStyle}
              onStyleChange={(s) => setActiveStyle(s as CevapStyle | "")}
            />
            <div className="flex items-center gap-2 flex-shrink-0 self-start mt-0.5 flex-wrap">
              {/* 🎡 Rulet button */}
              <motion.button
                onClick={() => setRuletOpen(true)}
                animate={{
                  boxShadow: [
                    "0 2px 10px rgba(232,78,15,0.25)",
                    "0 2px 18px rgba(232,78,15,0.55)",
                    "0 2px 10px rgba(232,78,15,0.25)",
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(232,78,15,0.5)] text-xs font-bold transition-all text-white"
                style={{
                  background: "linear-gradient(135deg, #E84E0F 0%, #F97316 100%)",
                  fontFamily: "Oswald, sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                🎡 RULET
              </motion.button>

              {/* Favorites-only toggle */}
              <button
                onClick={() => setFavOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                  favOnly
                    ? "border-red-400/50 bg-red-400/10 text-red-400"
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-red-400/40 hover:text-red-400"
                )}
              >
                <Heart className={cn("w-3 h-3", favOnly && "fill-red-400")} />
                Samo favoriti
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))] hover:text-red-400 hover:border-red-400/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Obriši filtere
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────────────────── */}
        {seedMsg && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm mb-4",
            seedMsg.ok
              ? "border-green-500/40 bg-green-500/8 text-green-300"
              : "border-red-500/40 bg-red-500/8 text-red-300"
          )}>
            {seedMsg.ok
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <XCircle    className="w-4 h-4 flex-shrink-0" />}
            <span>{seedMsg.text}</span>
            <button onClick={() => setSeedMsg(null)} className="ml-auto text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">×</button>
          </div>
        )}

        {/* Google Places results banner */}
        {placesSearched && !placesLoading && placeResults.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#4285f4]/25 bg-[#4285f4]/5 text-sm mb-4">
            <span className="text-[#4285f4] text-base">G</span>
            <span className="text-[rgb(var(--muted))]">
              Google Places:{" "}
              <span className="text-[rgb(var(--foreground))] font-medium">
                {placeResults.length} lokacija
              </span>{" "}
              pronađeno za &ldquo;{searchTerm}&rdquo;
            </span>
          </div>
        )}

        {placesError && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 text-sm mb-4">
            <span className="text-amber-400">⚠️</span>
            <span className="text-amber-300">{placesError}</span>
          </div>
        )}

        {dbError && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-red-500/30 bg-red-500/5 mb-5">
            <ServerCrash className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{dbError}</p>
              <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                Provjeri{" "}
                <code className="px-1 rounded bg-[rgb(var(--surface))] text-[rgb(var(--primary))]">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                u{" "}
                <code className="px-1 rounded bg-[rgb(var(--surface))] text-[rgb(var(--primary))]">
                  .env.local
                </code>
              </p>
            </div>
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
            {dbLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Učitavanje...
              </span>
            ) : (
              <>
                <span>
                  <span className="text-[rgb(var(--foreground))] font-medium">{dbRestaurants.length}</span>{" "}
                  verificiranih lokacija
                  {hasActiveFilters && (
                    <span className="text-[rgb(var(--primary))] ml-1">(filtrirano)</span>
                  )}
                </span>
                {placesSearched && (
                  <span>
                    +{" "}
                    <span className="text-[#4285f4] font-medium">{placeResults.length}</span>{" "}
                    Google Places rezultata
                  </span>
                )}
              </>
            )}
          </div>

          {!dbLoading && dbRestaurants.length === 0 && !dbError && !hasActiveFilters && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] text-white text-xs font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-60"
            >
              {seeding
                ? <Loader2   className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {seeding ? "Seeding..." : "Seed bazu podataka"}
            </button>
          )}
        </div>

        {/* ── MAP VIEW ───────────────────────────────────────────────────── */}
        {viewMode === "map" && (
          <RestaurantMap
            restaurants={mapPins}
            height="520px"
            selectedId={selectedMapKey}
            onSelect={setSelectedMapKey}
          />
        )}

        {/* ── GRID VIEW ──────────────────────────────────────────────────── */}
        {viewMode === "grid" && (
          <div>
            {dbLoading ? (
              <RestaurantGridSkeleton />

            ) : visibleDbRestaurants.length === 0 && !placesSearched && !hasActiveFilters ? (
              /* Empty DB */
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-6xl">🍖</span>
                <p
                  className="text-[rgb(var(--foreground))] font-semibold text-lg"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  Nema restorana u bazi
                </p>
                <p className="text-[rgb(var(--muted))] text-sm text-center max-w-sm">
                  Klikni ispod za automatsko punjenje baze s 6 legendarnih mjesta,
                  ili upiši grad iznad.
                </p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white font-semibold text-sm hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-60"
                >
                  {seeding
                    ? <Loader2   className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {seeding ? "Seeding..." : "Seed 6 legendarnih restorana"}
                </button>
              </div>

            ) : visibleDbRestaurants.length === 0 && hasActiveFilters && !(placesSearched && visiblePlaceResults.length > 0) ? (
              /* No filter results — only shown when Places also returned nothing */
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl">🔍</span>
                <p
                  className="text-[rgb(var(--foreground))] font-semibold"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  Nema rezultata
                </p>
                <p className="text-[rgb(var(--muted))] text-sm text-center max-w-xs">
                  Nijedan restoran ne odgovara odabranim filterima.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-1 text-xs text-[rgb(var(--primary))] hover:underline"
                >
                  Obriši filtere
                </button>
              </div>

            ) : (
              <>
                {/* ── Verified DB grid ─────────────────────────────────── */}
                {visibleDbRestaurants.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3 h-3" />
                      Verificirani restorani ({visibleDbRestaurants.length})
                      {favOnly && <span className="text-red-400 ml-1">· Samo favoriti ❤️</span>}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visibleDbRestaurants.map((r) => (
                        <div
                          key={r.id}
                          id={`card-${r.id}`}
                          onClick={() => setSelectedMapKey(r.id === selectedMapKey ? null : r.id)}
                          className={cn(
                            "rounded-2xl transition-all cursor-pointer",
                            selectedMapKey === r.id
                              ? "ring-2 ring-[rgb(var(--primary))] ring-offset-2 ring-offset-[rgb(var(--background))]"
                              : ""
                          )}
                        >
                          <RestaurantCard
                            restaurant={r}
                            avgRating={avgRatings[r.id] ?? null}
                            onProfileClick={() => setSelectedRestaurant({ id: r.id, name: r.name, city: r.city, address: r.address, is_verified: r.is_verified })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Google Places grid ───────────────────────────────── */}
                {placesSearched && visiblePlaceResults.length > 0 && (
                  <div>
                    <p className="text-xs text-[#4285f4] uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                      <span className="font-bold">G</span>
                      Google Places — &ldquo;{searchTerm}&rdquo; ({visiblePlaceResults.length})
                      {favOnly && <span className="text-red-400 ml-1">· Samo favoriti ❤️</span>}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visiblePlaceResults.map((r) => (
                        <div
                          key={r.place_id}
                          id={`card-${r.place_id}`}
                          onClick={() => setSelectedMapKey(r.place_id === selectedMapKey ? null : r.place_id)}
                          className={cn(
                            "rounded-2xl border border-[#4285f4]/20 bg-[rgb(var(--surface)/0.4)] p-5 cursor-pointer transition-all",
                            selectedMapKey === r.place_id
                              ? "ring-2 ring-[#4285f4] ring-offset-2 ring-offset-[rgb(var(--background))]"
                              : ""
                          )}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-3xl leading-none">📍</span>
                            <div className="flex-1 min-w-0">
                              <h3
                                className="font-bold text-[rgb(var(--foreground))] text-base leading-snug"
                                style={{ fontFamily: "Oswald, sans-serif" }}
                              >
                                {r.name}
                              </h3>
                              <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{r.city}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#4285f4]/30 text-[#4285f4]">
                                Google
                              </span>
                              {r.open_now != null && (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border",
                                  r.open_now
                                    ? "border-green-500/30 text-green-400"
                                    : "border-red-500/30 text-red-400"
                                )}>
                                  {r.open_now ? "Otvoreno" : "Zatvoreno"}
                                </span>
                              )}
                            </div>
                          </div>

                          {r.address && (
                            <p className="text-xs text-[rgb(var(--muted))] mb-2">{r.address}</p>
                          )}

                          {r.types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {r.types.slice(0, 3).filter((t) => t !== "point_of_interest" && t !== "establishment").map((type) => (
                                <span
                                  key={type}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgb(var(--border)/0.4)] text-[rgb(var(--muted))]"
                                >
                                  {type.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgb(var(--border)/0.5)]">
                            {r.rating != null ? (
                              <p className="text-xs text-[rgb(var(--muted))]">
                                ⭐ <span className="text-[rgb(var(--foreground))] font-medium">{r.rating.toFixed(1)}</span>
                                <span className="text-[rgb(var(--muted))]">/5</span>
                              </p>
                            ) : (
                              <span />
                            )}

                            <div className="flex items-center gap-2">
                              {/* PROFIL — opens the Google Maps embed modal */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRestaurant({
                                    google_place_id: r.place_id,
                                    name:            r.name,
                                    city:            r.city,
                                    address:         r.address,
                                    lat:             r.latitude,
                                    lng:             r.longitude,
                                    rating:          r.rating,
                                    open_now:        r.open_now,
                                    types:           r.types,
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[#4285f4] hover:border-[#4285f4]/40 transition-all"
                                style={{ fontFamily: "Oswald, sans-serif" }}
                              >
                                🔍 PROFIL
                              </button>

                              <DirectionsButton
                                name={r.name}
                                address={r.address}
                                city={r.city}
                                lat={r.latitude}
                                lng={r.longitude}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {placesSearched && placeResults.length === 0 && !placesLoading && (
                  <div className="mt-6 rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
                    <p className="text-[rgb(var(--muted))] text-sm">
                      Google Places nije pronašao rezultate za &ldquo;{searchTerm}&rdquo;.
                      Provjeri naziv mjesta ili proširi pretragu.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Restaurant profile modal (single instance for the whole page) ── */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />

      {/* ── Ćevap-Rulet modal ──────────────────────────────────────────────── */}
      <CevapRuletModal
        isOpen={ruletOpen}
        onClose={() => setRuletOpen(false)}
        currentCity={selectedCity}
        searchTerm={searchTerm}
        userId={userId}
      />
    </div>
  );
}
