"use client";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  MapPin, ChefHat, Users, User, Menu, X, Flame,
  Shield, Route, GraduationCap, Music, LogOut, Zap,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface NavbarProps {
  locale: string;
}

const NAV_ITEMS = [
  { key: "finder",       href: "/finder",       icon: MapPin        },
  { key: "routePlanner", href: "/route-planner", icon: Route        },
  { key: "kitchen",      href: "/kitchen",      icon: ChefHat       },
  { key: "academy",      href: "/academy",      icon: GraduationCap },
  { key: "community",    href: "/community",    icon: Users         },
  { key: "profile",      href: "/profile",      icon: User          },
] as const;

export function Navbar({ locale }: NavbarProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [authOpen,     setAuthOpen]     = useState(false);
  const [user,         setUser]         = useState<SupabaseUser | null>(null);
  const [xp,           setXp]           = useState<number | null>(null);
  const [streak,       setStreak]       = useState(0);
  const [activeToday,  setActiveToday]  = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authLoading,  setAuthLoading]  = useState(true);

  // next-intl's usePathname returns the path WITHOUT the locale prefix,
  // so isActive works the same regardless of active locale.
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // ── Load auth state + subscribe to changes ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function loadUser(uid: string) {
      const [profileRes, statsRes] = await Promise.all([
        supabase.from("profiles").select("xp_points").eq("id", uid).single(),
        supabase.from("user_stats").select("current_streak, last_activity_date").eq("user_id", uid).maybeSingle(),
      ]);
      const profileData = profileRes.data as { xp_points: number } | null;
      const statsData   = statsRes.data   as { current_streak: number; last_activity_date: string | null } | null;
      setXp(profileData?.xp_points ?? 0);
      const today = new Date().toISOString().split("T")[0];
      setStreak(statsData?.current_streak ?? 0);
      setActiveToday(statsData?.last_activity_date === today);
    }

    // getUser() only sets authLoading — loadUser is handled by onAuthStateChange
    // which fires INITIAL_SESSION on mount, avoiding a duplicate parallel fetch.
    supabase.auth.getUser().then(() => {
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { loadUser(u.id); } else { setXp(null); setStreak(0); setActiveToday(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null); setXp(null); setStreak(0); setActiveToday(false); setUserMenuOpen(false);
    router.refresh();
  };

  const displayInitial =
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "G";

  // ── Auth section ─────────────────────────────────────────────────────────────
  function AuthSection() {
    if (authLoading) {
      return <div className="w-8 h-8 rounded-full bg-charcoal-700 animate-pulse" />;
    }
    if (!user) {
      return (
        <button
          onClick={() => setAuthOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-burnt-orange-500 text-cream text-sm font-semibold hover:bg-burnt-orange-600 active:scale-95 transition-all"
        >
          <User className="w-3.5 h-3.5" />
          {t("signIn")}
        </button>
      );
    }
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setUserMenuOpen((v) => !v); }}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[rgb(var(--border))] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-burnt-orange-500 flex items-center justify-center text-xs font-bold text-cream flex-shrink-0">
            {displayInitial}
          </div>
          {xp !== null && (
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-0.5 text-burnt-orange-400">
                <Zap className="w-3 h-3" />
                {xp.toLocaleString()}
              </span>
              <span className={cn(
                "flex items-center gap-0.5",
                activeToday ? "text-orange-400" : "text-cream/30"
              )}>
                <Flame className="w-3 h-3" />
                {streak}
              </span>
            </div>
          )}
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgb(var(--border))]">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))] truncate">
                {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? t("profile")}
              </p>
              <p className="text-xs text-[rgb(var(--muted))] truncate">{user.email}</p>
              {xp !== null && (
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-burnt-orange-400 font-semibold">
                    ⚡ {xp.toLocaleString()} XP
                  </p>
                  <p className={cn(
                    "text-xs font-semibold flex items-center gap-0.5",
                    activeToday ? "text-orange-400" : "text-cream/30"
                  )}>
                    🔥 {streak} {streak === 1 ? "dan" : "dana"}
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-[rgb(var(--foreground)/0.7)] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border))] transition-colors"
            >
              <User className="w-4 h-4" />
              {t("profile")}
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("signOut")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.95)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-burnt-orange-500 flex items-center justify-center shadow-lg shadow-burnt-orange-900/40 group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5 text-cream" />
              </div>
              <span className="text-xl font-bold text-cream tracking-widest uppercase"
                style={{ fontFamily: "Oswald, sans-serif" }}>
                Chev<span className="text-burnt-orange-400">App</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive(href)
                      ? "bg-burnt-orange-500/20 text-burnt-orange-400"
                      : "text-[rgb(var(--foreground)/0.6)] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border))]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(key as "finder")}</span>
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Language + theme: desktop only — on mobile these live in the drawer */}
              <div className="hidden md:flex items-center gap-2">
                <LanguageSwitcher locale={locale} />
                <ThemeToggle />
              </div>
              <AuthSection />
              <Link
                href="/admin"
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded text-xs text-[rgb(var(--foreground)/0.3)] hover:text-[rgb(var(--foreground)/0.6)] transition-colors"
                title="Admin"
              >
                <Shield className="w-3.5 h-3.5" />
              </Link>
              <button
                className="md:hidden p-2 rounded-lg text-[rgb(var(--foreground)/0.7)] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border))] transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer — secondary nav only
            Finder / Kitchen / Community / Profile are in the BottomNav.
            This drawer surfaces pages not reachable from the bottom bar.    */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <nav className="px-4 py-3 flex flex-col gap-1">
              {/* Secondary pages */}
              {([
                { key: "routePlanner", href: "/route-planner", icon: Route },
                { key: "academy",      href: "/academy",       icon: GraduationCap },
                { key: "jukebox",      href: "/jukebox",       icon: Music },
              ] as const).map(({ key, href, icon: Icon }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-burnt-orange-500/20 text-burnt-orange-400"
                      : "text-[rgb(var(--foreground)/0.7)] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border))]"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(key as "finder")}</span>
                </Link>
              ))}

              {/* Language + theme toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--border))]">
                <span className="text-xs text-[rgb(var(--foreground)/0.3)] px-3 font-medium">{t("languageTheme")}</span>
                <div className="flex items-center gap-2 px-3">
                  <LanguageSwitcher locale={locale} />
                  <ThemeToggle />
                </div>
              </div>

              {/* Auth row */}
              {!authLoading && (
                <div className="pt-2 border-t border-[rgb(var(--border))] mt-1">
                  {user ? (
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/5 w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      {t("signOut")}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMobileOpen(false); setAuthOpen(true); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-burnt-orange-400 hover:bg-burnt-orange-500/10 w-full"
                    >
                      <User className="w-5 h-5" />
                      {t("signIn")}
                    </button>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
