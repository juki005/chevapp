"use client";

import { useEffect, useState } from "react";
import { Users, Store, CheckCircle, Star, TrendingUp, AlertCircle } from "lucide-react";
import { getAdminStats, type AdminStats } from "@/lib/actions/admin";

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--surface))] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-[rgb(var(--foreground))] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
        {value}
      </div>
      <div className="text-sm font-medium text-[rgb(var(--foreground)/0.7)]">{label}</div>
      {sub && <div className="text-xs text-[rgb(var(--muted))] mt-1">{sub}</div>}
    </div>
  );
}

export function StatsTab() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!stats) return <p className="text-[rgb(var(--muted))]">Greška pri učitavanju statistike.</p>;

  const verifiedPct = stats.totalRestaurants > 0
    ? Math.round((stats.verifiedRestaurants / stats.totalRestaurants) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Ukupno korisnika"
          value={stats.totalUsers}
          color="border-blue-500/20 bg-blue-500/5"
        />
        <StatCard
          icon={<Store className="w-5 h-5 text-[rgb(var(--primary))]" />}
          label="Restorani ukupno"
          value={stats.totalRestaurants}
          sub={`${verifiedPct}% verificirano`}
          color="border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.05)]"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          label="Verificirani restorani"
          value={stats.verifiedRestaurants}
          color="border-green-500/20 bg-green-500/5"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
          label="Na čekanju provjere"
          value={stats.unverifiedRestaurants}
          sub="Čekaju odobrenje"
          color="border-amber-500/20 bg-amber-500/5"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          label="Ukupno recenzija"
          value={stats.totalReviews}
          color="border-yellow-500/20 bg-yellow-500/5"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          label="Najpopularniji stil"
          value={stats.topStyle}
          sub="Verificirani restorani"
          color="border-purple-500/20 bg-purple-500/5"
        />
      </div>

      {/* Verification progress bar */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[rgb(var(--foreground))]">Napredak verifikacije</span>
          <span className="text-sm font-bold text-[rgb(var(--primary))]">{verifiedPct}%</span>
        </div>
        <div className="h-3 rounded-full bg-[rgb(var(--border))] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary)/0.7)] to-[rgb(var(--primary))] transition-all duration-700"
            style={{ width: `${verifiedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[rgb(var(--muted))] mt-2">
          <span>{stats.verifiedRestaurants} verificiranih</span>
          <span>{stats.unverifiedRestaurants} na čekanju</span>
        </div>
      </div>
    </div>
  );
}
