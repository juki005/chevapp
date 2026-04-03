"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, CheckCircle, Trash2, ChevronDown, AlertTriangle, Store } from "lucide-react";
import {
  getAdminRestaurants, verifyRestaurant, updateRestaurantStyle,
  deleteRestaurant, type AdminRestaurant,
} from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import type { CevapStyle } from "@/types/database";

const STYLES: (CevapStyle | "")[] = ["", "Sarajevski", "Banjalučki", "Travnički", "Leskovački", "Ostalo"];

function StyleSelect({ id, current, onChange }: { id: string; current: string | null; onChange: (s: CevapStyle | null) => void }) {
  return (
    <div className="relative">
      <select
        value={current ?? ""}
        onChange={(e) => onChange((e.target.value as CevapStyle) || null)}
        className="appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary)/0.5)] cursor-pointer"
        aria-label={`Stil za ${id}`}
      >
        <option value="">— Stil —</option>
        {STYLES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[rgb(var(--muted))] pointer-events-none" />
    </div>
  );
}

function RestaurantRow({
  r, onVerify, onStyleChange, onDelete,
}: {
  r: AdminRestaurant;
  onVerify:      (id: string) => void;
  onStyleChange: (id: string, style: CevapStyle | null) => void;
  onDelete:      (id: string, name: string) => void;
}) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-3 items-start sm:items-center px-4 py-3 border-b border-[rgb(var(--border)/0.4)] last:border-0 transition-colors",
      !r.isVerified && "bg-amber-500/3"
    )}>
      {/* Name + meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-[rgb(var(--foreground))] truncate">{r.name}</span>
          {r.isVerified ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold whitespace-nowrap">✓ Verificiran</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold whitespace-nowrap">Na čekanju</span>
          )}
        </div>
        <div className="text-xs text-[rgb(var(--muted))] mt-0.5 truncate">
          {r.city}{r.address ? ` · ${r.address}` : ""}
        </div>
      </div>

      {/* Style select */}
      <StyleSelect id={r.id} current={r.style} onChange={(s) => onStyleChange(r.id, s)} />

      {/* Verify button */}
      {!r.isVerified && (
        <button
          onClick={() => onVerify(r.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-500/40 bg-green-500/8 text-green-400 hover:bg-green-500/15 transition-colors whitespace-nowrap"
        >
          <CheckCircle className="w-3 h-3" /> Verificiraj
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(r.id, r.name)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition-colors whitespace-nowrap"
      >
        <Trash2 className="w-3 h-3" />
        <span className="hidden sm:inline">Obriši</span>
      </button>
    </div>
  );
}

export function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [view,        setView]        = useState<"all" | "unverified">("unverified");
  const [isPending,   startTransition] = useTransition();
  const [toast,       setToast]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminRestaurants(search || undefined).then((data) => {
      setRestaurants(data);
      setLoading(false);
    });
  }, [search]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  const handleVerify = (id: string) => {
    startTransition(async () => {
      const ok = await verifyRestaurant(id);
      if (ok) {
        setRestaurants((prev) => prev.map((r) => r.id === id ? { ...r, isVerified: true } : r));
        showToast("Restoran verificiran ✓");
      }
    });
  };

  const handleStyleChange = (id: string, style: CevapStyle | null) => {
    startTransition(async () => {
      const ok = await updateRestaurantStyle(id, style);
      if (ok) {
        setRestaurants((prev) => prev.map((r) => r.id === id ? { ...r, style } : r));
        showToast("Stil ažuriran ✓");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Obriši "${name}"? Ova radnja je nepovratna.`)) return;
    startTransition(async () => {
      const ok = await deleteRestaurant(id);
      if (ok) {
        setRestaurants((prev) => prev.filter((r) => r.id !== id));
        showToast(`"${name}" obrisan`);
      }
    });
  };

  const displayed = view === "unverified"
    ? restaurants.filter((r) => !r.isVerified)
    : restaurants;

  const unverifiedCount = restaurants.filter((r) => !r.isVerified).length;

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-green-500 text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
          <input
            type="text"
            placeholder="Pretraži restorane…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
          />
        </div>
        <div className="flex rounded-xl border border-[rgb(var(--border))] overflow-hidden text-sm font-medium flex-shrink-0">
          <button
            onClick={() => setView("unverified")}
            className={cn("px-4 py-2 flex items-center gap-1.5 transition-colors",
              view === "unverified"
                ? "bg-amber-500/15 text-amber-400"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]")}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Na čekanju
            {unverifiedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">{unverifiedCount}</span>
            )}
          </button>
          <div className="w-px bg-[rgb(var(--border))]" />
          <button
            onClick={() => setView("all")}
            className={cn("px-4 py-2 flex items-center gap-1.5 transition-colors",
              view === "all"
                ? "bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]")}
          >
            <Store className="w-3.5 h-3.5" /> Svi
          </button>
        </div>
      </div>

      {/* Pending spinner overlay */}
      {isPending && (
        <div className="text-xs text-[rgb(var(--muted))] flex items-center gap-1.5">
          <span className="w-3 h-3 border border-[rgb(var(--muted))] border-t-transparent rounded-full animate-spin" />
          Sprema…
        </div>
      )}

      <div className="rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[rgb(var(--surface)/0.6)] border-b border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))] uppercase tracking-wider font-semibold flex gap-3">
          <span className="flex-1">Restoran</span>
          <span className="w-24">Stil</span>
          <span className="w-24 text-center">Akcije</span>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-[rgb(var(--border)/0.4)] animate-pulse">
              <div className="h-3 bg-[rgb(var(--border)/0.5)] rounded w-40 mb-1.5" />
              <div className="h-2.5 bg-[rgb(var(--border)/0.4)] rounded w-28" />
            </div>
          ))
        ) : displayed.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[rgb(var(--muted))]">
            {view === "unverified" ? "🎉 Nema restorana na čekanju!" : "Nema restorana."}
          </div>
        ) : (
          displayed.map((r) => (
            <RestaurantRow
              key={r.id}
              r={r}
              onVerify={handleVerify}
              onStyleChange={handleStyleChange}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
      <p className="text-xs text-[rgb(var(--muted))] text-right">{displayed.length} restoran(a)</p>
    </div>
  );
}
