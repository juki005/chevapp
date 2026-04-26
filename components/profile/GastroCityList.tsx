"use client";

// ── GastroCityList · profile (Sprint 26v · DS-migrated) ──────────────────────
// "Gastro Pasoš" — visited-city progress bars (per-city restaurant count vs.
// known-total). Profile-page satellite.
//
// Sprint 26v changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on h3 title → font-display class.
//   - Empty-state 🌯 emoji tagged TODO(icons) + aria-hidden — content-
//     adjacent decoration in a result-state message, not chrome.
//   - rounded-2xl → rounded-card (DS shape scale).
// ─────────────────────────────────────────────────────────────────────────────

import { MapPin } from "lucide-react";

export interface CityVisit {
  city:         string;
  visitedCount: number;
  /** Total restaurants in this city known to the app. Used for the progress bar. */
  totalCount:   number;
}

interface Props {
  cities: CityVisit[];
}

export function GastroCityList({ cities }: Props) {
  if (cities.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-10 text-center">
        <MapPin className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
        <p className="text-muted text-sm leading-relaxed">
          Tvoja gastro ruta je prazna.<br />
          {/* TODO(icons): swap 🌯 for brand <Cevap> */}
          Posjeti prvi restoran i ostavi recenziju! <span aria-hidden="true">🌯</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface/40 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-foreground">
          Gastro Pasoš
        </h3>
      </div>
      <p className="text-xs text-muted mb-5">
        {cities.length} {cities.length === 1 ? "grad" : cities.length < 5 ? "grada" : "gradova"} na tvojoj ruti
      </p>

      {/* City bars — same layout as Taste Profile bars */}
      <div className="space-y-3">
        {cities.map(({ city, visitedCount, totalCount }) => {
          const pct = Math.min(Math.round((visitedCount / totalCount) * 100), 100);
          const label =
            visitedCount === 1 ? "1 restoran" : `${visitedCount} restorana`;

          return (
            <div key={city} className="flex items-center gap-3">
              {/* City name */}
              <span className="text-xs text-muted w-24 flex-shrink-0 truncate">
                {city}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-xs text-primary font-semibold w-20 text-right flex-shrink-0">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
