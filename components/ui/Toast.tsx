"use client";

// ── Toast · ui (Sprint 26f · DS-migrated) ────────────────────────────────────
// Lightweight transient notification system. 4 variants:
//   success → ember-green (confirmed action)
//   error   → zar-red     (failure / destructive)
//   info    → somun-purple (passive status — per DS §6 "Novo/Objavljeno" family)
//   xp      → primary / vatra (hit for gamification events — matches XP badges)
//
// Sprint 26f changes:
//   - Tailwind arbitrary rgb(var(--token)) classes → semantic aliases
//     (bg-surface, text-foreground, text-muted, bg-primary, etc.).
//   - Raw green-/red-/blue-500 palette → semantic tokens; "info" remapped
//     from blue to somun-purple so the app palette stays inside the 5
//     canonical semantic colors.
//   - rounded-2xl → rounded-card (20px · DS shape scale).
//   - shadow-xl → shadow-soft-xl (DS shadow scale).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "xp";

export interface ToastData {
  id:      string;
  type:    ToastType;
  title:   string;
  message?: string;
}

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-ember-green" />,
  error:   <AlertCircle className="w-4 h-4 text-zar-red" />,
  info:    <Info        className="w-4 h-4 text-somun-purple" />,
  // TODO(icons): swap ⚡ for brand <XP> when Sprint 27 lands
  xp:      <span className="text-sm" aria-hidden="true">⚡</span>,
};

const BORDERS = {
  success: "border-ember-green/40 bg-ember-green/10",
  error:   "border-zar-red/40 bg-zar-red/10",
  info:    "border-somun-purple/40 bg-somun-purple/10",
  xp:      "border-primary/50 bg-primary/10",
};

// ── Single toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  toast:     ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for mount animation
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => { cancelAnimationFrame(show); clearTimeout(hide); };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-card border shadow-soft-xl backdrop-blur-sm transition-all duration-300 min-w-[240px] max-w-[340px]",
        BORDERS[toast.type],
        "bg-surface",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-muted mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        aria-label="Zatvori"
        className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Toast container ───────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts:    ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 items-end sm:bottom-6">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    dismiss,
    success: (title: string, message?: string) => addToast("success", title, message),
    error:   (title: string, message?: string) => addToast("error",   title, message),
    info:    (title: string, message?: string) => addToast("info",    title, message),
    xp:      (title: string, message?: string) => addToast("xp",      title, message),
  };
}
