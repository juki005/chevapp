"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReviewModal
// Meat + bread 5-star rating, comment, optional photo upload.
// • Auto-loads caller's existing review (edit mode) via getMyReviewForPlace
// • Compresses photo client-side with compressImage() before upload
// • Uploads to user_photos bucket at {uid}/{placeId}/{uuid}.{ext}
// • Submits via submitReview server action (upsert on user_id+place_id)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Star, Camera, Loader2, Trash2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, makePhotoPath } from "@/lib/utils/imageCompression";
import {
  submitReview,
  deleteReview,
  getMyReviewForPlace,
  type PlaceReview,
} from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

const BUCKET = "user_photos";

interface Props {
  placeId:    string;
  placeName:  string;
  onClose:    () => void;
  onSubmitted?: () => void;
}

export function ReviewModal({ placeId, placeName, onClose, onSubmitted }: Props) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [ratingMeat,  setRatingMeat]  = useState(0);
  const [ratingBread, setRatingBread] = useState(0);
  const [comment,     setComment]     = useState("");
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoPreview,setPhotoPreview]= useState<string | null>(null); // object URL for preview OR existing photo_url
  const [existingUrl, setExistingUrl] = useState<string | null>(null);

  // ── Flow state ────────────────────────────────────────────────────────────
  const [mounted,     setMounted]     = useState(false);
  const [loading,     setLoading]     = useState(true);   // initial "do I have a review?" fetch
  const [submitting,  setSubmitting]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [existing,    setExisting]    = useState<PlaceReview | null>(null);
  const [done,        setDone]        = useState(false);

  // ── Portal mount ──────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Load caller + existing review ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: { user } } = await (supabase.auth.getUser() as any);
      if (cancelled) return;

      if (!user) {
        setError("Moraš biti prijavljen/a da ostaviš recenziju.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const mine = await getMyReviewForPlace(placeId);
      if (cancelled) return;

      if (mine) {
        setExisting(mine);
        setRatingMeat(mine.rating_meat);
        setRatingBread(mine.rating_bread);
        setComment(mine.comment ?? "");
        if (mine.photo_url) {
          setPhotoPreview(mine.photo_url);
          setExistingUrl(mine.photo_url);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  // ── File picker → preview ─────────────────────────────────────────────────
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      setError("Datoteka mora biti slika.");
      return;
    }
    // Revoke previous object URL to avoid leaks
    if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);

    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setExistingUrl(null);        // replacing any existing photo
    setError(null);
  }

  function clearPhoto() {
    if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);

    if (ratingMeat < 1)  { setError("Odaberi ocjenu mesa.");   return; }
    if (ratingBread < 1) { setError("Odaberi ocjenu somuna."); return; }
    if (!userId)         { setError("Nisi prijavljen/a.");     return; }

    setSubmitting(true);

    try {
      // Step 1 — upload photo if a new file was chosen
      let photoUrl: string | null = existingUrl;
      if (photoFile) {
        setUploading(true);
        const { file } = await compressImage(photoFile);
        const path = makePhotoPath({ userId, placeId, file });

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (uploadErr) throw new Error(`Upload: ${uploadErr.message}`);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        photoUrl = pub.publicUrl;
        setUploading(false);
      }

      // Step 2 — submit the review (upsert)
      const res = await submitReview({
        placeId,
        ratingMeat,
        ratingBread,
        comment: comment.trim() || null,
        photoUrl,
      });

      if (!res.success) {
        setError(res.error ?? "Greška pri spremanju.");
        setSubmitting(false);
        return;
      }

      setDone(true);
      onSubmitted?.();
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neočekivana greška.");
      setSubmitting(false);
      setUploading(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!existing) return;
    if (!confirm("Obrisati svoju recenziju?")) return;
    setSubmitting(true);
    const res = await deleteReview(existing.id);
    if (!res.success) {
      setError(res.error ?? "Greška pri brisanju.");
      setSubmitting(false);
      return;
    }
    onSubmitted?.();
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] shadow-2xl"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
          <div>
            <h2
              className="text-lg font-bold text-[rgb(var(--foreground))]"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {existing ? "Uredi recenziju" : "Ostavi recenziju"}
            </h2>
            <p className="text-xs text-[rgb(var(--muted))] mt-0.5 truncate">{placeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--muted))] hover:bg-[rgb(var(--border)/0.4)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[rgb(var(--muted))]" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="text-sm font-medium text-[rgb(var(--foreground))]">Recenzija je spremljena. Hvala!</p>
            </div>
          ) : (
            <>
              {/* Meat rating */}
              <StarPicker
                label="Meso"
                emoji="🥩"
                value={ratingMeat}
                onChange={setRatingMeat}
              />

              {/* Bread rating */}
              <StarPicker
                label="Somun / Lepinja"
                emoji="🫓"
                value={ratingBread}
                onChange={setRatingBread}
              />

              {/* Comment */}
              <div>
                <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-1.5">
                  Komentar <span className="opacity-50 normal-case tracking-normal">(opcionalno)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Kakvi su bili ćevapi? Meso, somun, usluga…"
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--primary)/0.5)] resize-none"
                />
                <p className="text-[10px] text-[rgb(var(--muted))] opacity-60 mt-1 text-right">{comment.length} / 2000</p>
              </div>

              {/* Photo */}
              <div>
                <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-1.5">
                  Fotografija <span className="opacity-50 normal-case tracking-normal">(opcionalno)</span>
                </label>

                {photoPreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Pregled"
                      className="w-full h-48 object-cover rounded-xl border border-[rgb(var(--border))]"
                    />
                    <button
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.04)] transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-sm">Dodaj fotografiju</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickFile}
                  className="hidden"
                />

                <p className="text-[10px] text-[rgb(var(--muted))] opacity-60 mt-1">
                  Slika se automatski smanjuje na 800 px / 500 KB prije slanja.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-500">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!loading && !done && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--background))]">
            {existing ? (
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Obriši
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--border)/0.4)] transition-colors disabled:opacity-40"
              >
                Odustani
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || ratingMeat < 1 || ratingBread < 1}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40",
                  "bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.85)] active:scale-95",
                )}
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploading ? "Šaljem sliku…" : "Spremam…"}
                  </>
                ) : (
                  existing ? "Spremi izmjene" : "Objavi"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StarPicker — interactive 5-star rating with hover preview
// ─────────────────────────────────────────────────────────────────────────────
function StarPicker({
  label,
  emoji,
  value,
  onChange,
}: {
  label:    string;
  emoji:    string;
  value:    number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div>
      <label className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium block mb-1.5">
        <span className="mr-1.5">{emoji}</span>{label}
      </label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            className="p-1 rounded transition-transform hover:scale-110"
            aria-label={`${i} zvjezdica`}
          >
            <Star
              className={cn(
                "w-7 h-7 transition-colors",
                i <= active
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-[rgb(var(--border))]",
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          {value > 0 ? `${value}/5` : "—"}
        </span>
      </div>
    </div>
  );
}
