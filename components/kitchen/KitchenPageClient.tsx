"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChefHat, BookOpen, Video, Users, PlayCircle, ExternalLink, Search, X } from "lucide-react";
import { YOUTUBE_VIDEOS, type Recipe } from "@/constants/recipes";
import { RecipeModal } from "@/components/kitchen/RecipeModal";
import { GroupCalculator } from "@/components/kitchen/GroupCalculator";
import { cn } from "@/lib/utils";

type KitchenTab = "recipes" | "videos" | "squad";

// Category chips — values map to DB "category" field
const CATEGORY_CHIPS = [
  { label: "Sve",        value: ""           },
  { label: "Glavna jela", value: "Glavno jelo" },
  { label: "Deserti",    value: "Dodatak"    },
  { label: "Prilozi",    value: "Prilog"     },
] as const;
type CategoryFilter = "" | "Glavno jelo" | "Dodatak" | "Prilog";

const DIFFICULTY_LABEL: Record<Recipe["difficulty"], string> = {
  easy: "Lako",
  medium: "Srednje",
  hard: "Teško",
};

const DIFFICULTY_DOT: Record<Recipe["difficulty"], string> = {
  easy: "bg-green-400",
  medium: "bg-amber-400",
  hard: "bg-red-400",
};

const VIDEO_STYLES = ["Sarajevski", "Banjalučki", "default"] as const;
const VIDEO_STYLE_LABELS: Record<string, string> = {
  "Sarajevski": "🕌 Sarajevski",
  "Banjalučki": "🏔️ Banjalučki",
  "default": "🔥 Opći",
};

interface Props {
  initialRecipes: Recipe[];
}

export function KitchenPageClient({ initialRecipes }: Props) {
  const t = useTranslations("kitchen");
  const [activeTab, setActiveTab] = useState<KitchenTab>("recipes");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");

  const videoList = YOUTUBE_VIDEOS[selectedVideoStyle] ?? YOUTUBE_VIDEOS["default"];

  // Client-side filtering — runs instantly on every keystroke / chip click
  const filteredRecipes = useMemo(() => {
    let list = initialRecipes;
    if (categoryFilter) {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.desc.toLowerCase().includes(q) ||
          r.style.toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialRecipes, searchQuery, categoryFilter]);

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      {/* Header */}
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
        {/* Module tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab("recipes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              activeTab === "recipes"
                ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <BookOpen className="w-4 h-4" />
            {t("recipes")}
          </button>

          <button
            onClick={() => setActiveTab("videos")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              activeTab === "videos"
                ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <Video className="w-4 h-4" />
            {t("videos")}
          </button>

          <button
            onClick={() => setActiveTab("squad")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              activeTab === "squad"
                ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            )}
          >
            <Users className="w-4 h-4" />
            Squad Planer
          </button>
        </div>

        {/* RECIPES TAB */}
        {activeTab === "recipes" && (
          <div>
            {/* ── Search bar ──────────────────────────────────────────────── */}
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

            {/* ── Category chips ───────────────────────────────────────────── */}
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
                  className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-6 hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.04)] transition-all text-left cursor-pointer"
                >
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
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", DIFFICULTY_DOT[recipe.difficulty])} title={DIFFICULTY_LABEL[recipe.difficulty]} />
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

                  {/* Hover CTA */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[rgb(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Otvori recept →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIDEOS TAB */}
        {activeTab === "videos" && (
          <div>
            {/* Style filter for videos */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mr-1">
                Stil:
              </span>
              {VIDEO_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedVideoStyle(style)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    selectedVideoStyle === style
                      ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                  )}
                >
                  {VIDEO_STYLE_LABELS[style]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {videoList.map(({ title, embedId, channel }) => (
                <div
                  key={embedId + title}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] overflow-hidden group"
                >
                  {/* Thumbnail area */}
                  <a
                    href={`https://www.youtube.com/watch?v=${embedId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video bg-[rgb(var(--border)/0.3)] overflow-hidden"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${embedId}/mqdefault.jpg`}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <PlayCircle className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </a>

                  {/* Info */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] line-clamp-2 leading-snug mb-1">
                      {title}
                    </h4>
                    <p className="text-xs text-[rgb(var(--muted))]">{channel}</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${embedId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Pogledaj na YouTubeu
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[rgb(var(--muted))] text-xs mt-6 text-center opacity-50">
              Video sadržaj se učitava s YouTubea · Za prave preporuke, koristi YouTube pretraživanje unutar svake receptne kartice.
            </p>
          </div>
        )}

        {/* SQUAD PLANER TAB */}
        {activeTab === "squad" && (
          <GroupCalculator />
        )}
      </div>

      {/* Recipe Modal */}
      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
