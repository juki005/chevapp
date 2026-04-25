"use client";

// ── StatsTab · admin (Sprint 26n · DS-migrated) ───────────────────────────────
// Six stat cards + verification progress bar. Default landing tab in /admin.
//
// Sprint 26n changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on stat values → font-display.
//   - Stat card colour palette remapped to the 5 DS semantic colours:
//       Users           : blue-400/500     → somun-purple (passive readout)
//       Restaurants     : primary           → unchanged
//       Verified        : green-400/500    → ember-green (confirmed)
//       Pending review  : amber-400/500    → zar-red (admin-attention).
//                          DS has no warning amber — amber-xp is gamification-
//                          only — so admin-attention surfaces fall under the
//                          alert family (soft /5 tint, not destructive red)
//       Total reviews   : yellow-400/500   → amber-xp (matches review stars
//                                            from Sprint 26i)
//       Top style       : purple-400/500   → somun-purple (passive trending)
//   - Progress bar gradient: from-[rgb(var(--primary)/0.7)] to primary →
//     from-primary/70 to-primary (token-aliased; gradients on non-CTA
//     visualisations are still allowed per DS §8 — the rule only locks
//     primary CTAs to flat fills).
//   - rounded-2xl → rounded-card; rounded-xl → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className={`rounded-card border p-5 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-chip bg-surface flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-foreground mb-1">
        {value}
      </div>
      <div className="text-sm font-medium text-foreground/70">{label}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
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
          <div key={i} className="rounded-card border border-border bg-surface/40 p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!stats) return <p className="text-muted">Greška pri učitavanju statistike.</p>;

  const verifiedPct = stats.totalRestaurants > 0
    ? Math.round((stats.verifiedRestaurants / stats.totalRestaurants) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-somun-purple" />}
          label="Ukupno korisnika"
          value={stats.totalUsers}
          color="border-somun-purple/20 bg-somun-purple/5"
        />
        <StatCard
          icon={<Store className="w-5 h-5 text-primary" />}
          label="Restorani ukupno"
          value={stats.totalRestaurants}
          sub={`${verifiedPct}% verificirano`}
          color="border-primary/20 bg-primary/5"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-ember-green" />}
          label="Verificirani restorani"
          value={stats.verifiedRestaurants}
          color="border-ember-green/20 bg-ember-green/5"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-zar-red" />}
          label="Na čekanju provjere"
          value={stats.unverifiedRestaurants}
          sub="Čekaju odobrenje"
          color="border-zar-red/20 bg-zar-red/5"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-xp" />}
          label="Ukupno recenzija"
          value={stats.totalReviews}
          color="border-amber-xp/20 bg-amber-xp/5"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-somun-purple" />}
          label="Najpopularniji stil"
          value={stats.topStyle}
          sub="Verificirani restorani"
          color="border-somun-purple/20 bg-somun-purple/5"
        />
      </div>

      {/* Verification progress bar */}
      <div className="rounded-card border border-border bg-surface/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Napredak verifikacije</span>
          <span className="text-sm font-bold text-primary">{verifiedPct}%</span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
            style={{ width: `${verifiedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-2">
          <span>{stats.verifiedRestaurants} verificiranih</span>
          <span>{stats.unverifiedRestaurants} na čekanju</span>
        </div>
      </div>
    </div>
  );
}
