"use client";

import { useState, useEffect } from "react";
import { X, MapPin, BedDouble, ExternalLink, CheckCircle } from "lucide-react";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types";

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
}

export function RestaurantDetailModal({ restaurant, onClose }: Props) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);

  // Lock body scroll while open; restore on close / unmount
  useEffect(() => {
    if (!restaurant) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [restaurant]);

  // Close on Escape key
  useEffect(() => {
    if (!restaurant) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  // Google Maps Embed — shows the place card with official photos, reviews & map
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(`${restaurant.name}, ${restaurant.city}`)}&language=hr`
    : "";

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Panel — full-screen drawer on mobile, floating modal on desktop ─── */}
      <div
        className={cn(
          "fixed z-50 flex flex-col",
          // Mobile: slide up from bottom, full width
          "inset-x-0 bottom-0 rounded-t-3xl max-h-[92dvh]",
          // Desktop: centered floating modal
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-2xl sm:rounded-2xl sm:max-h-[90vh]",
          "bg-charcoal-900 dark:bg-ugljen-surface border border-charcoal-700 dark:border-ugljen-border",
          "shadow-2xl overflow-hidden"
        )}
        // Stop clicks inside the panel from reaching the backdrop
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-charcoal-600 dark:bg-ugljen-border" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-charcoal-700/60 dark:border-ugljen-border/60 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-xl font-bold text-cream leading-tight"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {restaurant.name}
              </h2>
              {restaurant.is_verified && (
                <CheckCircle className="w-4 h-4 text-burnt-orange-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-cream/40 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{restaurant.city} · {restaurant.address}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-charcoal-700 dark:border-ugljen-border flex items-center justify-center text-cream/40 hover:text-cream hover:border-burnt-orange-500/40 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Google Maps Embed */}
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-charcoal-800 relative">
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title={`${restaurant.name} op Google Maps`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              // Fallback when no API key: link out to Google Maps
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-cream/30">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">Google Maps embed unavailable</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-burnt-orange-400 text-xs hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Otvori u Google Maps
                </a>
              </div>
            )}
          </div>

          {/* ── Accommodation CTA ────────────────────────────────────────────── */}
          <div className="p-5">
            <div className="rounded-2xl border border-burnt-orange-500/20 bg-burnt-orange-500/05 p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-burnt-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <BedDouble className="w-5 h-5 text-burnt-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-cream text-base mb-0.5"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    PLANIRAŠ POSJET?
                  </p>
                  <p className="text-cream/50 text-sm mb-4 leading-relaxed">
                    Pronađi smještaj u{" "}
                    <span className="text-burnt-orange-400 font-medium">{restaurant.city}</span>{" "}
                    i pretvori ručak u pravi gastro-odmor.
                  </p>
                  <button
                    onClick={() => setAccommodationOpen(true)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl",
                      "bg-burnt-orange-500 hover:bg-burnt-orange-600 active:scale-[0.98]",
                      "text-white text-sm font-bold transition-all"
                    )}
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    PRETRAŽI SMJEŠTAJ
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom breathing room on mobile so the CTA isn't at the very edge */}
            <div className="h-2 sm:h-0" />
          </div>
        </div>
      </div>

      {/* Accommodation modal — stacks on top of this modal (z-60) */}
      <AccommodationModal
        isOpen={accommodationOpen}
        onClose={() => setAccommodationOpen(false)}
        restaurantName={restaurant.name}
        city={restaurant.city}
      />
    </>
  );
}
