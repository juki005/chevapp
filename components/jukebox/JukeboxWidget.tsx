"use client";

// ── JukeboxWidget · jukebox (Sprint 26u · DS-migrated) ────────────────────────
// Floating bottom-right FAB that expands to a playlist panel. Shows now-
// playing, switches between curated playlists, opens chosen one on Spotify.
//
// Sprint 26u changes:
//   - Legacy palette → DS tokens throughout:
//       border-charcoal-600/700 + dark:border-ugljen-border duo → border-border
//       bg-charcoal-700/800 + dark:bg-ugljen-surface/border duo → bg-surface /
//                                                                  bg-border
//       text-cream → text-foreground; text-cream/40 + /50 → text-muted
//       (fixes cream-on-cream invisibility in Somun mode — Sprint 26h pattern)
//       text-burnt-orange-400 → text-primary (Music brand icon, Play/Pause,
//                                              active playlist)
//       bg-burnt-orange-500/20 → bg-primary/20 / /10 / /15
//       border-burnt-orange-500/40 → border-primary/40
//   - Inline style={{fontFamily:"Oswald"}} on widget title → font-display.
//   - Spotify brand green #1DB954 kept as documented external-brand
//     exception (same precedent as TripAdvisor green in FinderFilterBar
//     Sprint 26j and Google's white SSO chrome in AuthModal Sprint 26m —
//     external-brand surfaces with mandated colours).
//   - Playlist coverEmoji is content from JUKEBOX_PLAYLISTS data (categorical
//     marker like country flags or per-style colours), kept aria-hidden.
//   - bg-charcoal-800/98 + /98 → /95 (rounded to standard Tailwind opacity).
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
//   - shadow-2xl + shadow-xl → shadow-soft-xl (DS elevation).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Music, X, ChevronUp, ExternalLink, Play, Pause } from "lucide-react";
import { JUKEBOX_PLAYLISTS } from "@/constants/playlists";
import { cn } from "@/lib/utils";

export function JukeboxWidget() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const current = JUKEBOX_PLAYLISTS[activeIdx];

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {open && (
        <div className="w-72 rounded-card border border-border bg-surface/95 backdrop-blur-sm shadow-soft-xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-bold text-foreground">
                ChevApp Jukebox
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Zatvori jukebox"
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Now playing */}
          <div className="px-4 py-4">
            <div className="text-xs text-muted uppercase tracking-widest mb-2">Sada svira</div>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-chip bg-border flex items-center justify-center text-2xl",
                playing && "animate-ember-pulse"
              )}>
                {/* coverEmoji is data-driven content (playlist cover) */}
                <span aria-hidden="true">{current.coverEmoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">{current.title}</div>
                <div className="text-xs text-muted truncate">{current.genre}</div>
              </div>
              <button
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? "Pauziraj" : "Reproduciraj"}
                className="w-9 h-9 rounded-chip bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"
              >
                {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            </div>

            {/* Playlist selector */}
            <div className="space-y-1">
              {JUKEBOX_PLAYLISTS.map((pl, i) => (
                <button
                  key={pl.id}
                  onClick={() => { setActiveIdx(i); setPlaying(true); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-chip text-left transition-colors text-sm",
                    i === activeIdx
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-border"
                  )}
                >
                  <span aria-hidden="true">{pl.coverEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{pl.title}</div>
                    <div className="text-xs opacity-60 truncate">{pl.genre}</div>
                  </div>
                  {i === activeIdx && playing && (
                    <div className="flex gap-0.5" aria-hidden="true">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className="w-0.5 bg-primary rounded-full animate-ember-pulse"
                          style={{ height: `${8 + bar * 4}px`, animationDelay: `${bar * 0.1}s` }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer — Spotify brand green kept as external-brand exception */}
          <div className="px-4 py-3 border-t border-border">
            <a
              href={current.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-chip bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Otvori na Spotifyu
            </a>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-12 h-12 rounded-card shadow-soft-xl flex items-center justify-center transition-all duration-200 hover:scale-105",
          "bg-surface border border-primary/40 hover:border-primary/70",
          open && "rotate-180"
        )}
        aria-label="Toggle Jukebox"
        aria-expanded={open}
      >
        {open ? (
          <ChevronUp className="w-5 h-5 text-primary" />
        ) : (
          <Music className={cn("w-5 h-5 text-primary", playing && "animate-ember-pulse")} />
        )}
      </button>
    </div>
  );
}
