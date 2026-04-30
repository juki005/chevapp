"use client";

// ── StyleTagSection · finder/modal (Sprint 26ag · DS-migrated) ────────────────
// Cevap-style tagging chip-row inside the restaurant detail modal. Logged-in
// users earn +15 XP per tag.
//
// Sprint 26ag changes:
//   - Comprehensive style={{ ... }} → Tailwind className tokens (same
//     pattern as CommunityNews 26x and OnboardingFlow 26z). Was 100%
//     inline-styled before this sprint.
//   - Inline Oswald on section header → font-display class.
//   - "✓ Tagged" badge: hardcoded #22c55e (green-500) +
//     rgba(34,197,94,0.12/0.3) → ember-green token family (DS confirm).
//   - All rgb(var(--token)) inline → semantic aliases.
//   - Active-chip primary/0.12 fill → primary/10 (rounded to standard
//     Tailwind opacity scale, imperceptible delta).
//   - 💡 / 🎁 emoji in XP nudge tagged TODO(icons) + aria-hidden.
//   - Skeleton uses animate-pulse Tailwind class instead of inline keyframe.
//   - borderRadius: "16px" → rounded-card (20px, closest DS scale —
//     same trade-off as elsewhere); "9999px" → rounded-pill.
// ─────────────────────────────────────────────────────────────────────────────

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export const CEVAP_STYLES = ["Sarajevski", "Banjalučki", "Travnički", "Leskovački", "Ostalo"] as const;
export type CevapStyle = typeof CEVAP_STYLES[number];

interface StyleTagSectionProps {
  dbStyleTag:   CevapStyle | null;
  dataLoading:  boolean;
  canTag:       boolean;
  tagLoading:   boolean;
  userId:       string | null;
  onTagStyle:   (style: CevapStyle) => void;
}

export function StyleTagSection({
  dbStyleTag, dataLoading, canTag, tagLoading, userId, onTagStyle,
}: StyleTagSectionProps) {
  return (
    <div className="rounded-card bg-background border border-border p-4">

      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
          Stil Ćevapa
        </span>
        {dbStyleTag && (
          <span className="text-[10px] px-2 py-0.5 rounded-pill bg-ember-green/10 text-ember-green border border-ember-green/30 font-semibold">
            ✓ Tagged
          </span>
        )}
      </div>

      {/* Skeleton while loading */}
      {dataLoading ? (
        <div className="flex gap-2 flex-wrap">
          {CEVAP_STYLES.map((s) => (
            <div
              key={s}
              className="px-3.5 py-1.5 rounded-pill bg-border w-[90px] h-[34px] animate-pulse"
            />
          ))}
        </div>

      ) : canTag ? (
        /* Interactive chips */
        <div className="flex gap-2 flex-wrap">
          {CEVAP_STYLES.map((style) => {
            const isActive = dbStyleTag === style;
            return (
              <button
                key={style}
                onClick={() => onTagStyle(style)}
                disabled={tagLoading}
                className={cn(
                  "px-3.5 py-1.5 rounded-pill text-sm font-semibold border-[1.5px] transition-all",
                  isActive
                    ? "border-primary bg-primary/10 text-primary scale-[1.04]"
                    : "border-border bg-transparent text-muted",
                  tagLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                )}
              >
                {isActive ? `✓ ${style}` : style}
              </button>
            );
          })}
        </div>

      ) : (
        /* Not logged in or not taggable */
        <p className="text-xs text-muted m-0">
          {userId
            ? "Ovaj restoran nije dostupan za tagovanje."
            : <>Prijavi se da tagovaš stil i pomogneš zajednici. +15 XP <span aria-hidden="true">🎁</span></>}
        </p>
      )}

      {/* XP nudge for anonymous users */}
      {!userId && (
        <p className="text-[11px] text-muted mt-2 opacity-70">
          {/* TODO(icons): swap 💡 for brand <Tip> / Lightbulb */}
          <span aria-hidden="true">💡</span> Svaki novi tag donosi{" "}
          <span className="text-primary font-semibold">+15 XP</span>
        </p>
      )}
    </div>
  );
}
