"use client";

// ── UsersTab · admin (Sprint 26o · DS-migrated) ───────────────────────────────
// User table with inline XP edit + admin toggle. Auth-gated under /admin.
//
// Sprint 26o changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases
//     (bg-background, bg-surface/60, border-border, border-border/40-50,
//     text-foreground, text-muted, bg-primary/15, text-primary,
//     placeholder:text-muted).
//   - XP readout text-primary → text-amber-xp per DS gamification rule.
//     The interactive element is a transparent-bg button — amber-xp on
//     the *text content* inside a button is allowed (the rule forbids
//     amber-xp as a button FILL, not as semantic XP-value text).
//   - Action-message flash text-green-400 → text-ember-green
//     (DS confirm token).
//   - Admin-toggle destructive-hover: red-500/10 + red-500/30 + red-400 →
//     zar-red token family. Cancel-edit hover:text-red-400 → hover:text-zar-red.
//   - Save-check button green-400 + green-300 → ember-green +
//     ember-green/80 (no opacity shift between rest/hover, keep within
//     the same semantic token).
//   - active-admin row tint bg-primary/[0.03] → bg-primary/5 (standard
//     Tailwind opacity scale — visual delta between 3% and 5% is
//     imperceptible; trade fidelity for token discipline).
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useTransition } from "react";
import { Search, Shield, ShieldOff, Pencil, Check, X, Loader2 } from "lucide-react";
import { getAdminUsers, setUserXP, toggleUserAdmin, type AdminUser } from "@/lib/actions/admin";
import { getRank } from "@/lib/gamification";
import { cn } from "@/lib/utils";

function UserAvatar({ src, name }: { src: string | null; name: string }) {
  const isUrl = src?.startsWith("http");
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/15">
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name} className="w-full h-full object-cover" />
      ) : src ? (
        <span className="text-sm leading-none">{src}</span>
      ) : (
        <span className="text-xs font-bold text-primary">{name[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

export function UsersTab() {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [isPending, startTransition] = useTransition();

  // Inline XP editor state
  const [editingXP,  setEditingXP]  = useState<string | null>(null);
  const [xpDraft,    setXpDraft]    = useState("");
  const [actionMsg,  setActionMsg]  = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminUsers(search || undefined).then((data) => { setUsers(data); setLoading(false); });
  }, [search]);

  function flash(userId: string, msg: string) {
    setActionMsg({ id: userId, msg });
    setTimeout(() => setActionMsg(null), 2500);
  }

  const handleSaveXP = (user: AdminUser) => {
    const val = parseInt(xpDraft, 10);
    if (isNaN(val) || val < 0) return;
    startTransition(async () => {
      const ok = await setUserXP(user.id, val);
      if (ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, xp: val } : u));
        flash(user.id, `XP ažuriran → ${val}`);
      }
      setEditingXP(null);
    });
  };

  const handleToggleAdmin = (user: AdminUser) => {
    startTransition(async () => {
      const ok = await toggleUserAdmin(user.id, !user.isAdmin);
      if (ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u));
        flash(user.id, user.isAdmin ? "Admin uklonjen" : "Admin dodijeljen ✓");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Pretraži korisnike po korisničkom imenu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-chip border border-border bg-background text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-card border border-border overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-surface/60 text-xs text-muted uppercase tracking-wider font-semibold border-b border-border">
          <span className="w-8" />
          <span>Korisnik</span>
          <span className="w-24 text-right">XP</span>
          <span className="w-24 text-center">Admin</span>
          <span className="w-20 text-center">Akcije</span>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-border/50 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-border/50" />
              <div className="space-y-1.5 py-1">
                <div className="h-3 bg-border/50 rounded w-28" />
                <div className="h-2.5 bg-border/40 rounded w-20" />
              </div>
              <div className="w-16 h-4 bg-border/40 rounded self-center" />
              <div className="w-16 h-6 bg-border/40 rounded self-center" />
              <div className="w-16 h-6 bg-border/40 rounded self-center" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">Nema korisnika.</div>
        ) : (
          users.map((user) => {
            const rank = getRank(user.xp);
            const isEditingThis = editingXP === user.id;
            const msg = actionMsg?.id === user.id ? actionMsg.msg : null;

            return (
              <div
                key={user.id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-border/40 last:border-0 transition-colors",
                  user.isAdmin && "bg-primary/5"
                )}
              >
                <UserAvatar src={user.avatarUrl} name={user.username} />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate">{user.username}</span>
                    {user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">{rank.emoji} {rank.title}</span>
                  {msg && <span className="ml-2 text-xs text-ember-green">{msg}</span>}
                </div>

                {/* XP — inline edit. text-amber-xp is semantic XP content
                    inside a transparent-bg button (not a button fill). */}
                <div className="w-28 flex items-center justify-end gap-1">
                  {isEditingThis ? (
                    <>
                      <input
                        type="number"
                        value={xpDraft}
                        onChange={(e) => setXpDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveXP(user); if (e.key === "Escape") setEditingXP(null); }}
                        autoFocus
                        className="w-20 px-2 py-1 text-xs rounded-chip border border-primary/50 bg-background text-foreground outline-none text-right"
                      />
                      <button
                        onClick={() => handleSaveXP(user)}
                        disabled={isPending}
                        aria-label="Spremi XP"
                        className="text-ember-green hover:text-ember-green/80 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingXP(null)}
                        aria-label="Odustani"
                        className="text-muted hover:text-zar-red transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingXP(user.id); setXpDraft(String(user.xp)); }}
                      className="flex items-center gap-1 text-xs font-bold text-amber-xp hover:underline"
                    >
                      {user.xp.toLocaleString()} XP
                      <Pencil className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  )}
                </div>

                {/* Admin toggle — destructive-hover when revoking admin */}
                <div className="w-24 flex justify-center">
                  <button
                    onClick={() => handleToggleAdmin(user)}
                    disabled={isPending}
                    title={user.isAdmin ? "Ukloni admin" : "Dodijeli admin"}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-chip text-xs font-medium border transition-all",
                      user.isAdmin
                        ? "border-primary/50 bg-primary/10 text-primary hover:bg-zar-red/10 hover:border-zar-red/30 hover:text-zar-red"
                        : "border-border text-muted hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    {user.isAdmin ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {user.isAdmin ? "Admin" : "—"}
                  </button>
                </div>

                {/* Loading indicator */}
                <div className="w-20 flex justify-center">
                  {isPending && editingXP === user.id && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted text-right">{users.length} korisnik(a)</p>
    </div>
  );
}
