"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ChefHat, BookOpen, Video, Users, PlayCircle, ExternalLink,
  Search, X, Clapperboard, Pin, Sparkles, Youtube,
  Loader2, AlertCircle, ChevronLeft,
} from "lucide-react";
import { type Recipe } from "@/constants/recipes";
import { type KitchenVideo } from "@/lib/actions/kitchen";
import {
  fetchYouTubeMetadata,
  type YtSearchResult,
} from "@/lib/actions/youtube";
import { RecipeModal } from "@/components/kitchen/RecipeModal";
import { GroupCalculator } from "@/components/kitchen/GroupCalculator";
import { cn } from "@/lib/utils";

type KitchenTab = "recipes" | "videos" | "squad";

// Category chips — values map to DB "category" field
const CATEGORY_CHIPS = [
  { label: "Sve",         value: ""            },
  { label: "Glavna jela", value: "Glavno jelo" },
  { label: "Deserti",     value: "Dodatak"     },
  { label: "Prilozi",     value: "Prilog"      },
] as const;
type CategoryFilter = "" | "Glavno jelo" | "Dodatak" | "Prilog";

const DIFFICULTY_LABEL: Record<Recipe["difficulty"], string> = {
  easy:   "Lako",
  medium: "Srednje",
  hard:   "Teško",
};

const DIFFICULTY_DOT: Record<Recipe["difficulty"], string> = {
  easy:   "bg-green-400",
  medium: "bg-amber-400",
  hard:   "bg-red-400",
};

const VIDEO_STYLE_LABELS: Record<string, string> = {
  Sarajevski:   "🕌 Sarajevski",
  "Banjalučki": "🏔️ Banjalučki",
  default:      "🔥 Opći",
};

interface Props {
  initialRecipes: Recipe[];
  initialVideos:  KitchenVideo[];
}

export function KitchenPageClient({ initialRecipes, initialVideos }: Props) {
  const t = useTranslations("kitchen");

  const [activeTab,          setActiveTab]          = useState<KitchenTab>("recipes");
  const [selectedRecipe,     setSelectedRecipe]     = useState<Recipe | null>(null);
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<string>("default");
  const [searchQuery,        setSearchQuery]        = useState("");
  const [videoSearchQuery,   setVideoSearchQuery]   = useState("");
  const [categoryFilter,     setCategoryFilter]     = useState<CategoryFilter>("");
  const [playingVideoId,     setPlayingVideoId]     = useState<string | null>(null);

  // ── YouTube Gate state ────────────────────────────────────────────────────
  const [ytGateOpen,  setYtGateOpen]  = useState(false);
  const [ytGateQuery, setYtGateQuery] = useState("");

  const openYtGate = (query: string) => {
    setYtGateQuery(query.trim());
    setYtGateOpen(true);
  };
  const closeYtGate = () => {
    setYtGateOpen(false);
    setYtGateQuery("");
  };

  // ── Video helpers ─────────────────────────────────────────────────────────
  const videosByStyle = useMemo<Record<string, KitchenVideo[]>>(() => {
    const map: Record<string, KitchenVideo[]> = {};
    for (const v of initialVideos) (map[v.style] ??= []).push(v);
    return map;
  }, [initialVideos]);

  const availableStyles = useMemo(() => Object.keys(videosByStyle), [videosByStyle]);

  const videoList: KitchenVideo[] =
    videosByStyle[selectedVideoStyle] ?? videosByStyle["default"] ?? [];

  const pinnedVideos = useMemo(
    () => initialVideos.filter((v) => v.isPinned),
    [initialVideos]
  );

  // ── Recipe filtering ──────────────────────────────────────────────────────
  const filteredRecipes = useMemo(() => {
    let list = initialRecipes;
    if (categoryFilter) list = list.filter((r) => r.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.desc.toLowerCase().includes(q) ||
          r.style.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  }, [initialRecipes, searchQuery, categoryFilter]);

  // ── Video filtering (DB only — pinned float to top) ───────────────────────
  const filteredVideoList = useMemo(() => {
    const base = videoSearchQuery.trim()
      ? (() => {
          const q = videoSearchQuery.toLowerCase();
          return videoList.filter(
            (v) =>
              v.title.toLowerCase().includes(q) ||
              v.channel.toLowerCase().includes(q) ||
              v.style.toLowerCase().includes(q)
          );
        })()
      : videoList;
    return [...base].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [videoList, videoSearchQuery]);

  const hasVideoSearch = videoSearchQuery.trim().length > 0;
  const dbHasNoMatches = hasVideoSearch && filteredVideoList.length === 0;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold uppercase tracking-wide text-[rgb(var(--foreground))]"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {t("title")}
              </h1>
              <p className="text-[rgb(var(--muted))] text-sm mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Module tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(
            [
              { id: "recipes" as const, icon: <BookOpen className="w-4 h-4" />, label: t("recipes")   },
              { id: "videos"  as const, icon: <Video    className="w-4 h-4" />, label: t("videos")    },
              { id: "squad"   as const, icon: <Users    className="w-4 h-4" />, label: "Squad Planer" },
            ]
          ).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                activeTab === id
                  ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                  : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              )}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ══════════════ RECIPES TAB ══════════════════════════════════════ */}
        {activeTab === "recipes" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži recepte…"
                className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[rgb(var(--surface)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
              {CATEGORY_CHIPS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value as CategoryFilter)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    categoryFilter === value
                      ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[rgb(var(--muted))] text-sm mb-6">
              {filteredRecipes.length === 0
                ? "Nema recepata za odabrane filtere."
                : `${filteredRecipes.length} ${filteredRecipes.length === 1 ? "recept" : "recepata"} · Klikni za detalje i upute`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={cn(
                    "group rounded-2xl border p-6 hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.04)] transition-all text-left cursor-pointer relative",
                    recipe.is_pinned
                      ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.04)]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)]"
                  )}
                >
                  {recipe.is_pinned && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgb(var(--primary))] text-white text-[10px] font-bold">
                      <Pin className="w-2.5 h-2.5" />
                      Admin Pick
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="text-5xl leading-none flex-shrink-0">{recipe.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="text-xl font-bold text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))] transition-colors"
                          style={{ fontFamily: "Oswald, sans-serif" }}
                        >
                          {recipe.title}
                        </h3>
                        <div
                          className={cn("w-2 h-2 rounded-full flex-shrink-0", DIFFICULTY_DOT[recipe.difficulty])}
                          title={DIFFICULTY_LABEL[recipe.difficulty]}
                        />
                      </div>
                      <p className="text-[rgb(var(--muted))] text-sm leading-relaxed line-clamp-2">
                        {recipe.desc}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--border)/0.5)] text-[rgb(var(--muted))]">
                          ⏱ {recipe.prepTime}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--border)/0.5)] text-[rgb(var(--muted))]">
                          👥 {recipe.servings} osobe
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))/0.8]">
                          {DIFFICULTY_LABEL[recipe.difficulty]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[rgb(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Otvori recept →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ VIDEOS TAB ═══════════════════════════════════════ */}
        {activeTab === "videos" && (
          <div>
            {initialVideos.length === 0 ? (
              <VideosComingSoon t={t} onYouTubeSearch={openYtGate} />
            ) : (
              <>
                {/* ── Search bar ────────────────────────────────────────── */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))] pointer-events-none" />
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => { setVideoSearchQuery(e.target.value); closeYtGate(); }}
                    placeholder="Pretraži videe…"
                    className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[rgb(var(--surface)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors text-sm"
                  />
                  {videoSearchQuery && (
                    <button
                      onClick={() => { setVideoSearchQuery(""); closeYtGate(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* ── Style filter ──────────────────────────────────────── */}
                {availableStyles.length > 1 && (
                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mr-1">
                      Stil:
                    </span>
                    {availableStyles.map((style) => (
                      <button
                        key={style}
                        onClick={() => { setSelectedVideoStyle(style); setPlayingVideoId(null); closeYtGate(); }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          selectedVideoStyle === style
                            ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                            : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                        )}
                      >
                        {VIDEO_STYLE_LABELS[style] ?? `🎥 ${style}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── DB video grid OR "no match" prompt ───────────────── */}
                {dbHasNoMatches ? (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <span className="text-4xl">🔍</span>
                    <p className="text-[rgb(var(--foreground))] font-semibold" style={{ fontFamily: "Oswald, sans-serif" }}>
                      {t("ytNoDbResults", { query: videoSearchQuery })}
                    </p>
                    <p className="text-sm text-[rgb(var(--muted))] max-w-xs">
                      {t("ytNoDbResultsSub")}
                    </p>
                    {!ytGateOpen && (
                      <button
                        onClick={() => openYtGate(videoSearchQuery)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
                      >
                        <Youtube className="w-4 h-4" />
                        {t("ytSearchBtn", { query: videoSearchQuery })}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredVideoList.map(({ id, title, embedId, channel, isPinned }) => (
                      <VideoCard
                        key={id}
                        id={id}
                        title={title}
                        embedId={embedId}
                        channel={channel}
                        isPinned={isPinned}
                        isPlaying={playingVideoId === id}
                        onPlay={() => setPlayingVideoId(id)}
                      />
                    ))}
                  </div>
                )}

                {!dbHasNoMatches && (
                  <p className="text-[rgb(var(--muted))] text-xs mt-6 text-center opacity-50">
                    {filteredVideoList.length} / {initialVideos.length}{" "}
                    {initialVideos.length === 1 ? "video" : "videa"}
                  </p>
                )}
              </>
            )}

            {/* ── YouTube Gate Panel — fetch → grid → play ───────────────────
                Only mounted when the user explicitly requests it.
                Admin pinned DB videos always rendered above the results.
            ──────────────────────────────────────────────────────────────── */}
            {ytGateOpen && ytGateQuery && (
              <YouTubeGatePanel
                query={ytGateQuery}
                pinnedVideos={pinnedVideos}
                t={t}
                onClose={closeYtGate}
              />
            )}
          </div>
        )}

        {/* ══════════════ SQUAD PLANER TAB ════════════════════════════════ */}
        {activeTab === "squad" && <GroupCalculator />}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoCard — DB video card (thumbnail + click-to-play iframe)
// ─────────────────────────────────────────────────────────────────────────────
interface VideoCardProps {
  id:        string;
  title:     string;
  embedId:   string;
  channel:   string;
  isPinned:  boolean;
  isPlaying: boolean;
  onPlay:    () => void;
}

function VideoCard({ id, title, embedId, channel, isPinned, isPlaying, onPlay }: VideoCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden group relative",
        isPinned
          ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--surface)/0.6)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)]"
      )}
    >
      {isPinned && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgb(var(--primary))] text-white text-[10px] font-bold shadow">
          <Pin className="w-2.5 h-2.5" />
          Admin Pick
        </div>
      )}

      {isPlaying ? (
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <button
          onClick={onPlay}
          className="block w-full relative aspect-video bg-[rgb(var(--border)/0.3)] overflow-hidden"
        >
          <img
            src={`https://img.youtube.com/vi/${embedId}/mqdefault.jpg`}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <PlayCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </button>
      )}

      <div className="p-4">
        <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] line-clamp-2 leading-snug mb-1">
          {title}
        </h4>
        <p className="text-xs text-[rgb(var(--muted))]">{channel}</p>
        <div className="mt-3 flex items-center gap-2">
          {!isPlaying && (
            <button
              onClick={onPlay}
              className="flex items-center gap-1 text-xs text-[rgb(var(--primary))] hover:opacity-80 transition-opacity font-medium"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Pogledaj
            </button>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${embedId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
          >
            <ExternalLink className="w-3 h-3" />
            YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTubeGatePanel — fetch → grid → play
//
// State machine:
//   "loading"  → spinner while server action runs
//   "error"    → error message + retry button
//   "empty"    → no results message
//   "results"  → thumbnail grid; clicking a card transitions to "playing"
//   "playing"  → full-width iframe with verified videoId; back button returns
//
// Admin-pinned DB videos always shown above the results grid as "Naše preporuke".
// ─────────────────────────────────────────────────────────────────────────────
type GateStatus = "loading" | "error" | "empty" | "results" | "playing";
type TFn = ReturnType<typeof import("next-intl").useTranslations<"kitchen">>;

interface YtGatePanelProps {
  query:        string;
  pinnedVideos: KitchenVideo[];
  t:            TFn;
  onClose:      () => void;
}

function YouTubeGatePanel({ query, pinnedVideos, t, onClose }: YtGatePanelProps) {
  const [status,          setStatus]          = useState<GateStatus>("loading");
  const [results,         setResults]         = useState<YtSearchResult[]>([]);
  const [errorMsg,        setErrorMsg]        = useState("");
  const [activeVideoId,   setActiveVideoId]   = useState<string | null>(null);
  const [activeVideoTitle,setActiveVideoTitle]= useState("");

  const runFetch = useCallback(async () => {
    setStatus("loading");
    setResults([]);
    setErrorMsg("");
    setActiveVideoId(null);

    const { results: res, error } = await fetchYouTubeMetadata(query);

    if (error) {
      setErrorMsg(error);
      setStatus("error");
      return;
    }
    if (res.length === 0) {
      setStatus("empty");
      return;
    }
    setResults(res);
    setStatus("results");
  }, [query]);

  // Fetch immediately when the panel mounts or query changes
  useEffect(() => { runFetch(); }, [runFetch]);

  const playVideo = (id: string, title: string) => {
    setActiveVideoId(id);
    setActiveVideoTitle(title);
    setStatus("playing");
  };

  const backToResults = () => {
    setActiveVideoId(null);
    setStatus("results");
  };

  return (
    <div className="mt-8 space-y-5">
      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-red-600 flex-shrink-0">
            <Youtube className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[rgb(var(--foreground))]">
            {t("ytPanelTitle")}{" "}
            <span className="text-[rgb(var(--primary))]">&ldquo;{query}&rdquo;</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-medium whitespace-nowrap">
            {t("ytExternalBadge")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === "playing" && (
            <button
              onClick={backToResults}
              className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("ytBackToResults")}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Zatvori"
            className="p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Admin Picks — always on top ────────────────────────────────────── */}
      {pinnedVideos.length > 0 && status !== "playing" && (
        <div>
          <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {t("ytOfficialPicks")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedVideos.map(({ id, title, embedId, channel, isPinned }) => (
              <VideoCard
                key={id}
                id={id}
                title={title}
                embedId={embedId}
                channel={channel}
                isPinned={isPinned}
                isPlaying={false}
                onPlay={() => playVideo(embedId, title)}
              />
            ))}
          </div>
          <div className="mt-5 border-t border-[rgb(var(--border)/0.5)]" />
        </div>
      )}

      {/* ── State views ───────────────────────────────────────────────────── */}

      {/* LOADING */}
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
          <p className="text-sm text-[rgb(var(--muted))]">{t("ytLoading")}</p>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--foreground))] mb-1">
              {t("ytErrorTitle")}
            </p>
            <p className="text-xs text-[rgb(var(--muted))] max-w-sm mx-auto">
              {errorMsg || t("ytErrorGeneric")}
            </p>
          </div>
          <button
            onClick={runFetch}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(var(--border))] text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.4)] transition-colors"
          >
            {t("ytRetry")}
          </button>
        </div>
      )}

      {/* EMPTY */}
      {status === "empty" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl">🎬</span>
          <p className="text-sm text-[rgb(var(--muted))] max-w-xs">{t("ytEmpty")}</p>
        </div>
      )}

      {/* RESULTS GRID */}
      {status === "results" && results.length > 0 && (
        <>
          <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium flex items-center gap-1.5">
            <Youtube className="w-3 h-3 text-red-400" />
            {t("ytResultsLabel")} · {results.length} {t("ytResultsCount")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((video) => (
              <YtResultCard
                key={video.id}
                video={video}
                onPlay={() => playVideo(video.id, video.title)}
              />
            ))}
          </div>
          <p className="text-[10px] text-[rgb(var(--muted))] opacity-40 text-center pt-2">
            {t("ytDisclaimer")}
          </p>
        </>
      )}

      {/* PLAYING — verified videoId embed */}
      {status === "playing" && activeVideoId && (
        <div className="rounded-2xl overflow-hidden border border-red-500/20 bg-black">
          <div className="px-4 py-2.5 bg-[rgb(var(--surface)/0.9)] border-b border-[rgb(var(--border))] flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-red-600 flex-shrink-0">
              <Youtube className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-[rgb(var(--foreground))] truncate flex-1 font-medium">
              {activeVideoTitle}
            </span>
            <a
              href={`https://www.youtube.com/watch?v=${activeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors flex-shrink-0 ml-2"
            >
              <ExternalLink className="w-3 h-3" />
              YouTube
            </a>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              key={activeVideoId}
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1`}
              title={activeVideoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YtResultCard — thumbnail card for a single YouTube search result
// ─────────────────────────────────────────────────────────────────────────────
function YtResultCard({
  video,
  onPlay,
}: {
  video:  YtSearchResult;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] overflow-hidden hover:border-red-500/40 hover:bg-red-500/[0.03] transition-all text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[rgb(var(--border)/0.3)]">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <PlayCircle className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] line-clamp-2 leading-snug mb-1 group-hover:text-red-400 transition-colors">
          {video.title}
        </h4>
        <p className="text-xs text-[rgb(var(--muted))] truncate">{video.channelTitle}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideosComingSoon — shown when kitchen_videos DB table is empty.
// Includes opt-in YouTube search so the gate is reachable from zero-DB state.
// ─────────────────────────────────────────────────────────────────────────────
function VideosComingSoon({
  t,
  onYouTubeSearch,
}: {
  t:               TFn;
  onYouTubeSearch: (query: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSearch = () => {
    const q = inputValue.trim();
    if (q) onYouTubeSearch(q);
  };

  return (
    <div className="flex flex-col items-center py-16 px-4 gap-8">
      {/* Decorative card */}
      <div className="relative w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface)/0.9)] to-[rgb(var(--surface)/0.3)] px-8 py-12 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[rgb(var(--primary)/0.07)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[rgb(var(--primary)/0.05)] blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[rgb(var(--primary)/0.12)] border border-[rgb(var(--primary)/0.2)] flex items-center justify-center">
            <Clapperboard className="w-10 h-10 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h3
              className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {t("videosComingSoon")}
            </h3>
            <p className="text-sm text-[rgb(var(--muted))] leading-relaxed max-w-xs mx-auto">
              {t("videosComingSoonSub")}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgb(var(--primary)/0.1)] border border-[rgb(var(--primary)/0.25)] text-[rgb(var(--primary))] text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            {t("videosComingSoonBadge")}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {(["🥩 Ćevapi", "🥯 Lepinja", "🧅 Luk & Kajmak", "🔥 Roštilj"] as const).map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--muted))]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* YouTube search opt-in */}
      <div className="w-full max-w-md">
        <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium text-center mb-3">
          {t("ytComingSoonSearchLabel")}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))] pointer-events-none" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="npr. sarajevski ćevapi, roštilj…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgb(var(--surface)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-red-500/50 transition-colors text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!inputValue.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex-shrink-0"
          >
            <Youtube className="w-4 h-4" />
            <span className="hidden sm:inline">{t("ytSearchAction")}</span>
          </button>
        </div>
        <p className="text-[10px] text-[rgb(var(--muted))] opacity-50 mt-2 text-center">
          {t("videosComingSoonHint")}
        </p>
      </div>
    </div>
  );
}
