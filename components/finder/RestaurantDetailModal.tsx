"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, MapPin, BedDouble, ExternalLink, CheckCircle,
  Navigation, Star, Clock, Globe, Phone,
} from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";

// Minimal shape — works for both DB Restaurant rows and Google Places results.
// All fields beyond name/city are optional so DB cards work without them.
export interface ProfileTarget {
  name:        string;
  city:        string;
  address?:    string | null;
  is_verified?: boolean;
  // Google Places extras (present when opened from a Places card)
  rating?:     number | null;
  open_now?:   boolean | null;
  phone?:      string | null;
  website?:    string | null;
  types?:      string[];
}

interface Props {
  restaurant: ProfileTarget | null;
  onClose:    () => void;
}

// Renders 5 stars with the given rating filled
function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{
            width: "14px",
            height: "14px",
            fill: i <= Math.round(rating) ? "#f59e0b" : "transparent",
            color: i <= Math.round(rating) ? "#f59e0b" : "rgb(var(--border))",
          }}
        />
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while open
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

  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;

  // Clean up type labels (Google returns things like "point_of_interest")
  const cleanTypes = (restaurant.types ?? [])
    .filter((t) => !["point_of_interest", "establishment", "food"].includes(t))
    .map((t) => t.replace(/_/g, " "))
    .slice(0, 3);

  const modal = (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
      />

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {/* Mobile: full-width drawer from bottom                            */}
      {/* Desktop (sm+): centered floating card, max 520px wide            */}
      <div
        className={[
          "fixed flex flex-col overflow-hidden",
          // Mobile drawer
          "inset-x-0 bottom-0 rounded-t-3xl max-h-[92dvh]",
          // Desktop modal
          "sm:inset-auto sm:bottom-auto",
          "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-[520px] sm:rounded-2xl sm:max-h-[85vh]",
        ].join(" ")}
        style={{
          zIndex: 9999,
          background: "rgb(var(--surface))",
          border: "1px solid rgb(var(--border))",
          boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex sm:hidden justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: "40px", height: "4px", borderRadius: "9999px", background: "rgb(var(--border))" }} />
        </div>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgb(var(--border))",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{
                fontFamily: "Oswald, sans-serif", fontSize: "20px", fontWeight: 700,
                color: "rgb(var(--foreground))", lineHeight: 1.2, margin: 0,
              }}>
                {restaurant.name}
              </h2>
              {restaurant.is_verified && (
                <CheckCircle style={{ width: "16px", height: "16px", color: "#D35400", flexShrink: 0 }} />
              )}
              {restaurant.open_now != null && (
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px",
                  background: restaurant.open_now ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: restaurant.open_now ? "#22c55e" : "#ef4444",
                  border: `1px solid ${restaurant.open_now ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
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
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px", height: "36px", borderRadius: "10px",
              border: "1px solid rgb(var(--border))", background: "transparent",
              color: "rgb(var(--muted))", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>

          {/* ── Info card ──────────────────────────────────────────────────── */}
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Hero emoji + name block */}
            <div style={{
              borderRadius: "16px",
              background: "rgb(var(--background))",
              border: "1px solid rgb(var(--border))",
              padding: "20px",
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
            }}>
              {/* Big emoji avatar */}
              <div style={{
                width: "64px", height: "64px", borderRadius: "14px",
                background: "rgba(211,84,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "32px", flexShrink: 0,
              }}>
                🍖
              </div>

              <div style={{ flex: 1 }}>
                {/* Rating */}
                {restaurant.rating != null && (
                  <div style={{ marginBottom: "10px" }}>
                    <StarRating rating={restaurant.rating} />
                  </div>
                )}

                {/* Type tags */}
                {cleanTypes.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {cleanTypes.map((t) => (
                      <span key={t} style={{
                        fontSize: "11px", padding: "3px 10px", borderRadius: "9999px",
                        background: "rgb(var(--border))", color: "rgb(var(--muted))",
                        textTransform: "capitalize",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* No extra data fallback */}
                {restaurant.rating == null && cleanTypes.length === 0 && (
                  <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: 0 }}>
                    Više informacija dostupno na Google Maps.
                  </p>
                )}
              </div>
            </div>

            {/* ── Contact / info rows ────────────────────────────────────── */}
            <div style={{
              borderRadius: "16px",
              background: "rgb(var(--background))",
              border: "1px solid rgb(var(--border))",
              overflow: "hidden",
            }}>
              {/* Address */}
              {restaurant.address && (
                <InfoRow icon={<MapPin style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  {restaurant.address}, {restaurant.city}
                </InfoRow>
              )}

              {/* Open status */}
              {restaurant.open_now != null && (
                <InfoRow icon={<Clock style={{ width: "15px", height: "15px", color: restaurant.open_now ? "#22c55e" : "#ef4444" }} />}>
                  <span style={{ color: restaurant.open_now ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {restaurant.open_now ? "Trenutno otvoreno" : "Trenutno zatvoreno"}
                  </span>
                </InfoRow>
              )}

              {/* Phone */}
              {restaurant.phone && (
                <InfoRow icon={<Phone style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a href={`tel:${restaurant.phone}`} style={{ color: "rgb(var(--foreground))", textDecoration: "none" }}>
                    {restaurant.phone}
                  </a>
                </InfoRow>
              )}

              {/* Website */}
              {restaurant.website && (
                <InfoRow icon={<Globe style={{ width: "15px", height: "15px", color: "#D35400" }} />}>
                  <a
                    href={restaurant.website.startsWith("http") ? restaurant.website : `https://${restaurant.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#4285f4", textDecoration: "none" }}
                  >
                    {restaurant.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </InfoRow>
              )}

              {/* Google Maps link — always shown */}
              <InfoRow icon={<Navigation style={{ width: "15px", height: "15px", color: "#4285f4" }} />}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4285f4", textDecoration: "none" }}
                >
                  Pogledaj na Google Maps →
                </a>
              </InfoRow>
            </div>

            {/* ── Accommodation CTA ──────────────────────────────────────── */}
            <div style={{
              borderRadius: "16px",
              border: "1px solid rgba(211,84,0,0.25)",
              background: "rgba(211,84,0,0.06)",
              padding: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  background: "rgba(211,84,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <BedDouble style={{ width: "20px", height: "20px", color: "#D35400" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "16px",
                    color: "rgb(var(--foreground))", margin: "0 0 4px",
                  }}>
                    PLANIRAŠ POSJET?
                  </p>
                  <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: "0 0 16px", lineHeight: 1.5 }}>
                    Pronađi smještaj u{" "}
                    <span style={{ color: "#D35400", fontWeight: 600 }}>{restaurant.city}</span>{" "}
                    i pretvori ručak u pravi gastro-odmor.
                  </p>
                  <button
                    onClick={() => setAccommodationOpen(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 20px", borderRadius: "12px",
                      background: "#D35400", color: "#fff",
                      fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: "14px",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    <ExternalLink style={{ width: "16px", height: "16px" }} />
                    PRETRAŽI SMJEŠTAJ
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom breathing room */}
            <div style={{ height: "8px" }} />
          </div>
        </div>
      </div>

      {/* Accommodation modal stacked on top */}
      <AccommodationModal
        isOpen={accommodationOpen}
        onClose={() => setAccommodationOpen(false)}
        restaurantName={restaurant.name}
        city={restaurant.city ?? ""}
      />
    </>
  );

  return createPortal(modal, document.body);
}

// ── Reusable info row ─────────────────────────────────────────────────────────
function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 16px",
      borderBottom: "1px solid rgb(var(--border))",
      fontSize: "13px", color: "rgb(var(--foreground))",
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
