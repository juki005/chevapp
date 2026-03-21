"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, BedDouble, ExternalLink, CheckCircle } from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
// Minimal shape — works for both DB Restaurant rows and Google Places results
export interface ProfileTarget {
  name: string;
  city: string;
  address?: string | null;
  is_verified?: boolean;
}

interface Props {
  restaurant: ProfileTarget | null;
  onClose: () => void;
}

export function RestaurantDetailModal({ restaurant, onClose }: Props) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we only use createPortal on the client
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(`${restaurant.name}, ${restaurant.city}`)}&language=hr`
    : "";

  const modal = (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
      />

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          // Mobile: drawer from bottom
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "92dvh",
          borderRadius: "24px 24px 0 0",
          display: "flex",
          flexDirection: "column",
          background: "rgb(var(--surface))",
          border: "1px solid rgb(var(--border))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "9999px", background: "rgb(var(--border))" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgb(var(--border))",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "rgb(var(--foreground))",
                lineHeight: 1.2,
                margin: 0,
              }}>
                {restaurant.name}
              </h2>
              {restaurant.is_verified && (
                <CheckCircle style={{ width: "16px", height: "16px", color: "#D35400", flexShrink: 0 }} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              <MapPin style={{ width: "12px", height: "12px", color: "rgb(var(--muted))", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "rgb(var(--muted))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {restaurant.city} · {restaurant.address}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid rgb(var(--border))",
              background: "transparent",
              color: "rgb(var(--muted))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>

          {/* Google Maps embed */}
          <div style={{ width: "100%", aspectRatio: "16/9", background: "rgb(var(--border))", position: "relative" }}>
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title={`${restaurant.name} na Google Maps`}
                style={{ width: "100%", height: "100%", border: "none" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                minHeight: "200px",
              }}>
                <MapPin style={{ width: "32px", height: "32px", color: "rgb(var(--muted))" }} />
                <p style={{ fontSize: "13px", color: "rgb(var(--muted))", margin: 0 }}>
                  Google Maps embed nedostupan
                </p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#D35400",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink style={{ width: "12px", height: "12px" }} />
                  Otvori u Google Maps
                </a>
              </div>
            )}
          </div>

          {/* Accommodation CTA */}
          <div style={{ padding: "20px" }}>
            <div style={{
              borderRadius: "16px",
              border: "1px solid rgba(211,84,0,0.25)",
              background: "rgba(211,84,0,0.06)",
              padding: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(211,84,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <BedDouble style={{ width: "20px", height: "20px", color: "#D35400" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "Oswald, sans-serif",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "rgb(var(--foreground))",
                    margin: "0 0 4px",
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
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      background: "#D35400",
                      color: "#fff",
                      fontFamily: "Oswald, sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <ExternalLink style={{ width: "16px", height: "16px" }} />
                    PRETRAŽI SMJEŠTAJ
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom breathing room on mobile */}
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

  // Render directly into document.body so no parent CSS can clip or hide it
  return createPortal(modal, document.body);
}
