"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CEVAP_STYLES, STYLE_TO_I18N_KEY } from "@/constants/cevapiStyles";
import type { CevapStyle } from "@/types";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface StyleFilterProps {
  // Controlled mode: pass activeStyle + onStyleChange together to lift state up.
  // If omitted the component manages its own internal state.
  activeStyle?: CevapStyle | "" | null;
  onStyleChange?: (style: CevapStyle | "") => void;
}

export function StyleFilter({
  activeStyle: controlledStyle,
  onStyleChange,
}: StyleFilterProps) {
  const t = useTranslations("finder");

  // Internal state — only used when caller doesn't lift state
  const [internalStyle, setInternalStyle] = useState<CevapStyle | "">("");

  // Resolve: controlled > uncontrolled
  const selectedStyle = controlledStyle !== undefined ? (controlledStyle ?? "") : internalStyle;

  const handleStyle = (style: CevapStyle | "") => {
    if (controlledStyle === undefined) setInternalStyle(style);
    onStyleChange?.(style);
  };

  // ── Sprint 26g · DS-migrated ──────────────────────────────────────────────
  // Idle state follows the 7shifts inactive-contrast rule: transparent fill +
  // foreground text + border only (never muted grey fill).
  const btnBase   = "px-3 py-1.5 rounded-chip text-xs font-medium border transition-all";
  const btnActive = "border-primary/60 bg-primary/10 text-primary";
  const btnIdle   = "border-border text-muted hover:text-foreground";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs text-muted uppercase tracking-widest font-medium">
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
                selectedStyle === value ? btnActive : btnIdle,
              )}
            >
              {/* TODO(icons): style emojis are categorical markers —
                  Sprint 27 may or may not replace them (they're closer to
                  content than chrome). Leaving as-is for now. */}
              <span aria-hidden="true">{emoji}</span>
              <span>{t(i18nKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
