"use client";

// ── Navbar · layout (Sprint 26k · DS-migrated) ───────────────────────────────
// Sticky top header — logo, desktop nav, auth dropdown, mobile drawer.
//
// Sprint 26k changes:
//   - Hardcoded hex #121212 / #FF6B00 → text-foreground / text-vatra-hover
//     (logo wordmark now uses the mode-aware foreground token; the "App"
//     accent keeps the bright vatra-hover hue in both modes)
//   - All arbitrary rgb(var(--token)) classes → semantic aliases
//     (bg-surface, border-border, text-foreground, text-muted, hover:bg-border)
//   - burnt-orange-500/600/400 legacy scale → bg-primary / text-primary-fg /
//     hover:bg-vatra-hover on the CTA/avatar surfaces
//   - Logo inline style={{fontFamily:"Oswald"}} → font-display
//   - Auth skeleton bg-charcoal-700 → bg-border (mode-aware)
//   - XP + streak chips: burnt-orange-400 / orange-400 → text-amber-xp per
//     DS gamification family (XP, streaks, tiers all amber-xp)
//   - Streak-inactive text-cream/30 → text-muted (fixes cream-on-cream bug
//     in Somun mode — cream is hero-locked, same latent issue as Sprint 26h
//     in RestaurantGrid)
//   - Sign-out red-400/80 + red-500/5 → text-zar-red/80 + bg-zar-red/5
//     (DS alert token)
//   - Header bg-white/95 + dark:bg-surface/95 duo → bg-surface/95 unified
//     (surface already resolves to the right tone per mode)
//   - border-gray-100 top border → border-border
//   - shadow-burnt-orange-900/40 → shadow-brand (logo mark)
//   - Dropdown shadow-xl → shadow-soft-xl
//   - rounded-lg / rounded-xl → rounded-chip (DS shape scale)
//   - Desktop nav inactive: per-mode two-tone (#121212 light, muted dark) →
//     unified text-muted / hover:text-foreground per 7shifts inactive-contrast
//     rule — one idle state in both modes, no orange tint on light hover
//   - ⚡ / 🔥 emoji in user dropdown swapped for <Zap> and <Flame> icons
//     (DS §8 — no emoji as UI icons in chrome)
// ─────────────────────────────────────────────────────────────────────────────

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
      return <div className="w-8 h-8 rounded-full bg-border animate-pulse" />;
    }
    if (!user) {
      return (
        <button
          onClick={() => setAuthOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-primary text-primary-fg text-sm font-semibold hover:bg-vatra-hover active:scale-95 transition-all"
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
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
          className="flex items-center gap-2 px-2 py-1 rounded-chip hover:bg-border transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-fg flex-shrink-0">
            {displayInitial}
          </div>
          {xp !== null && (
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
              {/* XP chip — amber-xp per DS gamification family (not on buttons,
                  this is a passive status readout). */}
              <span className="flex items-center gap-0.5 text-amber-xp">
                <Zap className="w-3 h-3" />
                {xp.toLocaleString()}
              </span>
              {/* Streak — amber-xp when active today, muted when idle.
                  Previously text-cream/30 which is invisible on Somun mode
                  (cream is hero-locked). */}
              <span className={cn(
                "flex items-center gap-0.5",
                activeToday ? "text-amber-xp" : "text-muted"
              )}>
                <Flame className="w-3 h-3" />
                {streak}
              </span>
            </div>
          )}
        </button>

        {userMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1rem)] rounded-chip border border-border bg-surface shadow-soft-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? t("profile")}
              </p>
              <p className="text-xs text-muted truncate">{user.email}</p>
              {xp !== null && (
                <div className="flex items-center gap-3 mt-1">
                  {/* ⚡/🔥 emoji swapped for Lucide icons per DS §8 (no emoji
                      as UI icons in chrome). Both chips stay amber-xp. */}
                  <span className="inline-flex items-center gap-1 text-xs text-amber-xp font-semibold">
                    <Zap className="w-3 h-3" />
                    {xp.toLocaleString()} XP
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-semibold",
                    activeToday ? "text-amber-xp" : "text-muted"
                  )}>
                    <Flame className="w-3 h-3" />
                    {streak} {streak === 1 ? "dan" : "dana"}
                  </span>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:text-foreground hover:bg-border transition-colors"
            >
              <User className="w-4 h-4" />
              {t("profile")}
            </Link>
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zar-red/80 hover:text-zar-red hover:bg-zar-red/5 transition-colors"
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo — wordmark is mode-aware (foreground); "App" accent keeps
                the bright vatra-hover hue in both modes as a brand constant. */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-chip bg-primary flex items-center justify-center shadow-brand group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5 text-primary-fg" />
              </div>
              <span className="font-display text-xl font-bold text-foreground tracking-widest uppercase">
                Chev<span className="text-vatra-hover">App</span>
              </span>
            </Link>

            {/* Desktop nav — inactive uses the 7shifts rule (transparent bg,
                muted text, no border on links), active uses the standard
                primary/10 + text-primary chip treatment. */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-chip text-sm font-medium transition-all duration-150",
                    isActive(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-border/60"
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
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded text-xs text-muted/60 hover:text-muted transition-colors"
                title="Admin"
                aria-label="Admin"
              >
                <Shield className="w-3.5 h-3.5" />
              </Link>
              <button
                className="md:hidden p-2 rounded-chip text-muted hover:text-foreground hover:bg-border transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
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
          <div className="md:hidden border-t border-border bg-surface">
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
                    "flex items-center gap-3 px-3 py-3 rounded-chip text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-border"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(key as "finder")}</span>
                </Link>
              ))}

              {/* Language + theme toggles */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted px-3 font-medium">{t("languageTheme")}</span>
                <div className="flex items-center gap-2 px-3">
                  <LanguageSwitcher locale={locale} />
                  <ThemeToggle />
                </div>
              </div>

              {/* Auth row */}
              {!authLoading && (
                <div className="pt-2 border-t border-border mt-1">
                  {user ? (
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-chip text-sm font-medium text-zar-red/80 hover:text-zar-red hover:bg-zar-red/5 w-full transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      {t("signOut")}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMobileOpen(false); setAuthOpen(true); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-chip text-sm font-medium text-primary hover:bg-primary/10 w-full transition-colors"
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
