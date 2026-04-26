"use client";

// ── RecipeModal · kitchen (Sprint 26t · DS-migrated) ──────────────────────────
// Recipe detail modal with ingredients/steps/tips/video tabs. Bottom-sheet
// on mobile, centered card on desktop.
//
// Sprint 26t changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on recipe title → font-display.
//   - DIFFICULTY_COLOR map remapped to DS semantic tokens:
//       easy   green-400 family  → ember-green family (confirm)
//       medium amber-400 family  → amber-xp family    (passive tier marker
//                                                       — chip is a static
//                                                       badge, not a button.
//                                                       DS rule "amber on
//                                                       buttons forbidden"
//                                                       allows tier readouts)
//       hard   red-400 family    → zar-red family     (alert/challenge)
//   - Tab labels: refactored label: string → label: React.ReactNode so the
//     leading emoji (🧂 / 👨‍🍳 / 💡 / ▶️) can carry aria-hidden + TODO(icons).
//   - All-ingredients-collected celebration green-400 family → ember-green
//     family. ✅ char swapped for <CheckCircle> Lucide (already imported).
//   - YouTube fallback ▶️ swapped for <PlayCircle> Lucide (DS interim icon
//     policy prefers Lucide where available); link text-red-400 →
//     text-zar-red (DS alert; styled as "open external" affordance).
//   - 🎉 / 🔥 / 🔑 / ⚡ / 🌡️ / 💪 emoji tagged TODO(icons) + aria-hidden —
//     content-adjacent decorative markers, Sprint 27.
//   - Step-number active fill bg-primary + text-white → bg-primary +
//     text-primary-fg (semantic).
//   - rounded-2xl modal → rounded-card; rounded-xl/lg → rounded-chip.
//   - rounded-t-3xl bottom-sheet kept (24px — intentionally larger than the
//     20px rounded-card scale for the drawer feel; DS doesn't define a
//     "drawer" radius token yet).
//   - shadow-2xl → shadow-soft-xl.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  X, Clock, Users, ChefHat, Share2, CheckCircle, Circle, PlayCircle,
} from "lucide-react";
import type { Recipe } from "@/constants/recipes";
import { RecipeVideoPlayer } from "./RecipeVideoPlayer";
import { cn } from "@/lib/utils";

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

type Tab = "ingredients" | "steps" | "tips" | "video";

const DIFFICULTY_LABEL: Record<Recipe["difficulty"], string> = {
  easy:   "Lako",
  medium: "Srednje",
  hard:   "Teško",
};

// DS semantic mapping — easy/medium/hard align with confirm / passive-tier /
// alert. medium uses amber-xp because the chip is a passive readout (not a
// button), which is allowed under DS gamification rules.
const DIFFICULTY_COLOR: Record<Recipe["difficulty"], string> = {
  easy:   "text-ember-green bg-ember-green/10 border-ember-green/30",
  medium: "text-amber-xp    bg-amber-xp/10    border-amber-xp/30",
  hard:   "text-zar-red     bg-zar-red/10     border-zar-red/30",
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

  // Tab labels — leading emoji wrapped in aria-hidden span + TODO(icons)
  // tag for the Sprint 27 brand-icon swap.
  const tabs: { key: Tab; label: React.ReactNode }[] = [
    /* TODO(icons): swap 🧂 for brand <Sastojci> */
    { key: "ingredients", label: <><span aria-hidden="true">🧂</span> Sastojci</> },
    /* TODO(icons): swap 👨‍🍳 for brand <Chef> */
    { key: "steps",       label: <><span aria-hidden="true">👨‍🍳</span> Priprema</> },
    /* TODO(icons): swap 💡 for brand <Tip> */
    { key: "tips",        label: <><span aria-hidden="true">💡</span> Savjeti</> },
    ...(recipe.video_url
      /* TODO(icons): swap ▶️ for brand <Play> */
      ? [{ key: "video" as Tab, label: <><span aria-hidden="true">▶️</span> Video</> }]
      : []),
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

      {/* Modal — rounded-t-3xl is the drawer treatment on mobile (24px,
          intentionally larger than rounded-card 20px); desktop falls back
          to standard rounded-card. */}
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-card bg-surface border border-border shadow-soft-xl overflow-hidden">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* recipe.emoji is content from DB (not chrome) — kept as-is */}
            <span className="text-4xl flex-shrink-0" aria-hidden="true">{recipe.emoji}</span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground leading-tight truncate">
                {recipe.title}
              </h2>
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{recipe.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={handleShare}
              aria-label="Podijeli recept"
              className="p-2 rounded-chip border border-border text-muted hover:text-foreground transition-colors"
              title="Podijeli recept"
            >
              {shared ? <CheckCircle className="w-4 h-4 text-ember-green" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Zatvori"
              className="p-2 rounded-chip border border-border text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>Priprema: <strong className="text-foreground">{recipe.prepTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kuhanje: <strong className="text-foreground">{recipe.cookTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{recipe.servings}</strong> osobe</span>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", DIFFICULTY_COLOR[recipe.difficulty])}>
            {DIFFICULTY_LABEL[recipe.difficulty]}
          </span>

          {/* Progress bar (steps) */}
          {checkedSteps.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted">{progress}%</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 gap-1 pt-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-t-chip transition-all border-b-2",
                activeTab === key
                  ? "text-primary border-primary bg-primary/10"
                  : "text-muted border-transparent hover:text-foreground"
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
              <p className="text-xs text-muted mb-3">
                Klikni na sastojak da ga označiš ✓
              </p>
              {recipe.ingredients.map((ing, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleIngredient(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-chip border transition-all text-left",
                    checkedIngredients.has(idx)
                      ? "border-primary/40 bg-primary/10 opacity-60"
                      : "border-border bg-surface/50 hover:border-primary/30"
                  )}
                >
                  {checkedIngredients.has(idx)
                    ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-border flex-shrink-0" />
                  }
                  <span className={cn(
                    "text-sm font-semibold flex-shrink-0 min-w-[80px]",
                    checkedIngredients.has(idx) ? "line-through text-muted" : "text-primary"
                  )}>
                    {ing.amount}
                  </span>
                  <span className={cn(
                    "text-sm",
                    checkedIngredients.has(idx) ? "line-through text-muted" : "text-foreground"
                  )}>
                    {ing.item}
                  </span>
                </button>
              ))}

              {checkedIngredients.size === recipe.ingredients.length && recipe.ingredients.length > 0 && (
                <div className="mt-4 p-3 rounded-chip bg-ember-green/10 border border-ember-green/30 text-center">
                  <p className="text-ember-green text-sm font-medium inline-flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Svi sastojci prikupljeni — krenimo kuhati!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEPS TAB */}
          {activeTab === "steps" && (
            <div className="space-y-3">
              <p className="text-xs text-muted mb-3">
                {/* TODO(icons): swap 🔥 for brand <Vatra> */}
                Klikni na korak kad je gotov <span aria-hidden="true">🔥</span>
              </p>
              {recipe.steps.map(({ step, text }) => (
                <button
                  key={step}
                  onClick={() => toggleStep(step)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 rounded-chip border transition-all text-left",
                    checkedSteps.has(step)
                      ? "border-primary/40 bg-primary/10 opacity-70"
                      : "border-border bg-surface/50 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    checkedSteps.has(step)
                      ? "bg-primary text-primary-fg"
                      : "bg-border text-muted"
                  )}>
                    {checkedSteps.has(step) ? "✓" : step}
                  </div>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    checkedSteps.has(step) ? "line-through text-muted" : "text-foreground"
                  )}>
                    {text}
                  </p>
                </button>
              ))}

              {checkedSteps.size === recipe.steps.length && recipe.steps.length > 0 && (
                <div className="mt-4 p-4 rounded-chip bg-primary/10 border border-primary/30 text-center">
                  {/* TODO(icons): swap 🎉 for brand <Sparkle> */}
                  <p className="text-2xl mb-1" aria-hidden="true">🎉</p>
                  <p className="text-primary font-bold">Recept završen!</p>
                  <p className="text-muted text-xs mt-1">Dobar tek! Uživaj u svom obroku.</p>
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
                  className="flex gap-3 p-3 rounded-chip border border-border bg-surface/50"
                >
                  {/* TODO(icons): swap 🔑 ⚡ 🌡️ 💪 for brand tip-prefix glyphs */}
                  <span className="text-lg flex-shrink-0" aria-hidden="true">
                    {idx === 0 ? "🔑" : idx === 1 ? "⚡" : idx === 2 ? "🌡️" : "💪"}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                </div>
              ))}

              {/* Video: embedded player if available, otherwise YouTube search link */}
              {recipe.video_url ? (
                <div className="mt-4">
                  <p className="text-xs text-muted mb-2 uppercase tracking-widest font-medium">Video tutorial</p>
                  <RecipeVideoPlayer url={recipe.video_url} />
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-chip border border-border bg-surface/30">
                  <p className="text-xs text-muted mb-2 uppercase tracking-widest font-medium">Video tutorial</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.youtubeQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-zar-red hover:text-zar-red/80 transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span>Pogledaj na YouTubeu →</span>
                  </a>
                  <p className="text-xs text-muted mt-1 opacity-60">{recipe.youtubeQuery}</p>
                </div>
              )}
            </div>
          )}
          {/* VIDEO TAB */}
          {activeTab === "video" && recipe.video_url && (
            <div className="space-y-4">
              <RecipeVideoPlayer url={recipe.video_url} />
              <p className="text-xs text-muted text-center">
                Video tutorial za recept{" "}
                <span className="text-foreground font-medium">{recipe.title}</span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
