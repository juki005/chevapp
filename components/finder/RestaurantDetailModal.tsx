"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, MapPin, BedDouble, ExternalLink, CheckCircle,
  Navigation, Star, Clock, Globe, Phone, Heart, Bookmark, Tag,
} from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
import { createClient } from "@/lib/supabase/client";

// ── Shared type ────────────────────────────────────────────────────────────────
export interface ProfileTarget {
  id?:              string;       // DB restaurant UUID — only for verified DB cards
  google_place_id?: string;       // Google Places place_id — for crowdsourced upsert
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

// ── Cevap style options ────────────────────────────────────────────────────────
const CEVAP_STYLES = ["Sarajevski", "Banjalučki", "Travnički", "Leskovački", "Ostalo"] as const;
type CevapStyle = typeof CEVAP_STYLES[number];

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_FAV  = "chevapp:place_favorites";
const LS_WISH = "chevapp:place_wishlist";

function lsGet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function lsHas(key: string, id: string)   { return lsGet(key).includes(id); }
function lsToggle(key: string, id: string): boolean {
  const list = lsGet(key);
  const idx  = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); } else { list.push(id); }
  localStorage.setItem(key, JSON.stringify(list));
  return idx < 0; // true = added
}

// ── XP helper ─────────────────────────────────────────────────────────────────
async function awardXP(userId: string, amount: number) {
  const supabase = createClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("xp_points")
    .eq("id", userId)
    .single();
  const current = (prof as { xp_points: number } | null)?.xp_points ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any)
    .update({ xp_points: current + amount })
    .eq("id", userId);
  window.dispatchEvent(new CustomEvent("chevapp:stats_updated", { detail: {} }));
}

// ── Star rating display ────────────────────────────────────────────────────────
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
  const [isFav,       setIsFav]       = useState(false);
  const [isWish,      setIsWish]      = useState(false);
  const [favLoading,  setFavLoading]  = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  // Crowdsourced style tag
  const [dbStyleTag,      setDbStyleTag]      = useState<CevapStyle | null>(null);
  const [dbRestaurantId,  setDbRestaurantId]  = useState<string | null>(null);
  const [tagLoading,      setTagLoading]      = useState(false);
  const [toast,           setToast]           = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  // ── Reset state & load on restaurant change ───────────────────────────────
  useEffect(() => {
    setIsFav(false);
    setIsWish(false);
    setDbStyleTag(null);
    setDbRestaurantId(null);
    setToast(null);
    if (!restaurant) return;

    const localKey = restaurant.id ?? `${restaurant.name}::${restaurant.city}`;
    const supabase = createClient();

    // Favorites / wishlist
    if (restaurant.id) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user || !restaurant.id) return;
        const uid = user.id;
        const rid = restaurant.id!;
        supabase.from("user_favorites").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
          .then(({ data }) => setIsFav(!!data));
        supabase.from("user_wishlist").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
          .then(({ data }) => setIsWish(!!data));
      });
    } else {
      setIsFav(lsHas(LS_FAV,  localKey));
      setIsWish(lsHas(LS_WISH, localKey));
    }

    // Load existing style tag if this is a Google Places restaurant
    if (restaurant.google_place_id) {
      supabase
        .from("restaurants")
        .select("id, style")
        .eq("google_place_id", restaurant.google_place_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const row = data as { id: string; style: string | null };
            setDbRestaurantId(row.id);
            setDbStyleTag((row.style as CevapStyle) ?? null);
          }
        });
    }

    // Load style tag for existing DB restaurants
    if (restaurant.id) {
      supabase
        .from("restaurants")
        .select("style")
        .eq("id", restaurant.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setDbStyleTag(((data as { style: string | null }).style as CevapStyle) ?? null);
        });
    }
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

  // ── Toggle favorites ───────────────────────────────────────────────────────
  const toggleFav = async () => {
    if (favLoading) return;
    setFavLoading(true);
    if (restaurant.id && userId) {
      const supabase = createClient();
      if (isFav) {
        await supabase.from("user_favorites").delete().eq("user_id", userId).eq("restaurant_id", restaurant.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("user_favorites") as any).insert({ user_id: userId, restaurant_id: restaurant.id });
      }
      setIsFav((v) => !v);
    } else {
      setIsFav(lsToggle(LS_FAV, localKey));
    }
    setFavLoading(false);
  };

  // ── Toggle wishlist ────────────────────────────────────────────────────────
  const toggleWish = async () => {
    if (wishLoading) return;
    setWishLoading(true);
    if (restaurant.id && userId) {
      const supabase = createClient();
      if (isWish) {
        await supabase.from("user_wishlist").delete().eq("user_id", userId).eq("restaurant_id", restaurant.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("user_wishlist") as any).insert({ user_id: userId, restaurant_id: restaurant.id });
      }
      setIsWish((v) => !v);
    } else {
      setIsWish(lsToggle(LS_WISH, localKey));
    }
    setWishLoading(false);
  };

  // ── Tag a style (crowdsourced upsert) ─────────────────────────────────────
  const handleTagStyle = async (style: CevapStyle) => {
    if (!userId || tagLoading) return;

    // Toggling the same tag off
    if (dbStyleTag === style) {
      setTagLoading(true);
      const supabase = createClient();
      const targetId = dbRestaurantId ?? restaurant.id;
      if (targetId) {
        await supabase.from("restaurants").update({ style: null }).eq("id", targetId);
        setDbStyleTag(null);
      }
      setTagLoading(false);
      return;
    }

    setTagLoading(true);
    const supabase = createClient();

    // ── Case A: existing DB restaurant (has id) ────────────────────────────
    if (restaurant.id) {
      const hadNoStyle = !dbStyleTag;
      await supabase.from("restaurants").update({ style }).eq("id", restaurant.id);
      setDbStyleTag(style);
      if (hadNoStyle) {
        await awardXP(userId, 15);
        setToast("Hvala! Pomogao si zajednici i zaradio 15 XP! 🌯");
      }
      setTagLoading(false);
      return;
    }

    // ── Case B: Google Places restaurant ──────────────────────────────────
    const placeId = restaurant.google_place_id;
    if (!placeId) { setTagLoading(false); return; }

    const { data: existing } = await supabase
      .from("restaurants")
      .select("id, style")
      .eq("google_place_id", placeId)
      .maybeSingle();

    if (existing) {
      // Row exists — update style
      const row      = existing as { id: string; style: string | null };
      const hadNoStyle = !row.style;
      await supabase.from("restaurants").update({ style }).eq("id", row.id);
      setDbRestaurantId(row.id);
      setDbStyleTag(style);
      if (hadNoStyle) {
        await awardXP(userId, 15);
        setToast("Hvala! Pomogao si zajednici i zaradio 15 XP! 🌯");
      }
    } else {
      // New row — insert community-contributed restaurant
      const { data: newRow } = await supabase
        .from("restaurants")
        .insert({
          name:             restaurant.name,
          city:             restaurant.city,
          address:          restaurant.address ?? null,
          google_place_id:  placeId,
          style,
          is_verified:      false,
          lat:              restaurant.lat  ?? null,
          lng:              restaurant.lng  ?? null,
        })
        .select("id")
        .single();

      if (newRow) {
        setDbRestaurantId((newRow as { id: string }).id);
        setDbStyleTag(style);
        await awardXP(userId, 15);
        setToast("Hvala! Pomogao si zajednici i zaradio 15 XP! 🌯");

        // Broadcast so finder can refresh its DB list
        window.dispatchEvent(new CustomEvent("chevapp:restaurant_tagged", {
          detail: { google_place_id: placeId, style, name: restaurant.name, city: restaurant.city },
        }));
      }
    }

    setTagLoading(false);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;
  const cleanTypes = (restaurant.types ?? [])
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
          "sm:inset-auto sm:bottom-auto",
          "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-[520px] sm:rounded-2xl sm:max-h-[85vh]",
        ].join(" ")}
        style={{ zIndex: 9999, background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex sm:hidden justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: "40px", height: "4px", borderRadius: "9999px", background: "rgb(var(--border))" }} />
        </div>

        {/* ── Toast ────────────────────────────────────────────────────────── */}
        {toast && (
          <div
            style={{
              position: "absolute", top: "12px", left: "50%", transform: "translateX(-50%)",
              zIndex: 10001, background: "rgb(34,197,94)", color: "#fff",
              padding: "10px 18px", borderRadius: "99px", fontSize: "13px", fontWeight: 600,
              whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
              animation: "fade-in 0.3s ease",
            }}
          >
            {toast}
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgb(var(--border))", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "Oswald, sans-serif", fontSize: "20px", fontWeight: 700, color: "rgb(var(--foreground))", lineHeight: 1.2, margin: 0 }}>
                {restaurant.name}
              </h2>
              {restaurant.is_verified && <CheckCircle style={{ width: "16px", height: "16px", color: "#D35400", flexShrink: 0 }} />}
              {restaurant.open_now != null && (
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                  background: restaurant.open_now ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color:      restaurant.open_now ? "#22c55e" : "#ef4444",
                  border:     `1px solid ${restaurant.open_now ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  {restaurant.open_now ? "Otvoreno" : "Zatvoreno"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <MapPin style={{ width: "12px", height: "12px", color: "rgb(var(--muted))", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "rgb(var(--muted))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {restaurant.city}{restaurant.address ? ` · ${restaurant.address}` : ""}
              </span>
            </div>

            {/* Fav / Wish buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button onClick={toggleFav} disabled={favLoading}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isFav ? "#ef4444" : "rgb(var(--border))"}`,
                  background: isFav ? "rgba(239,68,68,0.1)" : "transparent",
                  color: isFav ? "#ef4444" : "rgb(var(--muted))",
                  cursor: "pointer", opacity: favLoading ? 0.6 : 1, transition: "all 0.15s",
                }}>
                <Heart style={{ width: "13px", height: "13px", fill: isFav ? "#ef4444" : "transparent", flexShrink: 0 }} />
                {isFav ? "Favorit ✓" : "Favoriti"}
              </button>

              <button onClick={toggleWish} disabled={wishLoading}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isWish ? "#D35400" : "rgb(var(--border))"}`,
                  background: isWish ? "rgba(211,84,0,0.1)" : "transparent",
                  color: isWish ? "#D35400" : "rgb(var(--muted))",
                  cursor: "pointer", opacity: wishLoading ? 0.6 : 1, transition: "all 0.15s",
                }}>
                <Bookmark style={{ width: "13px", height: "13px", fill: isWish ? "#D35400" : "transparent", flexShrink: 0 }} />
                {isWish ? "Na listi ✓" : "Želim ići"}
              </button>
            </div>
          </div>

          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Hero info card */}
            <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "14px", background: "rgba(211,84,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", flexShrink: 0 }}>
                🍖
              </div>
              <div style={{ flex: 1 }}>
                {restaurant.rating != null && <div style={{ marginBottom: "10px" }}><StarRating rating={restaurant.rating} /></div>}
                {cleanTypes.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {cleanTypes.map((t) => (
                      <span key={t} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "9999px", background: "rgb(var(--border))", color: "rgb(var(--muted))", textTransform: "capitalize" }}>{t}</span>
                    ))}
                  </div>
                )}
                {restaurant.rating == null && cleanTypes.length === 0 && (
                  <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: 0 }}>Više informacija dostupno na Google Maps.</p>
                )}
              </div>
            </div>

            {/* ── Style Tag Chips ─────────────────────────────────────────── */}
            <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Tag style={{ width: "14px", height: "14px", color: "rgb(var(--primary))", flexShrink: 0 }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgb(var(--foreground))", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Oswald, sans-serif" }}>
                  Stil Ćevapa
                </span>
                {dbStyleTag && (
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "9999px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", fontWeight: 600 }}>
                    ✓ Tagged
                  </span>
                )}
              </div>

              {canTag ? (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CEVAP_STYLES.map((style) => {
                    const isActive = dbStyleTag === style;
                    return (
                      <button
                        key={style}
                        onClick={() => handleTagStyle(style)}
                        disabled={tagLoading}
                        style={{
                          padding: "7px 14px",
                          borderRadius: "9999px",
                          fontSize: "13px",
                          fontWeight: 600,
                          border: `1.5px solid ${isActive ? "rgb(var(--primary))" : "rgb(var(--border))"}`,
                          background: isActive ? "rgb(var(--primary) / 0.12)" : "transparent",
                          color: isActive ? "rgb(var(--primary))" : "rgb(var(--muted))",
                          cursor: tagLoading ? "not-allowed" : "pointer",
                          opacity: tagLoading ? 0.6 : 1,
                          transition: "all 0.15s",
                          transform: isActive ? "scale(1.04)" : "scale(1)",
                        }}
                      >
                        {isActive ? `✓ ${style}` : style}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "rgb(var(--muted))", margin: 0 }}>
                  {userId
                    ? "Ovaj restoran nije dostupan za tagovanje."
                    : "Prijavi se da tagovaš stil i pomogneš zajednici. +15 XP 🎁"}
                </p>
              )}

              {!userId && (
                <p style={{ fontSize: "11px", color: "rgb(var(--muted))", marginTop: "8px", opacity: 0.7 }}>
                  💡 Svaki novi tag donosi <span style={{ color: "rgb(var(--primary))", fontWeight: 600 }}>+15 XP</span>
                </p>
              )}
            </div>

            {/* Info rows */}
            <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", overflow: "hidden" }}>
              {restaurant.address && (
                <InfoRow icon={<MapPin style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  {restaurant.address}, {restaurant.city}
                </InfoRow>
              )}
              {restaurant.open_now != null && (
                <InfoRow icon={<Clock style={{ width: "15px", height: "15px", color: restaurant.open_now ? "#22c55e" : "#ef4444" }} />}>
                  <span style={{ color: restaurant.open_now ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {restaurant.open_now ? "Trenutno otvoreno" : "Trenutno zatvoreno"}
                  </span>
                </InfoRow>
              )}
              {restaurant.phone && (
                <InfoRow icon={<Phone style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a href={`tel:${restaurant.phone}`} style={{ color: "rgb(var(--foreground))", textDecoration: "none" }}>{restaurant.phone}</a>
                </InfoRow>
              )}
              {restaurant.website && (
                <InfoRow icon={<Globe style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a href={restaurant.website.startsWith("http") ? restaurant.website : `https://${restaurant.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#4285f4", textDecoration: "none" }}>
                    {restaurant.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
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
                  <button onClick={() => setAccommodationOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "12px", background: "#D35400", color: "#fff", fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer" }}>
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

      <AccommodationModal isOpen={accommodationOpen} onClose={() => setAccommodationOpen(false)} restaurantName={restaurant.name} city={restaurant.city ?? ""} />
    </>
  );

  return createPortal(modal, document.body);
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderBottom: "1px solid rgb(var(--border))", fontSize: "13px", color: "rgb(var(--foreground))" }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
