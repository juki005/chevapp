// ── JukeboxPage · app-route (Sprint 26aj · DS-migrated) ──────────────────────
// Page-level Jukebox view (vs. the floating widget). Lists curated playlists
// with Spotify links + a vibe-mode placeholder.
//
// Sprint 26aj changes:
//   - Legacy palette swept (charcoal-700/800 + cream/X + burnt-orange-400/500
//     + ugljen-bg/border/surface) → DS tokens throughout.
//   - 3× style={{fontFamily:"Oswald"}} → font-display class.
//   - Spotify brand green #1DB954 kept as external-brand exception
//     (precedent: JukeboxWidget Sprint 26u).
//   - 🎛️ vibe-mode emoji tagged TODO(icons) + aria-hidden.
//   - Cream-on-cream invisibility fixes (text-cream/X → text-muted /
//     text-foreground/X — same latent-bug pattern as Sprint 26h+ et al).
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
//   - btn-primary global class kept (defined in globals.css presumably).
// ─────────────────────────────────────────────────────────────────────────────

import { useTranslations } from "next-intl";
import { Music, ExternalLink, Play } from "lucide-react";
import { JUKEBOX_PLAYLISTS } from "@/constants/playlists";

export default function JukeboxPage() {
  const t = useTranslations("jukebox");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-chip bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground uppercase tracking-wide">
              {t("title")}
            </h1>
          </div>
          <p className="text-muted pl-[52px]">{t("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Vibe Mode banner */}
        <div className="rounded-card border border-primary/30 bg-primary/5 p-5 mb-8 flex items-center gap-4">
          {/* TODO(icons): swap 🎛️ for brand <Vibe> / mixer SVG */}
          <div className="text-3xl animate-ember-pulse" aria-hidden="true">🎛️</div>
          <div>
            <h3 className="font-display font-semibold text-primary">
              {t("vibeMode")}
            </h3>
            <p className="text-muted text-sm">
              Playlista se automatski mijenja prema gradu koji pregledavaš na mapi. Trenutno: <strong className="text-foreground/70">Ručno</strong>.
            </p>
          </div>
          <button className="ml-auto btn-primary text-sm">Aktiviraj</button>
        </div>

        {/* Playlist cards */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {t("playlists")} — Preporuka Šefa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {JUKEBOX_PLAYLISTS.map((pl) => (
            <div
              key={pl.id}
              className="group rounded-card border border-border bg-surface/40 p-5 hover:border-primary/40 transition-all"
            >
              {/* Cover — coverEmoji is data content (categorical playlist marker) */}
              <div className="w-full aspect-square rounded-chip bg-border flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform">
                <span aria-hidden="true">{pl.coverEmoji}</span>
              </div>

              <h3 className="font-display text-lg font-bold text-foreground mb-1">
                {pl.title}
              </h3>
              <p className="text-xs text-primary font-medium mb-2">{pl.genre}</p>
              <p className="text-muted text-sm leading-relaxed mb-4">{pl.description}</p>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-chip bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium">
                  <Play className="w-4 h-4 fill-current" />
                  {t("nowPlaying")}
                </button>
                {/* Spotify brand green — external-brand exception */}
                <a
                  href={pl.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-chip bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors"
                  title={t("openSpotify")}
                  aria-label={t("openSpotify")}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-muted text-xs mt-8">
          Playliste su prijedlog — klikni na Spotify ikonu za slušanje. Integracija s Spotify API-jem dolazi u v2.
        </p>
      </div>
    </div>
  );
}
