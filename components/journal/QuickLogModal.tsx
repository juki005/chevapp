"use client";

// ── QuickLogModal ──────────────────────────────────────────────────────────────
// Lightweight modal fired from RestaurantCard / RestaurantDetailModal.
// Restaurant name / city / style / google_place_id are pre-filled.
// User only picks a rating and optionally types a note.
// Writes directly to user_journal, handles auth gate and success state.
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

  // Derive the style tint for the modal header
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
        Desktop → max-w-sm centred card, rounded-2xl
      */}
      <div
        className={cn(
          "w-full bg-[rgb(var(--surface))] shadow-2xl overflow-hidden",
          "animate-in fade-in slide-in-from-bottom-4 duration-250",
          // Mobile: bottom sheet
          "rounded-t-3xl border-t border-x border-[rgb(var(--border))]",
          // Desktop: floating card
          "sm:max-w-sm sm:rounded-2xl sm:border sm:border-[rgb(var(--border))]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* ── Drag handle (mobile only) ───────────────────────────────────── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[rgb(var(--border))]" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[rgb(var(--primary))]" />
            <span
              className="font-bold text-sm text-[rgb(var(--foreground))] uppercase tracking-wide"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              Zabilježi Posjetu
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Restaurant info strip ───────────────────────────────────────── */}
        <div className="px-5 py-3 bg-[rgb(var(--surface)/0.4)] border-b border-[rgb(var(--border)/0.5)]">
          <div className="flex items-center gap-2">
            <p
              className="font-bold text-[rgb(var(--foreground))] leading-tight"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {restaurant.name}
            </p>
            {restaurant.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-[rgb(var(--primary))] flex-shrink-0" />
            )}
          </div>
          <p className="text-xs mt-0.5">
            <span className="text-[rgb(var(--muted))]">{restaurant.city}</span>
            <span className="text-[rgb(var(--muted))]"> · </span>
            <span className={cn("font-medium", styleColor)}>{restaurant.style ?? "Ostalo"}</span>
          </p>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-4">

          {authChecking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[rgb(var(--muted))]" />
            </div>

          ) : !userId ? (
            /* Auth gate */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--primary)/0.1)] flex items-center justify-center">
                <LogIn className="w-6 h-6 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--foreground))] mb-1">
                  Prijava potrebna
                </p>
                <p className="text-xs text-[rgb(var(--muted))] max-w-xs">
                  Prijavi se da spasiš posjetu u svoj gastro dnevnik.
                </p>
              </div>
              <a
                href="/auth"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                Prijava
              </a>
            </div>

          ) : saved ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p
                  className="font-bold text-[rgb(var(--foreground))] text-lg"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  Zapisano! ✓
                </p>
                <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                  {restaurant.name} je dodan u tvoj dnevnik.
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* Rating */}
              <div>
                <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
                  Ocjena posjete
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      title={FLAME_LABELS[n]}
                      className={cn(
                        "w-10 h-10 rounded-xl text-lg border transition-all",
                        rating >= n
                          ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.15)] scale-105"
                          : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary)/0.3)] hover:scale-105"
                      )}
                    >
                      🔥
                    </button>
                  ))}
                  <span className="text-xs text-[rgb(var(--muted))] ml-1">{FLAME_LABELS[rating]}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
                  Bilješka <span className="normal-case opacity-60">(opciono)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Kako je bilo? Šta si naručio/la? Gužva?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-sm placeholder:text-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none"
                />
              </div>

              {saveError && (
                <p className="text-xs text-red-400">{saveError}</p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!authChecking && userId && !saved && (
          <div className="px-5 pb-5 pt-1 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-[14px] border border-[rgb(var(--border))] text-[rgb(var(--muted))] text-sm font-medium hover:text-[rgb(var(--foreground))] transition-colors"
            >
              Odustani
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:bg-[rgb(var(--primary)/0.85)] active:scale-[0.97] transition-all disabled:opacity-50"
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
