"use client";

// ── AccommodationModal · finder (Sprint 26w · DS-migrated) ────────────────────
// Booking.com search builder modal — opens a pre-filled Booking.com search in
// a new tab for the restaurant's city. ChevApp doesn't take commission.
//
// Sprint 26w changes:
//   - Legacy palette swept (charcoal-700/800/900 + cream/X +
//     burnt-orange-400/500/600 + ugljen-border/surface/bg) → DS tokens
//     (border-border, bg-surface, bg-background, text-foreground, text-muted,
//     text-primary, hover:bg-vatra-hover, text-primary-fg).
//   - Cream-on-cream invisibility fixes throughout (text-cream/X → text-muted
//     for chrome, text-foreground/X for body) — same latent bug Sprint 26h
//     fixed in RestaurantGrid, Sprint 26k in Navbar, Sprint 26u in Theme/
//     Jukebox/Merak.
//   - 2× style={{fontFamily:"Oswald"}} (header h2, CTA button) → font-display.
//   - CTA bg-burnt-orange-500 + hover:bg-burnt-orange-600 + text-white →
//     bg-primary + hover:bg-vatra-hover + text-primary-fg (DS rule — explicit
//     hover token, not opacity-fade or generic Tailwind hover).
//   - Date inputs [color-scheme:dark] removed. The CSS color-scheme property
//     was forcing dark calendar UI in browsers — would render dark calendar
//     popovers floating over light Somun pages. Letting the browser pick
//     based on the global page color-scheme (set in globals.css).
//   - <option> bg-charcoal-900 hint removed — browser-styled <option>s vary
//     by platform anyway, the inline bg was inconsistent.
//   - rounded-2xl modal → rounded-card; rounded-xl inputs → rounded-chip;
//     rounded-lg close → rounded-chip.
//   - shadow-2xl → shadow-soft-xl.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { X, Calendar, Users, BedDouble, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  city: string;
}

// Returns today and tomorrow in YYYY-MM-DD format for default values
function today()    { return new Date().toISOString().slice(0, 10); }
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function AccommodationModal({ isOpen, onClose, restaurantName, city }: Props) {
  const [checkin,  setCheckin]  = useState(today());
  const [checkout, setCheckout] = useState(tomorrow());
  const [guests,   setGuests]   = useState(2);
  const [rooms,    setRooms]    = useState(1);

  if (!isOpen) return null;

  const handleSearch = () => {
    // Construct Booking.com search URL
    const params = new URLSearchParams({
      ss:           city,
      checkin:      checkin,
      checkout:     checkout,
      group_adults: String(guests),
      no_rooms:     String(rooms),
      lang:         "hr",
    });
    window.open(`https://www.booking.com/searchresults.html?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface shadow-soft-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">
                PRONAĐI SMJEŠTAJ
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Rezerviraj smještaj u{" "}
              <span className="text-primary font-medium">{city}</span>{" "}
              za posjetu restoranu{" "}
              <span className="text-foreground/80 font-medium">{restaurantName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zatvori"
            className="p-1.5 rounded-chip border border-border text-muted hover:text-foreground hover:border-primary/40 transition-colors flex-shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-4">
          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted uppercase tracking-widest font-medium mb-1.5">
                Dolazak
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <input
                  type="date"
                  value={checkin}
                  min={today()}
                  onChange={(e) => {
                    setCheckin(e.target.value);
                    // Ensure checkout is after checkin
                    if (e.target.value >= checkout) {
                      const next = new Date(e.target.value);
                      next.setDate(next.getDate() + 1);
                      setCheckout(next.toISOString().slice(0, 10));
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-chip bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-widest font-medium mb-1.5">
                Odlazak
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <input
                  type="date"
                  value={checkout}
                  min={checkin}
                  onChange={(e) => setCheckout(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-chip bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Guests + Rooms row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted uppercase tracking-widest font-medium mb-1.5">
                Gosti
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full pl-9 pr-8 py-2.5 rounded-chip bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors appearance-none"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "gost" : n < 5 ? "gosta" : "gostiju"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted uppercase tracking-widest font-medium mb-1.5">
                Sobe
              </label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                <select
                  value={rooms}
                  onChange={(e) => setRooms(Number(e.target.value))}
                  className="w-full pl-9 pr-8 py-2.5 rounded-chip bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors appearance-none"
                >
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "soba" : "sobe"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Nights summary */}
          {checkin && checkout && checkin < checkout && (
            <p className="text-xs text-muted text-center">
              {Math.round(
                (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000
              )}{" "}
              noć · {guests} {guests === 1 ? "gost" : guests < 5 ? "gosta" : "gostiju"} · {rooms}{" "}
              {rooms === 1 ? "soba" : "sobe"}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleSearch}
            className={cn(
              "font-display w-full flex items-center justify-center gap-2 py-3.5 rounded-chip",
              "bg-primary hover:bg-vatra-hover active:scale-[0.98]",
              "text-primary-fg font-bold text-sm transition-all",
            )}
          >
            <ExternalLink className="w-4 h-4" />
            PRETRAŽI SMJEŠTAJ NA BOOKING.COM
          </button>

          <p className="text-[10px] text-muted text-center">
            Otvorit će se Booking.com u novom tabu. ChevApp ne prima proviziju.
          </p>
        </div>
      </div>
    </div>
  );
}
