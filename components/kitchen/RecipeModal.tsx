"use client";

import { useState } from "react";
import { X, Clock, Users, ChefHat, Share2, CheckCircle, Circle } from "lucide-react";
import type { Recipe } from "@/constants/recipes";
import { RecipeVideoPlayer } from "./RecipeVideoPlayer";
import { cn } from "@/lib/utils";

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

type Tab = "ingredients" | "steps" | "tips" | "video";

const DIFFICULTY_LABEL: Record<Recipe["difficulty"], string> = {
  easy: "Lako",
  medium: "Srednje",
  hard: "Teško",
};

const DIFFICULTY_COLOR: Record<Recipe["difficulty"], string> = {
  easy: "text-green-400 bg-green-400/10 border-green-400/30",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  hard: "text-red-400 bg-red-400/10 border-red-400/30",
};

export function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ingredients");
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [shared, setShared] = useState(false);

  if (!recipe) return null;

  const toggleStep = (step: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleShare = async () => {
    const text = `${recipe.emoji} ${recipe.title} — ChevApp recept`;
    if (navigator.share) {
      await navigator.share({ title: text, text: recipe.desc });
    } else {
      await navigator.clipboard.writeText(text);
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "ingredients", label: "🧂 Sastojci" },
    { key: "steps",       label: "👨‍🍳 Priprema" },
    { key: "tips",        label: "💡 Savjeti" },
    ...(recipe.video_url ? [{ key: "video" as Tab, label: "▶️ Video" }] : []),
  ];

  const progress = recipe.steps.length > 0
    ? Math.round((checkedSteps.size / recipe.steps.length) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[rgb(var(--surface))] border border-[rgb(var(--border))] shadow-2xl overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[rgb(var(--border))]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-4xl flex-shrink-0">{recipe.emoji}</span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[rgb(var(--foreground))] leading-tight truncate" style={{ fontFamily: "Oswald, sans-serif" }}>
                {recipe.title}
              </h2>
              <p className="text-xs text-[rgb(var(--muted))] mt-0.5 line-clamp-2">{recipe.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
              title="Podijeli recept"
            >
              {shared ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgb(var(--border))] flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
            <Clock className="w-3.5 h-3.5" />
            <span>Priprema: <strong className="text-[rgb(var(--foreground))]">{recipe.prepTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kuhanje: <strong className="text-[rgb(var(--foreground))]">{recipe.cookTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
            <Users className="w-3.5 h-3.5" />
            <span><strong className="text-[rgb(var(--foreground))]">{recipe.servings}</strong> osobe</span>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", DIFFICULTY_COLOR[recipe.difficulty])}>
            {DIFFICULTY_LABEL[recipe.difficulty]}
          </span>

          {/* Progress bar (steps) */}
          {checkedSteps.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[rgb(var(--muted))]">{progress}%</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgb(var(--border))] px-5 gap-1 pt-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2",
                activeTab === key
                  ? "text-[rgb(var(--primary))] border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
                  : "text-[rgb(var(--muted))] border-transparent hover:text-[rgb(var(--foreground))]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* INGREDIENTS TAB */}
          {activeTab === "ingredients" && (
            <div className="space-y-2">
              <p className="text-xs text-[rgb(var(--muted))] mb-3">
                Klikni na sastojak da ga označiš ✓
              </p>
              {recipe.ingredients.map((ing, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleIngredient(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                    checkedIngredients.has(idx)
                      ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.08)] opacity-60"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] hover:border-[rgb(var(--primary)/0.3)]"
                  )}
                >
                  {checkedIngredients.has(idx)
                    ? <CheckCircle className="w-4 h-4 text-[rgb(var(--primary))] flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-[rgb(var(--border))] flex-shrink-0" />
                  }
                  <span className={cn(
                    "text-sm font-semibold flex-shrink-0 min-w-[80px]",
                    checkedIngredients.has(idx) ? "line-through text-[rgb(var(--muted))]" : "text-[rgb(var(--primary))]"
                  )}>
                    {ing.amount}
                  </span>
                  <span className={cn(
                    "text-sm",
                    checkedIngredients.has(idx) ? "line-through text-[rgb(var(--muted))]" : "text-[rgb(var(--foreground))]"
                  )}>
                    {ing.item}
                  </span>
                </button>
              ))}

              {checkedIngredients.size === recipe.ingredients.length && recipe.ingredients.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-green-400/10 border border-green-400/30 text-center">
                  <p className="text-green-400 text-sm font-medium">✅ Svi sastojci prikupljeni — krenimo kuhati!</p>
                </div>
              )}
            </div>
          )}

          {/* STEPS TAB */}
          {activeTab === "steps" && (
            <div className="space-y-3">
              <p className="text-xs text-[rgb(var(--muted))] mb-3">
                Klikni na korak kad je gotov 🔥
              </p>
              {recipe.steps.map(({ step, text }) => (
                <button
                  key={step}
                  onClick={() => toggleStep(step)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                    checkedSteps.has(step)
                      ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.08)] opacity-70"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] hover:border-[rgb(var(--primary)/0.3)]"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    checkedSteps.has(step)
                      ? "bg-[rgb(var(--primary))] text-white"
                      : "bg-[rgb(var(--border))] text-[rgb(var(--muted))]"
                  )}>
                    {checkedSteps.has(step) ? "✓" : step}
                  </div>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    checkedSteps.has(step) ? "line-through text-[rgb(var(--muted))]" : "text-[rgb(var(--foreground))]"
                  )}>
                    {text}
                  </p>
                </button>
              ))}

              {checkedSteps.size === recipe.steps.length && recipe.steps.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-[rgb(var(--primary)/0.1)] border border-[rgb(var(--primary)/0.3)] text-center">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="text-[rgb(var(--primary))] font-bold">Recept završen!</p>
                  <p className="text-[rgb(var(--muted))] text-xs mt-1">Dobar tek! Uživaj u svom obroku.</p>
                </div>
              )}
            </div>
          )}

          {/* TIPS TAB */}
          {activeTab === "tips" && (
            <div className="space-y-3">
              {recipe.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)]"
                >
                  <span className="text-lg flex-shrink-0">
                    {idx === 0 ? "🔑" : idx === 1 ? "⚡" : idx === 2 ? "🌡️" : "💪"}
                  </span>
                  <p className="text-sm text-[rgb(var(--foreground))] leading-relaxed">{tip}</p>
                </div>
              ))}

              {/* Video: embedded player if available, otherwise YouTube search link */}
              {recipe.video_url ? (
                <div className="mt-4">
                  <p className="text-xs text-[rgb(var(--muted))] mb-2 uppercase tracking-widest font-medium">Video tutorial</p>
                  <RecipeVideoPlayer url={recipe.video_url} />
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]">
                  <p className="text-xs text-[rgb(var(--muted))] mb-2 uppercase tracking-widest font-medium">Video tutorial</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.youtubeQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    <span className="text-xl">▶️</span>
                    <span>Pogledaj na YouTubeu →</span>
                  </a>
                  <p className="text-xs text-[rgb(var(--muted))] mt-1 opacity-60">{recipe.youtubeQuery}</p>
                </div>
              )}
            </div>
          )}
          {/* VIDEO TAB */}
          {activeTab === "video" && recipe.video_url && (
            <div className="space-y-4">
              <RecipeVideoPlayer url={recipe.video_url} />
              <p className="text-xs text-[rgb(var(--muted))] text-center">
                Video tutorial za recept{" "}
                <span className="text-[rgb(var(--foreground))] font-medium">{recipe.title}</span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
