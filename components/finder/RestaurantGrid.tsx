"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RestaurantCard } from "./RestaurantCard";
import type { Restaurant } from "@/types";
import { Loader2, ServerCrash } from "lucide-react";

const PAGE_SIZE = 12;

export function RestaurantGrid() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(true);

  const fetchPage = async (pageIndex: number, append: boolean) => {
    const isFirst = !append;
    if (isFirst) setLoading(true); else setLoadingMore(true);
    try {
      const supabase = createClient();
      const from = pageIndex * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("lepinja_rating", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const rows = (data as Restaurant[]) ?? [];
      setRestaurants(prev => append ? [...prev, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError("Greška pri učitavanju restorana. Provjeri Supabase konfiguraciju.");
      console.error(err);
    } finally {
      if (isFirst) setLoading(false); else setLoadingMore(false);
    }
  };

  useEffect(() => { fetchPage(0, false); }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-cream/40">
        <Loader2 className="w-8 h-8 animate-spin text-burnt-orange-500" />
        <p className="text-sm">Učitavanje restorana...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-cream/40">
        <ServerCrash className="w-10 h-10 text-red-500/50" />
        <p className="text-sm text-red-400/70 text-center max-w-sm">{error}</p>
        <p className="text-xs text-cream/30">
          Pokreni <code className="bg-charcoal-700 px-1.5 py-0.5 rounded text-burnt-orange-400">POST /api/seed</code> za unos testnih podataka.
        </p>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-cream/40">
        <span className="text-5xl">🍖</span>
        <p className="text-sm text-center">
          Nema restorana u bazi. Pokrenite seed endpoint.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-cream/30 mb-4">{restaurants.length} lokacija pronađeno</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {restaurants.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.4)] transition-all disabled:opacity-50"
          >
            {loadingMore
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Učitavanje...</>
              : "Prikaži više"}
          </button>
        </div>
      )}
    </div>
  );
}
