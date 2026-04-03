"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Shield, Users, Store, FileText, BarChart2, Loader2, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { UsersTab }       from "@/components/admin/UsersTab";
import { RestaurantsTab } from "@/components/admin/RestaurantsTab";
import { CmsTab }         from "@/components/admin/CmsTab";
import { StatsTab }       from "@/components/admin/StatsTab";

type AdminTab = "stats" | "users" | "restaurants" | "cms";

const TABS: { key: AdminTab; icon: React.ReactNode; label: string }[] = [
  { key: "stats",       icon: <BarChart2 className="w-4 h-4" />, label: "Statistike"  },
  { key: "users",       icon: <Users     className="w-4 h-4" />, label: "Korisnici"   },
  { key: "restaurants", icon: <Store     className="w-4 h-4" />, label: "Restorani"   },
  { key: "cms",         icon: <FileText  className="w-4 h-4" />, label: "CMS"         },
];

export default function AdminPage() {
  const router      = useRouter();
  const locale      = useLocale();
  const [status,    setStatus]    = useState<"loading" | "ok" | "denied">("loading");
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setStatus("denied"); return; }
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if ((data as { is_admin?: boolean } | null)?.is_admin === true) {
            setStatus("ok");
          } else {
            setStatus("denied");
          }
        });
    });
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))]">
        <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
      </div>
    );
  }

  // ── Access denied ───────────────────────────────────────────────────────────
  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] p-4">
        <div className="max-w-sm w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[rgb(var(--foreground))] mb-2" style={{ fontFamily: "Oswald, sans-serif" }}>
            Pristup odbijen
          </h1>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Ova stranica je dostupna samo administratorima.
          </p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="px-6 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Idi na početnu
          </button>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">

      {/* Header + Tab bar */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.8)] backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 py-4 flex-wrap gap-y-2">
            {/* Icon + title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1
                  className="text-lg font-bold text-[rgb(var(--foreground))] uppercase tracking-wide leading-tight"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  Command Center
                </h1>
                <p className="text-[10px] text-[rgb(var(--muted))] uppercase tracking-widest">ChevApp Admin</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="ml-auto flex items-center gap-1 overflow-x-auto">
              {TABS.map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap flex-shrink-0",
                    activeTab === key
                      ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                      : "border-transparent text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)]"
                  )}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "stats"       && <StatsTab />}
        {activeTab === "users"       && <UsersTab />}
        {activeTab === "restaurants" && <RestaurantsTab />}
        {activeTab === "cms"         && <CmsTab />}
      </div>
    </div>
  );
}
