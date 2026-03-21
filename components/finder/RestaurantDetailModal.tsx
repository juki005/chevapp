"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, MapPin, BedDouble, ExternalLink, CheckCircle,
  Navigation, Star, Clock, Globe, Phone, Heart, Bookmark, Sparkles,
} from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
import { createClient } from "@/lib/supabase/client";

// ── Shared type ───────────────────────────────────────────────────────────────
export interface ProfileTarget {
  id?:          string;       // DB restaurant UUID — only for verified DB cards
  name:         string;
  city:         string;
  address?:     string | null;
  is_verified?: boolean;
  rating?:      number | null;
  open_now?:    boolean | null;
  phone?:       string | null;
  website?:     string | null;
  types?:       string[];
}

interface Props {
  restaurant: ProfileTarget | null;
  onClose:    () => void;
}

// ── localStorage helpers (for Google Places results without a DB id) ───────────
const LS_FAV  = "chevapp:place_favorites";
const LS_WISH = "chevapp:place_wishlist";

function lsGet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function lsHas(key: string, id: string) { return lsGet(key).includes(id); }
function lsToggle(key: string, id: string): boolean {
  const list = lsGet(key);
  const idx  = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); } else { list.push(id); }
  localStorage.setItem(key, JSON.stringify(list));
  return idx < 0; // true = added
}

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

export function RestaurantDetailModal({ restaurant, onClose }: Props) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [mounted,           setMounted]           = useState(false);
  const [userId,            setUserId]            = useState<string | null>(null);
  const [isFav,             setIsFav]             = useState(false);
  const [isWish,            setIsWish]            = useState(false);
  const [favLoading,        setFavLoading]        = useState(false);
  const [wishLoading,       setWishLoading]       = useState(false);
  const [showPrompt,        setShowPrompt]        = useState(false);
  const [copied,            setCopied]            = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Load initial fav/wish state whenever restaurant changes ──────────────
  useEffect(() => {
    setIsFav(false);
    setIsWish(false);
    setShowPrompt(false);
    if (!restaurant) return;

    // Unique key: DB id if available, otherwise name::city
    const localKey = restaurant.id ?? `${restaurant.name}::${restaurant.city}`;

    if (restaurant.id) {
      // DB restaurant — check Supabase
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUserId(user?.id ?? null);
        if (!user || !restaurant.id) return;
        const rid = restaurant.id;
        const uid = user.id;
        supabase.from("user_favorites").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
          .then(({ data }) => setIsFav(!!data));
        supabase.from("user_wishlist").select("id").eq("user_id", uid).eq("restaurant_id", rid).maybeSingle()
          .then(({ data }) => setIsWish(!!data));
      });
    } else {
      // Google Places — check localStorage
      setIsFav(lsHas(LS_FAV,  localKey));
      setIsWish(lsHas(LS_WISH, localKey));
    }
  }, [restaurant?.id, restaurant?.name, restaurant?.city]);

  // Lock body scroll
  useEffect(() => {
    if (!restaurant) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [restaurant]);

  // Close on Escape
  useEffect(() => {
    if (!restaurant) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [restaurant, onClose]);

  if (!restaurant || !mounted) return null;

  const localKey = restaurant.id ?? `${restaurant.name}::${restaurant.city}`;

  // ── Toggle favorites ──────────────────────────────────────────────────────
  const toggleFav = async () => {
    if (favLoading) return;
    setFavLoading(true);
    if (restaurant.id && userId) {
      // Supabase
      const supabase = createClient();
      if (isFav) {
        await supabase.from("user_favorites").delete().eq("user_id", userId).eq("restaurant_id", restaurant.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("user_favorites") as any).insert({ user_id: userId, restaurant_id: restaurant.id });
      }
      setIsFav((v) => !v);
    } else {
      // localStorage
      const added = lsToggle(LS_FAV, localKey);
      setIsFav(added);
    }
    setFavLoading(false);
  };

  // ── Toggle wishlist ───────────────────────────────────────────────────────
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
      const added = lsToggle(LS_WISH, localKey);
      setIsWish(added);
    }
    setWishLoading(false);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;
  const cleanTypes = (restaurant.types ?? [])
    .filter((t) => !["point_of_interest", "establishment", "food"].includes(t))
    .map((t) => t.replace(/_/g, " "))
    .slice(0, 3);

  const aiPrompt = `A photorealistic cinematic image of a person enjoying cevapi at ${restaurant.name} in ${restaurant.city}, warm Balkan atmosphere, golden hour lighting, food photography style, 8k quality`;

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

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgb(var(--border))", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            {/* Name + badges */}
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

            {/* Address */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <MapPin style={{ width: "12px", height: "12px", color: "rgb(var(--muted))", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "rgb(var(--muted))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {restaurant.city}{restaurant.address ? ` · ${restaurant.address}` : ""}
              </span>
            </div>

            {/* ── ❤️ Favoriti + 🔖 Želim ići — shown for ALL restaurants ── */}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button
                onClick={toggleFav}
                disabled={favLoading}
                title={isFav ? "Ukloni iz favorita" : "Dodaj u favorite"}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isFav ? "#ef4444" : "rgb(var(--border))"}`,
                  background: isFav ? "rgba(239,68,68,0.1)" : "transparent",
                  color: isFav ? "#ef4444" : "rgb(var(--muted))",
                  cursor: "pointer",
                  opacity: favLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
              >
                <Heart style={{ width: "13px", height: "13px", fill: isFav ? "#ef4444" : "transparent", flexShrink: 0 }} />
                {isFav ? "Favorit ✓" : "Favoriti"}
              </button>

              <button
                onClick={toggleWish}
                disabled={wishLoading}
                title={isWish ? "Ukloni s wishiste" : "Dodaj na wishlistu"}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 14px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                  border: `1px solid ${isWish ? "#D35400" : "rgb(var(--border))"}`,
                  background: isWish ? "rgba(211,84,0,0.1)" : "transparent",
                  color: isWish ? "#D35400" : "rgb(var(--muted))",
                  cursor: "pointer",
                  opacity: wishLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
              >
                <Bookmark style={{ width: "13px", height: "13px", fill: isWish ? "#D35400" : "transparent", flexShrink: 0 }} />
                {isWish ? "Na listi ✓" : "Želim ići"}
              </button>
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgb(var(--border))", background: "transparent", color: "rgb(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Hero card */}
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

            {/* AI prompt */}
            <div style={{ borderRadius: "16px", border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.05)", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <Sparkles style={{ width: "18px", height: "18px", color: "#8b5cf6", flexShrink: 0 }} />
                <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "14px", color: "rgb(var(--foreground))", margin: 0 }}>GENERIRAJ AI SLIKU</p>
              </div>
              {!showPrompt ? (
                <button onClick={() => setShowPrompt(true)} style={{ width: "100%", padding: "9px 16px", borderRadius: "10px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Sparkles style={{ width: "14px", height: "14px" }} />
                  Generiraj AI sliku iz ovog grada
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: "11px", color: "rgb(var(--muted))", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI prompt spreman za kopiranje:</p>
                  <div style={{ background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "rgb(var(--foreground))", lineHeight: 1.6, fontFamily: "monospace" }}>
                    {aiPrompt}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={() => { navigator.clipboard.writeText(aiPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", background: copied ? "rgba(34,197,94,0.15)" : "rgba(139,92,246,0.15)", border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(139,92,246,0.3)"}`, color: copied ? "#22c55e" : "#8b5cf6", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {copied ? "✓ Kopirano!" : "Kopiraj prompt"}
                    </button>
                    <a href="https://replicate.com/stability-ai/sdxl" target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "8px", borderRadius: "8px", textAlign: "center", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", fontSize: "12px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      Otvori Replicate →
                    </a>
                  </div>
                </div>
              )}
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
