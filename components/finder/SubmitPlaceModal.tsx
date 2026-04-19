"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SubmitPlaceModal
// Lets any signed-in user propose a new ćevap place.  Submitted rows land with
// is_approved = false and are filtered from the public finder query by RLS.
// Admin approves / rejects via /admin → Moderacija tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, CheckCircle, MapPin, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitNewPlace } from "@/lib/actions/places";
import type { CevapStyle } from "@/types/database";
import { cn } from "@/lib/utils";

const STYLES: CevapStyle[] = ["Sarajevski", "Banjalučki", "Travnički", "Leskovački", "Ostalo"];

interface Props {
  onClose: () => void;
  onSubmitted?: () => void;
  /** Pre-fill city if the user is currently browsing one. */
  defaultCity?: string;
}

export function SubmitPlaceModal({ onClose, onSubmitted, defaultCity }: Props) {
  const supabase = createClient();

  const [mounted,   setMounted]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [authed,    setAuthed]    = useState(false);

  const [name,        setName]        = useState("");
  const [city,        setCity]        = useState(defaultCity ?? "");
  const [address,     setAddress]     = useState("");
  const [style,       setStyle]       = useState<CevapStyle>("Ostalo");
  const [phone,       setPhone]       = useState("");
  const [website,     setWebsite]     = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState(false);

  // ── Portal mount ──────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Check auth ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: { user } } = await (supabase.auth.getUser() as any);
      if (cancelled) return;
      setAuthed(!!user);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // ── Auto-close after success ──────────────────────────────────────────────
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onClose(), 1200);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const canSubmit =
    name.trim().length > 0 &&
    city.trim().length > 0 &&
    address.trim().length > 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitNewPlace({
        name,
        city,
        address,
        style,
        phone:       phone.trim()       || null,
        website:     website.trim()     || null,
        description: description.trim() || null,
      });
      if (!res.success) {
        setError(res.error ?? "Nije uspjelo slanje.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neočekivana greška.");
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <Store className="w-4 h-4 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h2
                className="text-lg font-bold text-[rgb(var(--foreground))] leading-tight"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                Predloži novo mjesto
              </h2>
              <p className="text-[11px] text-[rgb(var(--muted))]">Admin će pregledati prije objave.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {checking ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[rgb(var(--muted))]" />
            </div>
          ) : !authed ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
              <p className="text-sm text-amber-400 font-semibold mb-2">Nisi prijavljen/a</p>
              <p className="text-xs text-[rgb(var(--muted))]">
                Prijavi se ili registriraj da bi predložio/la novo mjesto.
              </p>
            </div>
          ) : done ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-base font-semibold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                Hvala! Prijedlog je poslan.
              </p>
              <p className="text-xs text-[rgb(var(--muted))] max-w-xs">
                Admin tim će provjeriti i objaviti mjesto na mapi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <Field label="Ime mjesta" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="npr. Ćevabdžinica Petica"
                  maxLength={200}
                  required
                  className={inputCls}
                />
              </Field>

              {/* City + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Grad" required>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Sarajevo"
                    maxLength={120}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Adresa" required>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Oprkanj 2"
                    maxLength={300}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Style */}
              <Field label="Stil ćevapa">
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStyle(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        style === s
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.4)]",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Phone + Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Telefon (opcija)">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+387 …"
                    maxLength={80}
                    className={inputCls}
                  />
                </Field>
                <Field label="Web / Instagram (opcija)">
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://…"
                    maxLength={300}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Description */}
              <Field label="Opis (opcija)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Par rečenica — zašto preporučuješ?"
                  rows={3}
                  maxLength={500}
                  className={cn(inputCls, "resize-none")}
                />
                <p className="text-[10px] text-[rgb(var(--muted))] mt-1 text-right">
                  {description.length}/500
                </p>
              </Field>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {submitting
                    ? (<><Loader2 className="w-4 h-4 animate-spin" /> ŠALJEM…</>)
                    : (<><MapPin className="w-4 h-4" /> POŠALJI</>)}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Small helpers ────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] text-sm text-[rgb(var(--foreground))] placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))] mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
