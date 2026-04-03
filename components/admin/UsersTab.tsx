"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Shield, ShieldOff, Pencil, Check, X, Loader2 } from "lucide-react";
import { getAdminUsers, setUserXP, toggleUserAdmin, type AdminUser } from "@/lib/actions/admin";
import { getRank } from "@/lib/gamification";
import { cn } from "@/lib/utils";

function UserAvatar({ src, name }: { src: string | null; name: string }) {
  const isUrl = src?.startsWith("http");
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[rgb(var(--primary)/0.15)]">
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name} className="w-full h-full object-cover" />
      ) : src ? (
        <span className="text-sm leading-none">{src}</span>
      ) : (
        <span className="text-xs font-bold text-[rgb(var(--primary))]">{name[0]?.toUpperCase()}</span>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
        <input
          type="text"
          placeholder="Pretraži korisnike po korisničkom imenu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-[rgb(var(--surface)/0.6)] text-xs text-[rgb(var(--muted))] uppercase tracking-wider font-semibold border-b border-[rgb(var(--border))]">
          <span className="w-8" />
          <span>Korisnik</span>
          <span className="w-24 text-right">XP</span>
          <span className="w-24 text-center">Admin</span>
          <span className="w-20 text-center">Akcije</span>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-[rgb(var(--border)/0.5)] animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[rgb(var(--border)/0.5)]" />
              <div className="space-y-1.5 py-1">
                <div className="h-3 bg-[rgb(var(--border)/0.5)] rounded w-28" />
                <div className="h-2.5 bg-[rgb(var(--border)/0.4)] rounded w-20" />
              </div>
              <div className="w-16 h-4 bg-[rgb(var(--border)/0.4)] rounded self-center" />
              <div className="w-16 h-6 bg-[rgb(var(--border)/0.4)] rounded self-center" />
              <div className="w-16 h-6 bg-[rgb(var(--border)/0.4)] rounded self-center" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[rgb(var(--muted))]">Nema korisnika.</div>
        ) : (
          users.map((user) => {
            const rank = getRank(user.xp);
            const isEditingThis = editingXP === user.id;
            const msg = actionMsg?.id === user.id ? actionMsg.msg : null;

            return (
              <div
                key={user.id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-[rgb(var(--border)/0.4)] last:border-0 transition-colors",
                  user.isAdmin && "bg-[rgb(var(--primary)/0.03)]"
                )}
              >
                <UserAvatar src={user.avatarUrl} name={user.username} />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-[rgb(var(--foreground))] truncate">{user.username}</span>
                    {user.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] font-semibold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[rgb(var(--muted))]">{rank.emoji} {rank.title}</span>
                  {msg && <span className="ml-2 text-xs text-green-400">{msg}</span>}
                </div>

                {/* XP — inline edit */}
                <div className="w-28 flex items-center justify-end gap-1">
                  {isEditingThis ? (
                    <>
                      <input
                        type="number"
                        value={xpDraft}
                        onChange={(e) => setXpDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveXP(user); if (e.key === "Escape") setEditingXP(null); }}
                        autoFocus
                        className="w-20 px-2 py-1 text-xs rounded-lg border border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] outline-none text-right"
                      />
                      <button onClick={() => handleSaveXP(user)} disabled={isPending} className="text-green-400 hover:text-green-300 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingXP(null)} className="text-[rgb(var(--muted))] hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingXP(user.id); setXpDraft(String(user.xp)); }}
                      className="flex items-center gap-1 text-xs font-bold text-[rgb(var(--primary))] hover:underline"
                    >
                      {user.xp.toLocaleString()} XP
                      <Pencil className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  )}
                </div>

                {/* Admin toggle */}
                <div className="w-24 flex justify-center">
                  <button
                    onClick={() => handleToggleAdmin(user)}
                    disabled={isPending}
                    title={user.isAdmin ? "Ukloni admin" : "Dodijeli admin"}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      user.isAdmin
                        ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                        : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary)/0.3)] hover:text-[rgb(var(--primary))]"
                    )}
                  >
                    {user.isAdmin ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {user.isAdmin ? "Admin" : "—"}
                  </button>
                </div>

                {/* Loading indicator */}
                <div className="w-20 flex justify-center">
                  {isPending && editingXP === user.id && <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--muted))]" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-[rgb(var(--muted))] text-right">{users.length} korisnik(a)</p>
    </div>
  );
}
