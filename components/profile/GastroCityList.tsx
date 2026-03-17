"use client";

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
      <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-10 text-center">
        <MapPin className="w-10 h-10 text-[rgb(var(--muted))] mx-auto mb-3 opacity-30" />
        <p className="text-[rgb(var(--muted))] text-sm leading-relaxed">
          Tvoja gastro ruta je prazna.<br />
          Posjeti prvi restoran i ostavi recenziju! 🌯
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-[rgb(var(--primary))]" />
        <h3
          className="font-bold text-[rgb(var(--foreground))]"
          style={{ fontFamily: "Oswald, sans-serif" }}
        >
          Gastro Pasoš
        </h3>
      </div>
      <p className="text-xs text-[rgb(var(--muted))] mb-5">
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
              <span className="text-xs text-[rgb(var(--muted))] w-24 flex-shrink-0 truncate">
                {city}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-2 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-xs text-[rgb(var(--primary))] font-semibold w-20 text-right flex-shrink-0">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
