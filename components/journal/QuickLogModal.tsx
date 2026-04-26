"use client";

// ── QuickLogModal · journal (Sprint 26x · DS-migrated) ────────────────────────
// Lightweight modal fired from RestaurantCard / RestaurantDetailModal.
// Restaurant name / city / style / google_place_id are pre-filled.
// User only picks a rating and optionally types a note.
// Writes directly to user_journal, handles auth gate and success state.
//
// Sprint 26x changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - 3× style={{fontFamily:"Oswald"}} → font-display class.
//   - Per-style colour tints (Sarajevski/Banjalučki/Travnički/Leskovački/
//     Ostalo) kept as plain Tailwind palette — categorical content markers
//     exception. Same precedent as RestaurantCard per-style palette and
//     CmsTab event tags. The DS only has 5 semantic colour tokens and 4 are
//     role-locked, so 5 mutually-distinct cevap-style hues need to live
//     outside DS chrome rules.
//   - Save success state: bg-emerald-500/15 + text-emerald-400 →
//     bg-ember-green/15 + text-ember-green (DS confirm token).
//   - Save CTA hover:bg-primary/0.85 → hover:bg-vatra-hover (DS rule —
//     explicit hover token, not opacity-fade).
//   - Save CTA + Auth-gate CTA text-white → text-primary-fg (semantic).
//   - Auth-gate "Prijava" hover:opacity-90 → hover:bg-vatra-hover.
//   - saveError text-red-400 → text-zar-red (DS alert).
//   - 🔥 rating buttons tagged TODO(icons) + aria-hidden — Sprint 27 swap
//     for brand <Vatra> SVG (5-flame rating widget).
//   - rounded-3xl mobile bottom-sheet kept (24px — intentional drawer
//     treatment, same precedent as RecipeModal Sprint 26t).
//   - rounded-2xl desktop card → rounded-card; rounded-xl/lg → rounded-chip.
//   - rounded-[14px] footer buttons → rounded-chip (closest DS scale,
//     2px delta imperceptible).
//   - shadow-2xl → shadow-soft-xl.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { BookOpen, X, CheckCircle, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

export interface QuickLogModalProps {
  restaurant: Restaurant | null;
  onClose:    () => void;
  /** Called with the restaurant.id after a successful save */
  onSaved?:   (restaurantId: string) => void;
}

const FLAME_LABELS = ["", "Slabo", "Dobro", "Odlično", "Izvrsno", "Savršeno"];

export function QuickLogModal({ restaurant, onClose, onSaved }: QuickLogModalProps) {
  const supabase = createClient();

  const [userId,       setUserId]       = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [rating,       setRating]       = useState(4);
  const [note,         setNote]         = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState("");

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setAuthChecking(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset form when restaurant changes
  useEffect(() => {
    setRating(4); setNote(""); setSaved(false); setSaveError("");
  }, [restaurant?.id]);

  if (!restaurant) return null;

  const handleSave = async () => {
    if (!userId || saving || saved) return;
    setSaving(true);
    setSaveError("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("user_journal") as any).insert({
        user_id:         userId,
        restaurant_name: restaurant.name,
        city:            restaurant.city,
        style:           restaurant.style ?? "Ostalo",
        rating,
        note:            note.trim() || null,
        visit_date:      new Date().toISOString().split("T")[0],
        google_place_id: restaurant.google_place_id ?? null,
        // Entries logged from our verified DB are always "verified"
        is_verified: true,
      });

      if (error) {
        console.error("[quick-log] insert error:", error);
        setSaveError("Greška pri spremanju. Pokušaj ponovo.");
        return;
      }

      setSaved(true);
      onSaved?.(restaurant.id);
      // Auto-close after showing success
      setTimeout(() => { onClose(); }, 1800);
    } catch (err) {
      console.error("[quick-log] exception:", err);
      setSaveError("Neočekivana greška. Pokušaj ponovo.");
    } finally {
      setSaving(false);
    }
  };

  // Per-style colour tints — categorical content markers exception
  // (see header comment). Same precedent as RestaurantCard per-style palette.
  const styleTints: Record<string, string> = {
    Sarajevski:   "text-amber-400",
    "Banjalučki": "text-blue-400",
    "Travnički":  "text-emerald-400",
    "Leskovački": "text-red-400",
    Ostalo:       "text-orange-400",
  };
  const styleColor = styleTints[restaurant.style ?? ""] ?? "text-orange-400";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
        Mobile  → full-width, snapped to bottom, rounded-t-3xl (bottom sheet)
        Desktop → max-w-sm centred card, rounded-card
      */}
      <div
        className={cn(
          "w-full bg-surface shadow-soft-xl overflow-hidden",
          "animate-in fade-in slide-in-from-bottom-4 duration-250",
          // Mobile: bottom sheet
          "rounded-t-3xl border-t border-x border-border",
          // Desktop: floating card
          "sm:max-w-sm sm:rounded-card sm:border sm:border-border",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* ── Drag handle (mobile only) ───────────────────────────────────── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-sm text-foreground uppercase tracking-wide">
              Zabilježi Posjetu
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-chip text-muted hover:text-foreground hover:bg-border/50 transition-colors"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Restaurant info strip ───────────────────────────────────────── */}
        <div className="px-5 py-3 bg-surface/40 border-b border-border/50">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-foreground leading-tight">
              {restaurant.name}
            </p>
            {restaurant.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs mt-0.5">
            <span className="text-muted">{restaurant.city}</span>
            <span className="text-muted"> · </span>
            <span className={cn("font-medium", styleColor)}>{restaurant.style ?? "Ostalo"}</span>
          </p>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-4">

          {authChecking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>

          ) : !userId ? (
            /* Auth gate */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-card bg-primary/10 flex items-center justify-center">
                <LogIn className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Prijava potrebna
                </p>
                <p className="text-xs text-muted max-w-xs">
                  Prijavi se da spasiš posjetu u svoj gastro dnevnik.
                </p>
              </div>
              <a
                href="/auth"
                className="flex items-center gap-2 px-5 py-2.5 rounded-chip bg-primary text-primary-fg text-sm font-semibold hover:bg-vatra-hover transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Prijava
              </a>
            </div>

          ) : saved ? (
            /* Success state — ember-green confirm token */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-card bg-ember-green/15 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-ember-green" />
              </div>
              <div>
                <p className="font-display font-bold text-foreground text-lg">
                  Zapisano! ✓
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {restaurant.name} je dodan u tvoj dnevnik.
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* Rating */}
              <div>
                <label className="text-xs text-muted uppercase tracking-widest font-medium block mb-2">
                  Ocjena posjete
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      title={FLAME_LABELS[n]}
                      aria-label={`Ocjena ${n} - ${FLAME_LABELS[n]}`}
                      className={cn(
                        "w-10 h-10 rounded-chip text-lg border transition-all",
                        rating >= n
                          ? "border-primary/50 bg-primary/15 scale-105"
                          : "border-border text-muted hover:border-primary/30 hover:scale-105"
                      )}
                    >
                      {/* TODO(icons): swap 🔥 for brand <Vatra> SVG */}
                      <span aria-hidden="true">🔥</span>
                    </button>
                  ))}
                  <span className="text-xs text-muted ml-1">{FLAME_LABELS[rating]}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted uppercase tracking-widest font-medium block mb-2">
                  Bilješka <span className="normal-case opacity-60">(opciono)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Kako je bilo? Šta si naručio/la? Gužva?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-chip border border-border bg-surface/50 text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/50 transition-colors resize-none"
                />
              </div>

              {saveError && (
                <p className="text-xs text-zar-red">{saveError}</p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!authChecking && userId && !saved && (
          <div className="px-5 pb-5 pt-1 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-chip border border-border text-muted text-sm font-medium hover:text-foreground transition-colors"
            >
              Odustani
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-chip bg-primary text-primary-fg text-sm font-semibold hover:bg-vatra-hover active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sprema se…</>
                : <><CheckCircle className="w-3.5 h-3.5" /> Spremi unos</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
