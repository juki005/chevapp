"use client";

import { Tag } from "lucide-react";

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
    <div style={{ borderRadius: "16px", background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", padding: "16px" }}>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Tag style={{ width: "14px", height: "14px", color: "rgb(var(--primary))", flexShrink: 0 }} />
        <span style={{ fontSize: "12px", fontWeight: 700, color: "rgb(var(--foreground))", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Oswald, sans-serif" }}>
          Stil Ćevapa
        </span>
        {dbStyleTag && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "9999px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", fontWeight: 600 }}>
            ✓ Tagged
          </span>
        )}
      </div>

      {/* Skeleton while loading */}
      {dataLoading ? (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CEVAP_STYLES.map((s) => (
            <div
              key={s}
              style={{
                padding: "7px 14px", borderRadius: "9999px",
                background: "rgb(var(--border))", width: "90px", height: "34px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>

      ) : canTag ? (
        /* Interactive chips */
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CEVAP_STYLES.map((style) => {
            const isActive = dbStyleTag === style;
            return (
              <button
                key={style}
                onClick={() => onTagStyle(style)}
                disabled={tagLoading}
                style={{
                  padding:    "7px 14px",
                  borderRadius: "9999px",
                  fontSize:   "13px",
                  fontWeight: 600,
                  border:     `1.5px solid ${isActive ? "rgb(var(--primary))" : "rgb(var(--border))"}`,
                  background: isActive ? "rgb(var(--primary) / 0.12)" : "transparent",
                  color:      isActive ? "rgb(var(--primary))" : "rgb(var(--muted))",
                  cursor:     tagLoading ? "not-allowed" : "pointer",
                  opacity:    tagLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                  transform:  isActive ? "scale(1.04)" : "scale(1)",
                }}
              >
                {isActive ? `✓ ${style}` : style}
              </button>
            );
          })}
        </div>

      ) : (
        /* Not logged in or not taggable */
        <p style={{ fontSize: "12px", color: "rgb(var(--muted))", margin: 0 }}>
          {userId
            ? "Ovaj restoran nije dostupan za tagovanje."
            : "Prijavi se da tagovaš stil i pomogneš zajednici. +15 XP 🎁"}
        </p>
      )}

      {/* XP nudge for anonymous users */}
      {!userId && (
        <p style={{ fontSize: "11px", color: "rgb(var(--muted))", marginTop: "8px", opacity: 0.7 }}>
          💡 Svaki novi tag donosi{" "}
          <span style={{ color: "rgb(var(--primary))", fontWeight: 600 }}>+15 XP</span>
        </p>
      )}
    </div>
  );
}
