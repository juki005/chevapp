"use client";

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
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error:   <AlertCircle className="w-4 h-4 text-red-400" />,
  info:    <Info className="w-4 h-4 text-blue-400" />,
  xp:      <span className="text-sm">⚡</span>,
};

const BORDERS = {
  success: "border-green-500/40 bg-green-500/8",
  error:   "border-red-500/40 bg-red-500/8",
  info:    "border-blue-500/40 bg-blue-500/8",
  xp:      "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)]",
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
        "flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-300 min-w-[240px] max-w-[340px]",
        BORDERS[toast.type],
        "bg-[rgb(var(--surface))]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[rgb(var(--foreground))] leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-[rgb(var(--muted))] mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="flex-shrink-0 text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
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
