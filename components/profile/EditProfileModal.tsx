"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, CheckCircle, User, Upload, ImagePlus } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { getRank } from "@/lib/gamification";
import { createClient } from "@/lib/supabase/client";
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
  userId?:        string | null;
  onSaved: (updates: { username: string; avatar_url: string | null; favorite_style: CevapStyle | null }) => void;
}

const GENDER_OPTIONS = [
  { value: "",       label: "— Nije odabrano —" },
  { value: "male",   label: "Muško" },
  { value: "female", label: "Žensko" },
  { value: "other",  label: "Ostalo" },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function isImageUrl(val: string | null): boolean {
  return !!val && (val.startsWith("http://") || val.startsWith("https://"));
}

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
  userId,
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

  // Avatar mode: emoji picker vs photo upload
  const [avatarMode,     setAvatarMode]     = useState<"emoji" | "upload">(
    isImageUrl(currentAvatar) ? "upload" : "emoji"
  );
  const [uploadLoading,  setUploadLoading]  = useState(false);
  const [uploadError,    setUploadError]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAvatarMode(isImageUrl(currentAvatar) ? "upload" : "emoji");
      setError(null);
      setUploadError(null);
      setSaved(false);
    }
  }, [isOpen, currentName, currentAvatar, currentStyle, currentBio, currentGender, currentWeight, currentHeight]);

  const t = useTranslations("profile");

  if (!isOpen) return null;

  const rank = getRank(currentXP);

  const handleClose = () => {
    if (!loading && !uploadLoading) onClose();
  };

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setUploadError("Slika je prevelika. Maksimalna veličina je 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Odabrana datoteka nije slika.");
      return;
    }

    setUploadError(null);
    setUploadLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      // Resolve userId from auth if not passed as prop
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id ?? null;
      }
      if (!uid) throw new Error("Nisi prijavljen/a.");

      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setSelectedAvatar(urlData.publicUrl as string);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Greška pri učitavanju slike.";
      setUploadError(msg);
    } finally {
      setUploadLoading(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleModeSwitch = (mode: "emoji" | "upload") => {
    setAvatarMode(mode);
    setUploadError(null);
    // When switching to emoji mode, clear any image URL (and vice versa)
    if (mode === "emoji" && isImageUrl(selectedAvatar)) {
      setSelectedAvatar(null);
    }
    if (mode === "upload" && !isImageUrl(selectedAvatar)) {
      setSelectedAvatar(null);
    }
  };

  // ── Form submit ─────────────────────────────────────────────────────────────
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

  // ── Success state ───────────────────────────────────────────────────────────
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

      <div className="relative w-full max-w-md bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[rgb(var(--border))] flex-shrink-0">
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

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* ── Avatar section ── */}
          <div>
            <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-3">
              Avatar
            </label>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-[rgb(var(--border))] overflow-hidden mb-3 text-sm font-medium">
              <button
                type="button"
                onClick={() => handleModeSwitch("emoji")}
                className={cn(
                  "flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors",
                  avatarMode === "emoji"
                    ? "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                )}
              >
                🎭 Emoji
              </button>
              <div className="w-px bg-[rgb(var(--border))]" />
              <button
                type="button"
                onClick={() => handleModeSwitch("upload")}
                className={cn(
                  "flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors",
                  avatarMode === "upload"
                    ? "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                )}
              >
                <ImagePlus className="w-3.5 h-3.5" /> Slika
              </button>
            </div>

            {/* ── Emoji picker ── */}
            {avatarMode === "emoji" && (
              <div className="grid grid-cols-9 gap-2">
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
                {/* No avatar */}
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
            )}

            {/* ── Photo upload ── */}
            {avatarMode === "upload" && (
              <div className="space-y-3">
                {/* Preview / drop zone */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className={cn(
                    "w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
                    uploadLoading
                      ? "border-[rgb(var(--border))] opacity-60 cursor-not-allowed"
                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.04)]"
                  )}
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-[rgb(var(--primary))]" />
                      <span className="text-xs text-[rgb(var(--muted))]">Učitavanje…</span>
                    </>
                  ) : isImageUrl(selectedAvatar) ? (
                    // Show current photo preview
                    <div className="relative w-full h-full rounded-2xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedAvatar!}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        <Upload className="w-5 h-5 text-white" />
                        <span className="text-xs text-white font-medium">Zamijeni sliku</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.1)] flex items-center justify-center">
                        <Upload className="w-5 h-5 text-[rgb(var(--primary))]" />
                      </div>
                      <span className="text-sm font-medium text-[rgb(var(--foreground)/0.8)]">
                        Odaberi fotografiju
                      </span>
                      <span className="text-xs text-[rgb(var(--muted))]">
                        JPG, PNG, WEBP · max 5 MB
                      </span>
                    </>
                  )}
                </button>

                {/* Remove photo link (only if an image is selected) */}
                {isImageUrl(selectedAvatar) && !uploadLoading && (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(null)}
                    className="text-xs text-[rgb(var(--muted))] hover:text-red-400 transition-colors mx-auto block"
                  >
                    Ukloni sliku
                  </button>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Upload error */}
                {uploadError && (
                  <p className="text-xs text-red-400 text-center">{uploadError}</p>
                )}
              </div>
            )}
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
              placeholder="Kratko o sebi… npr. Sarajlija, ljubitelj Sarajevskog stila, tražim savršeni ćevap."
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
              disabled={loading || uploadLoading || !username.trim()}
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
