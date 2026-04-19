"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, MapPin, BedDouble, ExternalLink, CheckCircle,
  Navigation, Star, Clock, Globe, Phone, Heart, Bookmark, BookOpen,
} from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
import { StyleTagSection, type CevapStyle } from "@/components/finder/modal/StyleTagSection";
import { QuickLogModal } from "@/components/journal/QuickLogModal";
import { ReviewModal } from "@/components/finder/ReviewModal";
import { ReviewList } from "@/components/finder/ReviewList";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types";

// ── Shared type ────────────────────────────────────────────────────────────────
export interface ProfileTarget {
  id?:              string;
  google_place_id?: string;
  name:             string;
  city:             string;
  address?:         string | null;
  lat?:             number | null;
  lng?:             number | null;
  is_verified?:     boolean;
  rating?:          number | null;
  open_now?:        boolean | null;
  phone?:           string | null;
  website?:         string | null;
  types?:           string[];
}

interface Props {
  restaurant: ProfileTarget | null;
  onClose:    () => void;
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_FAV  = "chevapp:place_favorites";
const LS_WISH = "chevapp:place_wishlist";

function lsGet(key: string): string[]  { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } }
function lsHas(key: string, id: string) { return lsGet(key).includes(id); }
function lsToggle(key: string, id: string): boolean {
  const list = lsGet(key);
  const idx  = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); } else { list.push(id); }
  localStorage.setItem(key, JSON.stringify(list));
  return idx < 0;
}

// ── Haptic helper ─────────────────────────────────────────────────────────────
function haptic(style: "light" | "medium" = "light") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(style === "light" ? 10 : 30);
  }
}

// ── XP + community toast helper ───────────────────────────────────────────────
// createClient() cast to `any` is intentional: supabase-js v2.47 RPC overloads
// do not resolve correctly against our hand-written Database type.
async function awardCommunityXP(userId: string, setToast: (msg: string) => void) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient() as any).rpc("award_xp", { p_user_id: userId, p_points: 15 });
    window.dispatchEvent(new CustomEvent("chevapp:stats_updated", { detail: {} }));
  } catch { /* non-critical */ }
  setToast("Hvala! Pomogao si zajednici i zaradio 15 XP! 🌯");
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{
          width: "14px", height: "14px",
          fill:  i <= Math.round(rating) ? "#f59e0b" : "transparent",
          color: i <= Math.round(rating) ? "#f59e0b" : "rgb(var(--border))",
        }} />
      ))}
      <span style={{ marginLeft: "6px", fontSize: "14px", fontWeight: 700, color: "rgb(var(--foreground))" }}>
        {rating.toFixed(1)}
      </span>
      <span style={{ fontSize: "12px", color: "rgb(var(--muted))", marginLeft: "2px" }}>/5</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function RestaurantDetailModal({ restaurant, onClose }: Props) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [mounted,           setMounted]           = useState(false);
  const [userId,            setUserId]            = useState<string | null>(null);

  // Favorites / wishlist
  const [isFav,        setIsFav]        = useState(false);
  const [isWish,       setIsWish]       = useState(false);
  const [favLoading,   setFavLoading]   = useState(false);
  const [wishLoading,  setWishLoading]  = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [reviewRefresh,setReviewRefresh]= useState(0);

  // Crowdsourced style tag
  const [dbStyleTag,     setDbStyleTag]     = useState<CevapStyle | null>(null);
  const [dbRestaurantId, setDbRestaurantId] = useState<string | null>(null);
  const [tagLoading,     setTagLoading]     = useState(false);
  const [toast,          setToast]          = useState<string | null>(null);
  const [dataLoading,    setDataLoading]    = useState(false);
  const swipeTouchY = useRef<number | null>(null);

  // Live Place Details (fetched from /api/place-details when google_place_id present)
  const [liveRating,  setLiveRating]  = useState<number  | null | undefined>(undefined); // undefined = not yet fetched
  const [liveOpenNow, setLiveOpenNow] = useState<boolean | null | undefined>(undefined);
  const [livePhone,   setLivePhone]   = useState<string  | null>(null);
  const [liveWebsite, setLiveWebsite] = useState<string  | null>(null);
  const [liveTypes,   setLiveTypes]   = useState<string[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auth
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => setUserId(user?.id ?? null));
  }, []);

  // Fetch fresh Place Details (rating, open_now, phone, website) for Google Places
  useEffect(() => {
    setLiveRating(undefined);
    setLiveOpenNow(undefined);
    setLivePhone(null);
    setLiveWebsite(null);
    setLiveTypes(null);

    const placeId = restaurant?.google_place_id;
    if (!placeId) return;

    setDetailsLoading(true);
    fetch(`/api/place-details?place_id=${encodeURIComponent(placeId)}`)
      .then((r) => r.json())
      .then((d: { rating?: number | null; open_now?: boolean | null; phone?: string | null; website?: string | null; types?: string[] }) => {
        setLiveRating(d.rating  ?? null);
        setLiveOpenNow(d.open_now ?? null);
        setLivePhone(d.phone    ?? null);
        setLiveWebsite(d.website ?? null);
        setLiveTypes(d.types    ?? []);
      })
      .catch(() => {
        setLiveRating(null);
        setLiveOpenNow(null);
      })
      .finally(() => setDetailsLoading(false));
  }, [restaurant?.google_place_id]);

  // Reset state & load data on restaurant change
  useEffect(() => {
    setIsFav(false);
    setIsWish(false);
    setDbStyleTag(null);
    setDbRestaurantId(null);
    setToast(null);
    if (!restaurant) return;

    const localKey = restaurant.id ?? `${restaurant.name}::${restaurant.city}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    setDataLoading(true);

    const fetches: Promise<void>[] = [];

    // Favorites / wishlist
    if (restaurant.id) {
      fetches.push(
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
          if (!user || !restaurant.id) return;
          const uid = user.id;
          const rid = restaurant.id!;
          return Promise.all([
            supabase.from("user_favorites").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
              .then(({ data }: { data: unknown }) => setIsFav(!!data)),
            supabase.from("user_wishlist").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
              .then(({ data }: { data: unknown }) => setIsWish(!!data)),
          ]).then(() => undefined);
        })
      );
    } else {
      setIsFav(lsHas(LS_FAV,  localKey));
      setIsWish(lsHas(LS_WISH, localKey));
    }

    // Existing style tag — Google Places restaurant
    if (restaurant.google_place_id) {
      fetches.push(
        Promise.resolve(
          supabase
            .from("restaurants")
            .select("id, style")
            .eq("google_place_id", restaurant.google_place_id)
            .maybeSingle()
            .then(({ data }: { data: { id: string; style: string | null } | null }) => {
              if (data) {
                setDbRestaurantId(data.id);
                setDbStyleTag((data.style as CevapStyle) ?? null);
              }
            })
        )
      );
    }

    // Existing style tag — DB restaurant
    if (restaurant.id) {
      fetches.push(
        Promise.resolve(
          supabase
            .from("restaurants")
            .select("style")
            .eq("id", restaurant.id)
            .maybeSingle()
            .then(({ data }: { data: { style: string | null } | null }) => {
              if (data) setDbStyleTag((data.style as CevapStyle) ?? null);
            })
        )
      );
    }

    Promise.allSettled(fetches).finally(() => setDataLoading(false));
  }, [restaurant?.id, restaurant?.name, restaurant?.city, restaurant?.google_place_id]);

  // Body scroll lock
  useEffect(() => {
    if (!restaurant) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [restaurant]);

  // Escape key
  useEffect(() => {
    if (!restaurant) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [restaurant, onClose]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!restaurant || !mounted) return null;

  const localKey = restaurant.id ?? `${restaurant.name}::${restaurant.city}`;

  // ── Toggle favorites ────────────────────────────────────────────────────────
  const toggleFav = async () => {
    if (favLoading) return;
    haptic("light");
    setFavLoading(true);
    try {
      if (restaurant.id && userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        if (isFav) {
          await supabase.from("user_favorites").delete().eq("user_id", userId).eq("restaurant_id", restaurant.id);
        } else {
          await supabase.from("user_favorites").insert({ user_id: userId, restaurant_id: restaurant.id });
        }
        setIsFav((v) => !v);
      } else {
        setIsFav(lsToggle(LS_FAV, localKey));
      }
    } catch (err) {
      console.error("[toggleFav]", err);
    } finally {
      setFavLoading(false);
    }
  };

  // ── Toggle wishlist ─────────────────────────────────────────────────────────
  const toggleWish = async () => {
    if (wishLoading) return;
    haptic("light");
    setWishLoading(true);
    try {
      if (restaurant.id && userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        if (isWish) {
          await supabase.from("user_wishlist").delete().eq("user_id", userId).eq("restaurant_id", restaurant.id);
        } else {
          await supabase.from("user_wishlist").insert({ user_id: userId, restaurant_id: restaurant.id });
        }
        setIsWish((v) => !v);
      } else {
        setIsWish(lsToggle(LS_WISH, localKey));
      }
    } catch (err) {
      console.error("[toggleWish]", err);
    } finally {
      setWishLoading(false);
    }
  };

  // ── Tag a style (crowdsourced upsert) ───────────────────────────────────────
  const handleTagStyle = async (style: CevapStyle) => {
    if (!userId || tagLoading) return;
    haptic("medium");
    setTagLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      // Toggling the same tag off
      if (dbStyleTag === style) {
        const targetId = dbRestaurantId ?? restaurant.id;
        if (targetId) {
          const { error } = await supabase.from("restaurants").update({ style: null }).eq("id", targetId);
          if (error) throw error;
          setDbStyleTag(null);
          setToast("Stil uklonjen ✓");
        }
        return;
      }

      // ── Case A: existing DB restaurant ───────────────────────────────────
      if (restaurant.id) {
        const hadNoStyle = !dbStyleTag;
        const { error } = await supabase.from("restaurants").update({ style }).eq("id", restaurant.id);
        if (error) throw error;
        setDbStyleTag(style);
        if (hadNoStyle) {
          await awardCommunityXP(userId, setToast);
        } else {
          setToast(`Stil ažuriran: ${style} ✓`);
        }
        return;
      }

      // ── Case B: Google Places restaurant ─────────────────────────────────
      const placeId = restaurant.google_place_id;
      if (!placeId) return;

      const { data: existing } = await supabase
        .from("restaurants")
        .select("id, style")
        .eq("google_place_id", placeId)
        .maybeSingle() as { data: { id: string; style: string | null } | null };

      if (existing) {
        const hadNoStyle = !existing.style;
        const { error } = await supabase.from("restaurants").update({ style }).eq("id", existing.id);
        if (error) throw error;
        setDbRestaurantId(existing.id);
        setDbStyleTag(style);
        if (hadNoStyle) {
          await awardCommunityXP(userId, setToast);
        } else {
          setToast(`Stil ažuriran: ${style} ✓`);
        }
      } else {
        // Insert community-contributed restaurant
        const { data: newRow, error } = await supabase
          .from("restaurants")
          .insert({
            name:            restaurant.name,
            city:            restaurant.city,
            address:         restaurant.address || "",
            google_place_id: placeId,
            style,
            is_verified:     false,
            latitude:        restaurant.lat  ?? null,
            longitude:       restaurant.lng  ?? null,
            lepinja_rating:  0,
            tags:            [],
          })
          .select("id")
          .single();
        if (error) throw error;

        // Update state regardless of newRow (RLS timing can make it null on success)
        if (newRow) setDbRestaurantId((newRow as { id: string }).id);
        setDbStyleTag(style);
        await awardCommunityXP(userId, setToast);
        window.dispatchEvent(new CustomEvent("chevapp:restaurant_tagged", {
          detail: { google_place_id: placeId, style, name: restaurant.name, city: restaurant.city },
        }));
      }
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? String(err);
      console.error("[handleTagStyle] failed:", err);
      setToast(`Greška: ${detail.slice(0, 80)}`);
    } finally {
      setTagLoading(false);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;

  // Merge live Place Details with props (live wins when available)
  const displayRating  = liveRating  !== undefined ? liveRating  : (restaurant.rating  ?? null);
  const displayOpenNow = liveOpenNow !== undefined ? liveOpenNow : (restaurant.open_now ?? null);
  const displayPhone   = livePhone   ?? restaurant.phone   ?? null;
  const displayWebsite = liveWebsite ?? restaurant.website ?? null;
  const rawTypes       = liveTypes   ?? restaurant.types   ?? [];
  const cleanTypes     = rawTypes
    .filter((t) => !["point_of_interest", "establishment", "food"].includes(t))
    .map((t) => t.replace(/_/g, " "))
    .slice(0, 3);

  const canTag = !!userId && (!!restaurant.google_place_id || !!restaurant.id);

  const modal = (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.75)" }} onClick={onClose} />

      {/* Panel */}
      <div
        className={[
          "fixed flex flex-col overflow-hidden",
          "inset-x-0 bottom-0 rounded-t-3xl max-h-[92dvh]",
          "animate-slide-up",
          "sm:inset-auto sm:bottom-auto sm:animate-fade-in",
          "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-[520px] sm:rounded-2xl sm:max-h-[85vh]",
        ].join(" ")}
        style={{ zIndex: 9999, background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — swipe down to close */}
        <div
          className="flex sm:hidden justify-center pt-3 pb-1 flex-shrink-0 cursor-grab"
          onTouchStart={(e) => { swipeTouchY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            if (swipeTouchY.current === null) return;
            const delta = e.changedTouches[0].clientY - swipeTouchY.current;
            swipeTouchY.current = null;
            if (delta > 80) onClose();
          }}
        >
          <div style={{ width: "40px", height: "4px", borderRadius: "9999px", background: "rgb(var(--border))" }} />
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", top: "12px", left: "50%", transform: "translateX(-50%)",
            zIndex: 10001,
            background: toast.startsWith("Greška") ? "rgb(239,68,68)" : "rgb(34,197,94)",
            color: "#fff",
            padding: "10px 18px", borderRadius: "99px", fontSize: "13px", fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: toast.startsWith("Greška") ? "0 4px 20px rgba(239,68,68,0.4)" : "0 4px 20px rgba(34,197,94,0.4)",
            animation: "fade-in 0.3s ease",
          }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgb(var(--border))", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: "20px", fontWeight: 700, color: "rgb(var(--foreground))", lineHeight: 1.2, margin: 0 }}>
                {restaurant.name}
              </h2>
              {restaurant.is_verified && <CheckCircle style={{ width: "16px", height: "16px", color: "#D35400", flexShrink: 0 }} />}
              {detailsLoading ? (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", background: "rgb(var(--border))", color: "rgb(var(--muted))", border: "1px solid rgb(var(--border))", animation: "pulse 1.5s infinite" }}>
                  …
                </span>
              ) : displayOpenNow != null ? (
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                  background: displayOpenNow ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color:      displayOpenNow ? "#22c55e" : "#ef4444",
                  border:     `1px solid ${displayOpenNow ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  {displayOpenNow ? "Otvoreno" : "Zatvoreno"}
                </span>
              ) : null}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <MapPin style={{ width: "12px", height: "12px", color: "rgb(var(--muted))", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "rgb(var(--muted))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {restaurant.city}{restaurant.address ? ` · ${restaurant.address}` : ""}
              </span>
            </div>

            {/* Fav / Wish buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button
                onClick={toggleFav}
                disabled={favLoading || dataLoading}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isFav ? "#ef4444" : "rgb(var(--border))"}`,
                  background: isFav ? "rgba(239,68,68,0.1)" : "transparent",
                  color: isFav ? "#ef4444" : "rgb(var(--muted))",
                  cursor: (favLoading || dataLoading) ? "not-allowed" : "pointer",
                  opacity: (favLoading || dataLoading) ? 0.5 : 1, transition: "all 0.15s",
                }}
              >
                <Heart style={{ width: "13px", height: "13px", fill: isFav ? "#ef4444" : "transparent", flexShrink: 0 }} />
                {isFav ? "Favorit ✓" : "Favoriti"}
              </button>

              <button
                onClick={toggleWish}
                disabled={wishLoading || dataLoading}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isWish ? "#D35400" : "rgb(var(--border))"}`,
                  background: isWish ? "rgba(211,84,0,0.1)" : "transparent",
                  color: isWish ? "#D35400" : "rgb(var(--muted))",
                  cursor: (wishLoading || dataLoading) ? "not-allowed" : "pointer",
                  opacity: (wishLoading || dataLoading) ? 0.5 : 1, transition: "all 0.15s",
                }}
              >
                <Bookmark style={{ width: "13px", height: "13px", fill: isWish ? "#D35400" : "transparent", flexShrink: 0 }} />
                {isWish ? "Na listi ✓" : "Želim ići"}
              </button>

              <button
                onClick={() => setQuickLogOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: "1px solid rgba(var(--primary), 0.4)",
                  background: "rgba(var(--primary), 0.08)",
                  color: "rgb(var(--primary))",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <BookOpen style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                Dodaj u dnevnik
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Zatvori"
            style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Hero info card */}
            <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "14px", background: "rgba(211,84,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>
                🍖
              </div>
              <div style={{ flex: 1 }}>
                {/* Rating row */}
                {detailsLoading ? (
                  <div style={{ display: "flex", gap: "4px", marginBottom: "10px", alignItems: "center" }}>
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgb(var(--border))", opacity: 0.5 }} />
                    ))}
                    <div style={{ width: "28px", height: "14px", borderRadius: "3px", background: "rgb(var(--border))", marginLeft: "6px", opacity: 0.5 }} />
                  </div>
                ) : displayRating != null ? (
                  <div style={{ marginBottom: "10px" }}><StarRating rating={displayRating} /></div>
                ) : null}

                {/* Type chips */}
                {cleanTypes.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {cleanTypes.map((t) => (
                      <span key={t} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "9999px", background: "rgb(var(--border))", color: "rgb(var(--muted))", textTransform: "capitalize" }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Fallback only if all data is confirmed missing (not still loading) */}
                {!detailsLoading && displayRating == null && cleanTypes.length === 0 && (
                  <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: 0 }}>Više informacija dostupno na Google Maps.</p>
                )}
              </div>
            </div>

            {/* Style Tag Section */}
            <StyleTagSection
              dbStyleTag={dbStyleTag}
              dataLoading={dataLoading}
              canTag={canTag}
              tagLoading={tagLoading}
              userId={userId}
              onTagStyle={handleTagStyle}
            />

            {/* Info rows */}
            <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", overflow: "hidden" }}>
              {restaurant.address && (
                <InfoRow icon={<MapPin style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  {restaurant.address}, {restaurant.city}
                </InfoRow>
              )}
              {detailsLoading ? (
                <InfoRow icon={<Clock style={{ width: "15px", height: "15px", color: "rgb(var(--muted))" }} />}>
                  <span style={{ color: "rgb(var(--muted))", fontSize: "12px" }}>Provjera radnog vremena…</span>
                </InfoRow>
              ) : displayOpenNow != null ? (
                <InfoRow icon={<Clock style={{ width: "15px", height: "15px", color: displayOpenNow ? "#22c55e" : "#ef4444" }} />}>
                  <span style={{ color: displayOpenNow ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {displayOpenNow ? "Trenutno otvoreno" : "Trenutno zatvoreno"}
                  </span>
                </InfoRow>
              ) : null}
              {displayPhone && (
                <InfoRow icon={<Phone style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a href={`tel:${displayPhone}`} style={{ color: "rgb(var(--foreground))", textDecoration: "none" }}>{displayPhone}</a>
                </InfoRow>
              )}
              {displayWebsite && (
                <InfoRow icon={<Globe style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a href={displayWebsite.startsWith("http") ? displayWebsite : `https://${displayWebsite}`} target="_blank" rel="noopener noreferrer" style={{ color: "#4285f4", textDecoration: "none" }}>
                    {displayWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </InfoRow>
              )}
              <InfoRow icon={<Navigation style={{ width: "15px", height: "15px", color: "#4285f4" }} />}>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4285f4", textDecoration: "none" }}>
                  Pogledaj na Google Maps →
                </a>
              </InfoRow>
            </div>

            {/* Accommodation CTA */}
            {/* ── Reviews section ─────────────────────────────────────────── */}
            {(restaurant.google_place_id || restaurant.id) && (
              <div style={{ borderRadius: "16px", border: "1px solid rgb(var(--border))", background: "rgb(var(--surface) / 0.4)", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Star style={{ width: "16px", height: "16px", color: "#f59e0b", fill: "#f59e0b" }} />
                    <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgb(var(--foreground))", margin: 0 }}>
                      Recenzije zajednice
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "10px", border: "1px solid rgba(245,158,11,0.4)", background: "transparent", color: "#d97706", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                  >
                    <Star style={{ width: "12px", height: "12px" }} />
                    OSTAVI RECENZIJU
                  </button>
                </div>
                <ReviewList
                  placeId={restaurant.google_place_id ?? restaurant.id ?? ""}
                  refreshKey={reviewRefresh}
                />
              </div>
            )}

            <div style={{ borderRadius: "16px", border: "1px solid rgba(211,84,0,0.25)", background: "rgba(211,84,0,0.06)", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(211,84,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BedDouble style={{ width: "20px", height: "20px", color: "#D35400" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "16px", color: "rgb(var(--foreground))", margin: "0 0 4px" }}>PLANIRAŠ POSJET?</p>
                  <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: "0 0 16px", lineHeight: 1.5 }}>
                    Pronađi smještaj u <span style={{ color: "#D35400", fontWeight: 600 }}>{restaurant.city}</span> i pretvori ručak u pravi gastro-odmor.
                  </p>
                  <button
                    onClick={() => setAccommodationOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", background: "#D35400", color: "#fff", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer" }}
                  >
                    <ExternalLink style={{ width: "16px", height: "16px" }} />
                    PRETRAŽI SMJEŠTAJ
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height: "8px" }} />
          </div>
        </div>
      </div>

      <AccommodationModal
        isOpen={accommodationOpen}
        onClose={() => setAccommodationOpen(false)}
        restaurantName={restaurant.name}
        city={restaurant.city ?? ""}
      />

      {quickLogOpen && (
        <QuickLogModal
          restaurant={{
            id:              restaurant.id ?? "",
            name:            restaurant.name,
            city:            restaurant.city,
            address:         restaurant.address ?? "",
            latitude:        restaurant.lat ?? null,
            longitude:       restaurant.lng ?? null,
            style:           (dbStyleTag ?? "Ostalo") as Restaurant["style"],
            lepinja_rating:  0,
            tags:            [],
            is_verified:     restaurant.is_verified ?? false,
            google_place_id: restaurant.google_place_id ?? null,
          }}
          onClose={() => setQuickLogOpen(false)}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          placeId={restaurant.google_place_id ?? restaurant.id ?? ""}
          placeName={restaurant.name}
          onClose={() => setReviewOpen(false)}
          onSubmitted={() => setReviewRefresh((n) => n + 1)}
        />
      )}
    </>
  );

  return createPortal(modal, document.body);
}

// ── InfoRow ────────────────────────────────────────────────────────────────────
function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderBottom: "1px solid rgb(var(--border))", fontSize: "13px", color: "rgb(var(--foreground))" }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
