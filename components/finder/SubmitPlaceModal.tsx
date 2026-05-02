"use client";

// ── SubmitPlaceModal · finder (Sprint 26am · DS-migrated) ────────────────────
// Lets any signed-in user propose a new ćevap place. Submitted rows land with
// is_approved = false and are filtered from the public finder query by RLS.
// Admin approves / rejects via /admin → Moderacija tab.
//
// Sprint 26am changes:
//   - All rgb(var(--token)) Tailwind classes → semantic aliases (~20 sites).
//   - 3× style={{fontFamily:"Oswald"}} → font-display class (header h2,
//     done-state h2, submit button).
//   - Auth-required notice: amber-500 family → zar-red token family
//     (admin-attention pattern, consistent with FinderPage 26al et al).
//   - Done-state CheckCircle text-green-500 → text-ember-green (DS confirm).
//   - Error block red-500/30 + red-500/5 + red-400 → zar-red token family
//     (DS alert).
//   - Required-field asterisk text-red-400 → text-zar-red.
//   - Submit CTA hover:opacity-90 + text-white → hover:bg-vatra-hover +
//     text-primary-fg (DS rule — explicit hover token, semantic fill).
//   - Style chip active rgb(var(--primary)/0.12) → primary/10 (rounded to
//     standard Tailwind opacity scale).
//   - Shared inputCls const: rgb(var(--token)) chains → semantic aliases;
//     placeholder-* → placeholder:text-muted.
//   - rounded-2xl modal → rounded-card; rounded-xl/lg → rounded-chip;
//     shadow-2xl → shadow-soft-xl.
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-card bg-background border border-border shadow-soft-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-chip bg-primary/15 flex items-center justify-center">
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                Predloži novo mjesto
              </h2>
              <p className="text-[11px] text-muted">Admin će pregledati prije objave.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-chip flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition-colors"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {checking ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : !authed ? (
            <div className="rounded-chip border border-zar-red/30 bg-zar-red/5 p-5 text-center">
              <p className="text-sm text-zar-red font-semibold mb-2">Nisi prijavljen/a</p>
              <p className="text-xs text-muted">
                Prijavi se ili registriraj da bi predložio/la novo mjesto.
              </p>
            </div>
          ) : done ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-ember-green" />
              <p className="font-display text-base font-semibold text-foreground">
                Hvala! Prijedlog je poslan.
              </p>
              <p className="text-xs text-muted max-w-xs">
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
                        "px-3 py-1.5 rounded-chip text-xs font-semibold border transition-all",
                        style === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted hover:text-foreground hover:border-primary/40",
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
                <p className="text-[10px] text-muted mt-1 text-right">
                  {description.length}/500
                </p>
              </Field>

              {error && (
                <div role="alert" className="rounded-chip border border-zar-red/30 bg-zar-red/5 px-3 py-2 text-xs text-zar-red">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-chip border border-border text-sm font-semibold text-muted hover:text-foreground transition-colors"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="font-display flex items-center gap-1.5 px-5 py-2 rounded-chip bg-primary text-primary-fg text-sm font-bold hover:bg-vatra-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  "w-full px-3 py-2 rounded-chip border border-border bg-surface/40 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary/50 transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
        {label} {required && <span className="text-zar-red">*</span>}
      </span>
      {children}
    </label>
  );
}
