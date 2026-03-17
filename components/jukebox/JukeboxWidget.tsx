"use client";

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
        <div className="w-72 rounded-2xl border border-charcoal-600 dark:border-ugljen-border bg-charcoal-800/98 dark:bg-ugljen-surface/98 backdrop-blur-sm shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-700 dark:border-ugljen-border">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-burnt-orange-400" />
              <span className="text-sm font-bold text-cream" style={{ fontFamily: "Oswald, sans-serif" }}>
                ChevApp Jukebox
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-cream/40 hover:text-cream transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Now playing */}
          <div className="px-4 py-4">
            <div className="text-xs text-cream/40 uppercase tracking-widest mb-2">Sada svira</div>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl bg-charcoal-700 dark:bg-ugljen-border flex items-center justify-center text-2xl",
                playing && "animate-ember-pulse"
              )}>
                {current.coverEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-cream text-sm truncate">{current.title}</div>
                <div className="text-xs text-cream/40 truncate">{current.genre}</div>
              </div>
              <button
                onClick={() => setPlaying(!playing)}
                className="w-9 h-9 rounded-lg bg-burnt-orange-500/20 hover:bg-burnt-orange-500/30 text-burnt-orange-400 flex items-center justify-center transition-colors"
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
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    i === activeIdx
                      ? "bg-burnt-orange-500/15 text-burnt-orange-400"
                      : "text-cream/50 hover:text-cream hover:bg-charcoal-700 dark:hover:bg-ugljen-border"
                  )}
                >
                  <span>{pl.coverEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{pl.title}</div>
                    <div className="text-xs opacity-60 truncate">{pl.genre}</div>
                  </div>
                  {i === activeIdx && playing && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className="w-0.5 bg-burnt-orange-400 rounded-full animate-ember-pulse"
                          style={{ height: `${8 + bar * 4}px`, animationDelay: `${bar * 0.1}s` }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-charcoal-700 dark:border-ugljen-border">
            <a
              href={current.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 transition-colors text-sm font-medium"
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
          "w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105",
          "bg-charcoal-800 dark:bg-ugljen-surface border border-burnt-orange-500/40 hover:border-burnt-orange-500/70",
          open && "rotate-180"
        )}
        aria-label="Toggle Jukebox"
      >
        {open ? (
          <ChevronUp className="w-5 h-5 text-burnt-orange-400" />
        ) : (
          <Music className={cn("w-5 h-5 text-burnt-orange-400", playing && "animate-ember-pulse")} />
        )}
      </button>
    </div>
  );
}
