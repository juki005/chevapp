"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CEVAP_STYLES, PORTION_OPTIONS, STYLE_TO_I18N_KEY } from "@/constants/cevapiStyles";
import type { CevapStyle } from "@/types";
import { cn } from "@/lib/utils";
import { Filter, Plane } from "lucide-react";

interface StyleFilterProps {
  // Controlled mode: pass activeStyle + onStyleChange together to lift state up.
  // If omitted the component manages its own internal state.
  activeStyle?: CevapStyle | "" | null;
  onStyleChange?: (style: CevapStyle | "") => void;
  onPortionChange?: (portion: number | null) => void;
  onAirportChange?: (val: boolean) => void;
}

export function StyleFilter({
  activeStyle: controlledStyle,
  onStyleChange,
  onPortionChange,
  onAirportChange,
}: StyleFilterProps) {
  const t = useTranslations("finder");

  // Internal state — only used when caller doesn't lift state
  const [internalStyle, setInternalStyle] = useState<CevapStyle | "">("");
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);
  const [airportFilter, setAirportFilter] = useState(false);

  // Resolve: controlled > uncontrolled
  const selectedStyle = controlledStyle !== undefined ? (controlledStyle ?? "") : internalStyle;

  const handleStyle = (style: CevapStyle | "") => {
    if (controlledStyle === undefined) setInternalStyle(style);
    onStyleChange?.(style);
  };

  const handlePortion = (portion: number | null) => {
    setSelectedPortion(portion);
    onPortionChange?.(portion);
  };

  const handleAirport = () => {
    const next = !airportFilter;
    setAirportFilter(next);
    onAirportChange?.(next);
  };

  const btnBase = "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all";
  const btnActive = "border-[rgb(var(--primary)/0.6)] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]";
  const btnIdle = "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]";

  return (
    <div className="space-y-3">
      {/* Style filters */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
          <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
            {t("filterStyle")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStyle("")}
            className={cn(btnBase, selectedStyle === "" ? btnActive : btnIdle)}
          >
            {t("allStyles")}
          </button>
          {CEVAP_STYLES.map(({ value, emoji }) => {
            // ✅ Explicit ASCII key map — .toLowerCase() breaks ć/č/š chars
            const i18nKey = STYLE_TO_I18N_KEY[value] as
              | "sarajevski"
              | "banjalucki"
              | "travnicki"
              | "leskovacki"
              | "ostalo";
            return (
              <button
                key={value}
                onClick={() => handleStyle(value)}
                className={cn(
                  "flex items-center gap-1.5",
                  btnBase,
                  selectedStyle === value ? btnActive : btnIdle
                )}
              >
                <span>{emoji}</span>
                <span>{t(i18nKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Portion + Diaspora */}
      <div className="flex flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
            <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              {t("filterPortion")}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePortion(null)}
              className={cn(btnBase, selectedPortion === null ? btnActive : btnIdle)}
            >
              Sve
            </button>
            {PORTION_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handlePortion(value)}
                className={cn(btnBase, selectedPortion === value ? btnActive : btnIdle)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
            <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              Dijaspora
            </span>
          </div>
          <button
            onClick={handleAirport}
            className={cn(
              "flex items-center gap-1.5",
              btnBase,
              airportFilter ? btnActive : btnIdle
            )}
          >
            <Plane className="w-3 h-3" />
            <span>Airport Dash 🛫</span>
          </button>
        </div>
      </div>
    </div>
  );
}
