"use client";

import { useState } from "react";
import { X, Flame, Loader2, CheckCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/gamification";
import { recordUserActivity } from "@/lib/actions/activity";
import { cn } from "@/lib/utils";

export interface ReviewRestaurant {
  id:    string;
  name:  string;
  city:  string;
  style: string;
}

interface SubmitReviewModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  restaurant:  ReviewRestaurant | null;
  onSuccess?:  (rating: number) => void;
}

const TOGGLES: { key: "with_onion" | "with_kajmak" | "with_ajvar"; label: string; emoji: string }[] = [
  { key: "with_onion",  label: "S lukom",   emoji: "🧅" },
  { key: "with_kajmak", label: "S kajmakom", emoji: "🧈" },
  { key: "with_ajvar",  label: "S ajvarom",  emoji: "🫑" },
];

export function SubmitReviewModal({ isOpen, onClose, restaurant, onSuccess }: SubmitReviewModalProps) {
  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [toggles,     setToggles]     = useState({ with_onion: false, with_kajmak: false, with_ajvar: false });
  const [comment,     setComment]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [xpAwarded,   setXpAwarded]   = useState(0);

  if (!isOpen || !restaurant) return null;

  const reset = () => {
    setRating(0); setHovered(0);
    setToggles({ with_onion: false, with_kajmak: false, with_ajvar: false });
    setComment(""); setError(null); setSubmitted(false); setXpAwarded(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleChip = (key: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Odaberi ocjenu (1–5 plamena)."); return; }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Moraš biti prijavljen/a da ostaviš recenziju.");
      setLoading(false);
      return;
    }

    // Upsert review (unique per user × restaurant)
    const { error: dbError } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id:       user.id,
          restaurant_id: restaurant.id,
          rating,
          with_onion:    toggles.with_onion,
          with_kajmak:   toggles.with_kajmak,
          with_ajvar:    toggles.with_ajvar,
          comment:       comment.trim() || null,
        },
        { onConflict: "user_id,restaurant_id" }
      );

    if (dbError) {
      setError("Greška pri spremanju recenzije. Pokušaj ponovo.");
      setLoading(false);
      return;
    }

    // Award +100 XP and update profiles.updated_at via awardXP
    const result = await awardXP(user.id, 100, supabase);
    const earned = result ? 100 : 0;
    setXpAwarded(earned);

    // Dispatch event so AcademyDashboard / ProfilePage update live
    window.dispatchEvent(
      new CustomEvent("chevapp:stats_updated", {
        detail: { xpAdded: earned, newStats: result?.stats },
      })
    );

    // Record daily activity + streak (fire & forget)
    recordUserActivity("REVIEW").then((activity) => {
      if (activity.isFirstActivityToday) {
        window.dispatchEvent(new CustomEvent("chevapp:stats_updated", {
          detail: { activityBonus: activity.bonusXP, newStreak: activity.newStreak },
        }));
      }
    }).catch(() => {});

    setSubmitted(true);
    setLoading(false);
    onSuccess?.(rating);
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-1"
            style={{ fontFamily: "Oswald, sans-serif" }}>
            Recenzija spremljena!
          </h2>
          <p className="text-[rgb(var(--muted))] text-sm mb-3">
            Hvala na recenziji za{" "}
            <span className="text-[rgb(var(--foreground))] font-semibold">{restaurant.name}</span>.
          </p>
          {xpAwarded > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgb(var(--primary)/0.1)] border border-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary))] text-sm font-bold mb-5">
              <Flame className="w-4 h-4" />
              +{xpAwarded} XP zarađeno!
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Zatvori
          </button>
        </div>
      </div>
    );
  }

  const displayRating = hovered || rating;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[rgb(var(--foreground))]"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Ostavi recenziju
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[rgb(var(--muted))]">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-medium text-[rgb(var(--foreground)/0.8)]">{restaurant.name}</span>
                <span>·</span>
                <span>{restaurant.city}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Flame rating */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              Ocjena
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${n} plamena`}
                >
                  {n <= displayRating ? "🔥" : "🩶"}
                </button>
              ))}
              {displayRating > 0 && (
                <span className="ml-2 text-sm text-[rgb(var(--primary))] font-semibold">
                  {["", "Slabo", "Može biti", "Dobro", "Odlično", "Savršeno!"][displayRating]}
                </span>
              )}
            </div>
          </div>

          {/* Quick toggles */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              Naručio/la sam
            </label>
            <div className="flex flex-wrap gap-2">
              {TOGGLES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleChip(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                    toggles[key]
                      ? "border-[rgb(var(--primary)/0.6)] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--border))]"
                  )}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
              Komentar <span className="normal-case">(nije obavezno)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Kako je bilo? Savjet za buduće posjetitelje..."
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none"
            />
            <p className="text-right text-xs text-[rgb(var(--muted))] mt-1">{comment.length}/280</p>
          </div>

          {/* XP reminder */}
          <div className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary)/0.06)] border border-[rgb(var(--primary)/0.2)] px-4 py-2.5">
            <Flame className="w-4 h-4 text-[rgb(var(--primary))] flex-shrink-0" />
            <p className="text-xs text-[rgb(var(--muted))]">
              Recenzija donosi <span className="text-[rgb(var(--primary))] font-bold">+100 XP</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
            >
              Odustani
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Sprema…" : "Pošalji recenziju"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
