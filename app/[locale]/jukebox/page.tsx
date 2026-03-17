import { useTranslations } from "next-intl";
import { Music, ExternalLink, Play } from "lucide-react";
import { JUKEBOX_PLAYLISTS } from "@/constants/playlists";

export default function JukeboxPage() {
  const t = useTranslations("jukebox");

  return (
    <div className="min-h-screen bg-charcoal dark:bg-ugljen-bg text-cream">
      {/* Header */}
      <div className="border-b border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/50 dark:bg-ugljen-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-burnt-orange-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-burnt-orange-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-cream uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif" }}>
              {t("title")}
            </h1>
          </div>
          <p className="text-cream/50 pl-[52px]">{t("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Vibe Mode banner */}
        <div className="rounded-2xl border border-burnt-orange-500/30 bg-burnt-orange-500/5 p-5 mb-8 flex items-center gap-4">
          <div className="text-3xl animate-ember-pulse">🎛️</div>
          <div>
            <h3 className="font-semibold text-burnt-orange-400" style={{ fontFamily: "Oswald, sans-serif" }}>
              {t("vibeMode")}
            </h3>
            <p className="text-cream/50 text-sm">
              Playlista se automatski mijenja prema gradu koji pregledavaš na mapi. Trenutno: <strong className="text-cream/70">Ručno</strong>.
            </p>
          </div>
          <button className="ml-auto btn-primary text-sm">Aktiviraj</button>
        </div>

        {/* Playlist cards */}
        <h2 className="text-xl font-bold text-cream mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>
          {t("playlists")} — Preporuka Šefa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {JUKEBOX_PLAYLISTS.map((pl) => (
            <div
              key={pl.id}
              className="group rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30 p-5 hover:border-burnt-orange-500/40 transition-all"
            >
              {/* Cover */}
              <div className="w-full aspect-square rounded-xl bg-charcoal-700 dark:bg-ugljen-border flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform">
                {pl.coverEmoji}
              </div>

              <h3 className="text-lg font-bold text-cream mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                {pl.title}
              </h3>
              <p className="text-xs text-burnt-orange-400 font-medium mb-2">{pl.genre}</p>
              <p className="text-cream/50 text-sm leading-relaxed mb-4">{pl.description}</p>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-burnt-orange-500/20 text-burnt-orange-400 hover:bg-burnt-orange-500/30 transition-colors text-sm font-medium">
                  <Play className="w-4 h-4 fill-current" />
                  {t("nowPlaying")}
                </button>
                <a
                  href={pl.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 transition-colors"
                  title={t("openSpotify")}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-cream/30 text-xs mt-8">
          Playliste su prijedlog — klikni na Spotify ikonu za slušanje. Integracija s Spotify API-jem dolazi u v2.
        </p>
      </div>
    </div>
  );
}
