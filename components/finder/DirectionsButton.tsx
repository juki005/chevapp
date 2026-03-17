"use client";

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
      {/* Phone call button — shown only when phone number is available */}
      {phone && (
        <a
          href={`tel:${phone}`}
          title={`Pozovi: ${phone}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center justify-center rounded-xl transition-all",
            "w-11 h-11 min-h-[44px] min-w-[44px]",
            "border border-green-500/30 bg-green-500/10",
            "text-green-400 hover:bg-green-500/20 hover:border-green-500/60",
          )}
        >
          <Phone className="w-4 h-4" />
        </a>
      )}

      {/* Navigation dropdown trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "flex items-center gap-1.5 px-3 min-h-[44px] h-11 rounded-xl text-sm font-semibold transition-all",
          "bg-burnt-orange-500 text-white hover:bg-burnt-orange-600",
          "shadow-md hover:shadow-burnt-orange-900/40 active:scale-95",
          "border border-burnt-orange-600/50",
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
          <div className="absolute bottom-full mb-2 right-0 z-50 w-56 rounded-2xl border border-charcoal-600 dark:border-ugljen-border bg-charcoal-800 dark:bg-ugljen-surface shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-charcoal-700 dark:border-ugljen-border flex items-center justify-between">
              <span className="text-xs text-cream/50 font-medium truncate max-w-[160px]">{name}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-cream/30 hover:text-cream/60 ml-2 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Google Maps */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-cream/70 hover:text-cream hover:bg-charcoal-700 dark:hover:bg-ugljen-border transition-colors min-h-[44px]"
            >
              <span className="text-xl leading-none">🗺️</span>
              <div>
                <p className="font-semibold">Google Maps</p>
                <p className="text-[10px] text-cream/30">Otvara navigaciju</p>
              </div>
            </a>

            {/* Waze */}
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-cream/70 hover:text-cream hover:bg-charcoal-700 dark:hover:bg-ugljen-border transition-colors min-h-[44px] border-t border-charcoal-700/50 dark:border-ugljen-border/50"
            >
              <span className="text-xl leading-none">🚗</span>
              <div>
                <p className="font-semibold">Waze</p>
                <p className="text-[10px] text-cream/30">Živi promet</p>
              </div>
            </a>

            {/* Phone — in dropdown too */}
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 text-sm text-green-400 hover:text-green-300 hover:bg-charcoal-700 dark:hover:bg-ugljen-border transition-colors min-h-[44px] border-t border-charcoal-700/50 dark:border-ugljen-border/50"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Pozovi</p>
                  <p className="text-[10px] text-green-400/60">{phone}</p>
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
