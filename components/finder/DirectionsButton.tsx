"use client";

// ── DirectionsButton · Finder (Sprint 26b · DS-migrated) ─────────────────────
// "Kreni po ćevape" — the primary CTA on restaurant cards. Combines an optional
// phone-call chip with a Google Maps / Waze dropdown.
//
// Sprint 26b changes:
//   - bg-burnt-orange-500 → bg-primary (vatra). This IS a primary CTA; it now
//     uses the same token as every other primary button in the app.
//   - Phone chip: green-500/green-400 → ember-green (semantic "confirmed
//     action" — matches the open_now indicator in PlaceResultCard).
//   - Dropdown panel: charcoal-800/ugljen-surface duo → bg-surface; all
//     cream/xx opacity text → text-foreground / text-muted.
//   - Shapes: rounded-xl → rounded-chip (trigger + phone chip), rounded-2xl
//     → rounded-card (dropdown panel).
//   - Emoji (🗺️ 🚗) kept as placeholders until Sprint 27 swap-in of brand
//     icons. aria-hidden to keep them out of AT.
// ────────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Navigation, ChevronDown, X, Phone } from "lucide-react";
import { getWazeUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DirectionsButtonProps {
  name:      string;
  address:   string;
  city:      string;
  lat?:      number | null;
  lng?:      number | null;
  phone?:    string | null;
  className?: string;
}

export function DirectionsButton({
  name,
  address,
  city,
  lat,
  lng,
  phone,
  className,
}: DirectionsButtonProps) {
  const [open, setOpen] = useState(false);

  // Prefer lat/lng for accuracy; include travelmode=driving for deep-link to navigation
  const googleUrl = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}`)}&travelmode=driving`;

  const wazeUrl = getWazeUrl(lat ?? null, lng ?? null, `${address}, ${city}`);

  return (
    <div className="relative flex items-center gap-2">
      {/* Phone call button — shown only when phone number is available.
          ember-green because placing a call is a confirmed-success action,
          same semantic family as open_now. */}
      {phone && (
        <a
          href={`tel:${phone}`}
          title={`Pozovi: ${phone}`}
          aria-label={`Pozovi: ${phone}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center justify-center rounded-chip transition-all",
            "w-11 h-11 min-h-[44px] min-w-[44px]",
            "border border-ember-green/30 bg-ember-green/10 text-ember-green",
            "hover:bg-ember-green/20 hover:border-ember-green/60",
          )}
        >
          <Phone className="w-4 h-4" />
        </a>
      )}

      {/* Navigation dropdown trigger — primary CTA styling (vatra). */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 px-3 min-h-[44px] h-11 rounded-chip text-sm font-semibold transition-all",
          "bg-primary text-primary-fg shadow-brand",
          "hover:bg-vatra-hover hover:-translate-y-px",
          "active:bg-vatra-pressed active:translate-y-0 active:shadow-none",
          className,
        )}
      >
        <Navigation className="w-4 h-4 flex-shrink-0" />
        <span>Kreni po ćevape</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            role="menu"
            className="absolute bottom-full mb-2 right-0 z-50 w-56 rounded-card border border-border bg-surface shadow-soft-xl overflow-hidden animate-slide-up"
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted font-medium truncate max-w-[160px]">{name}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Zatvori"
                className="text-muted hover:text-foreground ml-2 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Google Maps */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-foreground hover:bg-border/40 transition-colors min-h-[44px]"
            >
              {/* TODO(icons): swap 🗺️ for brand <Finder> */}
              <span className="text-xl leading-none" aria-hidden="true">🗺️</span>
              <div>
                <p className="font-semibold">Google Maps</p>
                <p className="text-[10px] text-muted">Otvara navigaciju</p>
              </div>
            </a>

            {/* Waze */}
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-foreground hover:bg-border/40 transition-colors min-h-[44px] border-t border-border/50"
            >
              {/* TODO(icons): swap 🚗 for brand <GastroRuta> */}
              <span className="text-xl leading-none" aria-hidden="true">🚗</span>
              <div>
                <p className="font-semibold">Waze</p>
                <p className="text-[10px] text-muted">Živi promet</p>
              </div>
            </a>

            {/* Phone — in dropdown too, mirrors outer chip in ember-green. */}
            {phone && (
              <a
                href={`tel:${phone}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 text-sm text-ember-green hover:bg-ember-green/10 transition-colors min-h-[44px] border-t border-border/50"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Pozovi</p>
                  <p className="text-[10px] text-ember-green/70">{phone}</p>
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
