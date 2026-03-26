"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, CheckCircle, User } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { getRank } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import type { CevapStyle } from "@/types/database";

const AVATARS = ["🥩", "🍖", "🌯", "👨‍🍳", "🧅", "🧈", "🔥", "🫑"];

const STYLE_OPTIONS: { value: CevapStyle | ""; label: string }[] = [
  { value: "",            label: "— Nije odabrano —" },
  { value: "Sarajevski",  label: "Sarajevski" },
  { value: "Banjalučki",  label: "Banjalučki" },
  { value: "Travnički",   label: "Travnički" },
  { value: "Leskovački",  label: "Leskovački" },
  { value: "Ostalo",      label: "Ostalo" },
];

export interface EditProfileModalProps {
  isOpen:         boolean;
  onClose:        () => void;
  currentName:    string;
  currentAvatar:  string | null;
  currentStyle:   CevapStyle | null;
  currentXP:      number;
  currentBio?:    string | null;
  currentGender?: string | null;
  currentWeight?: number | null;
  currentHeight?: number | null;
  onSaved: (updates: { username: string; avatar_url: string | null; favorite_style: CevapStyle | null }) => void;
}

const GENDER_OPTIONS = [
  { value: "",       label: "— Nije odabrano —" },
  { value: "male",   label: "Muško" },
  { value: "female", label: "Žensko" },
  { value: "other",  label: "Ostalo" },
];

export function EditProfileModal({
  isOpen,
  onClose,
  currentName,
  currentAvatar,
  currentStyle,
  currentXP,
  currentBio,
  currentGender,
  currentWeight,
  currentHeight,
  onSaved,
}: EditProfileModalProps) {
  const [username,       setUsername]       = useState(currentName);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar);
  const [favoriteStyle,  setFavoriteStyle]  = useState<CevapStyle | "">(currentStyle ?? "");
  const [bio,            setBio]            = useState(currentBio ?? "");
  const [gender,         setGender]         = useState(currentGender ?? "");
  const [weightKg,       setWeightKg]       = useState<string>(currentWeight != null ? String(currentWeight) : "");
  const [heightCm,       setHeightCm]       = useState<string>(currentHeight != null ? String(currentHeight) : "");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [saved,          setSaved]          = useState(false);

  // Sync props → state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(currentName);
      setSelectedAvatar(currentAvatar);
      setFavoriteStyle(currentStyle ?? "");
      setBio(currentBio ?? "");
      setGender(currentGender ?? "");
      setWeightKg(currentWeight != null ? String(currentWeight) : "");
      setHeightCm(currentHeight != null ? String(currentHeight) : "");
      setError(null);
      setSaved(false);
    }
  }, [isOpen, currentName, currentAvatar, currentStyle, currentBio, currentGender, currentWeight, currentHeight]);

  const t = useTranslations("profile");

  if (!isOpen) return null;

  const rank = getRank(currentXP);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await updateProfile({
      username,
      avatar_url:     selectedAvatar,
      favorite_style: favoriteStyle || null,
      bio:            bio.trim() || null,
      gender:         gender || null,
      weight_kg:      weightKg !== "" ? parseFloat(weightKg) : null,
      height_cm:      heightCm !== "" ? parseInt(heightCm, 10) : null,
    });

    if (!result.success) {
      setError(result.error ?? "Greška pri spremanju.");
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);

    onSaved({
      username,
      avatar_url:     selectedAvatar,
      favorite_style: favoriteStyle || null,
    });

    // Auto-close after short delay
    setTimeout(() => { onClose(); }, 1200);
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2
            className="text-2xl font-bold text-[rgb(var(--foreground))] mb-1"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {t("profileUpdated")}
          </h2>
          <p className="text-sm text-[rgb(var(--muted))]">{t("changesSaved")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                className="text-xl font-bold text-[rgb(var(--foreground))]"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                Uredi profil
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[rgb(var(--muted))]">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", rank.bg, rank.color, "border-current/30")}>
                  {rank.emoji} {rank.title}
                </span>
                <span>·</span>
                <span>{currentXP.toLocaleString()} XP</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Avatar picker */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              Avatar
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji === selectedAvatar ? null : emoji)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-2xl flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95",
                    selectedAvatar === emoji
                      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.12)] scale-110"
                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)]"
                  )}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
              {/* No avatar option */}
              <button
                type="button"
                onClick={() => setSelectedAvatar(null)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                  selectedAvatar === null
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.12)]"
                    : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)]"
                )}
                aria-label="Bez avatara"
              >
                <User className="w-4 h-4 text-[rgb(var(--muted))]" />
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
              Korisničko ime
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              placeholder="npr. grill_majstor"
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
            />
            <p className="text-right text-xs text-[rgb(var(--muted))] mt-1">{username.length}/30</p>
          </div>

          {/* Favorite style */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
              Omiljeni stil ćevapa
            </label>
            <select
              value={favoriteStyle}
              onChange={(e) => setFavoriteStyle(e.target.value as CevapStyle | "")}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
            >
              {STYLE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Kratko o sebi... npr. Sarajlija, ljubitelj Sarajevskog stila, tražim savršeni ćevap."
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none"
            />
            <p className="text-right text-xs text-[rgb(var(--muted))] mt-1">{bio.length}/200</p>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
              Spol
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
            >
              {GENDER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Weight + Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
                Težina (kg)
              </label>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="75"
                className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-2">
                Visina (cm)
              </label>
              <input
                type="number"
                min={100}
                max={250}
                step={1}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="180"
                className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
              />
            </div>
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
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors disabled:opacity-40"
            >
              Odustani
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Sprema…" : "Spremi promjene"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
