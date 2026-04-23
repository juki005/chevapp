"use client";

// ── MobileBottomNav · layout (Sprint 26e · DS-migrated) ──────────────────────
// Mobile bottom tab bar (md:hidden). 5-slot layout: Finder | Kuhinja | Rulet |
// Zajednica | Profil. Rulet is the center CTA — brand-orange pill.
//
// Sprint 26e changes:
//   - Container: bg-white/80 + dark:bg-gray-950/85 → bg-surface/80
//     (mode-aware via CSS var — one class, both themes). Same for borders:
//     border-gray-200/80 + dark:border-white/[0.07] → border-border/80.
//   - Active tab: bg-orange-100 / dark:bg-orange-500/20 → bg-primary/10;
//     text-orange-500 → text-primary.
//   - Inactive tab: text-gray-400 + dark:text-gray-500 → text-muted
//     (both modes through one token).
//   - Active "glow" boxShadow inline style → shadow-brand token (the
//     vatra glow shadow already in tailwind.config).
//   - Rulet button: inline linear-gradient + inline boxShadow dropped.
//     DS §8 forbids gradients on primary CTAs — flattened to bg-primary
//     + shadow-brand. Icon stroke uses text-primary-fg.
//   - rounded-2xl → rounded-chip (12px · matches DS shape scale).
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Users, ChefHat, User, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  locale: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const t        = useTranslations("nav");
  const pathname = usePathname();
  const prefix   = locale === "hr" ? "" : `/${locale}`;

  const isActive = (href: string) =>
    pathname === `${prefix}${href}` || pathname.startsWith(`${prefix}${href}/`);

  // When Rulet tapped: navigate to finder if not there, then open modal via event
  const handleRulet = () => {
    haptic("medium");
    const finderPath = `${prefix}/finder`;
    if (!pathname.startsWith(finderPath)) {
      window.location.href = `${finderPath}?rulet=1`;
    } else {
      window.dispatchEvent(new CustomEvent("chevapp:open_rulet"));
    }
  };

  // 4 main tabs — Finder | Kuhinja | [Rulet CTA] | Zajednica | Profil
  const NAV_LEFT = [
    { href: "/finder",    icon: MapPin,  labelKey: "finder"    },
    { href: "/kitchen",   icon: ChefHat, labelKey: "kitchen"   },
  ] as const;

  const NAV_RIGHT = [
    { href: "/community", icon: Users, labelKey: "community" },
    { href: "/profile",   icon: User,  labelKey: "profile"   },
  ] as const;

  return (
    <nav
      aria-label="Glavna navigacija"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50 border-t",
        "bg-surface/80 backdrop-blur-xl border-border/80",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">

        {/* Left two tabs */}
        {NAV_LEFT.map(({ href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${prefix}${href}`}
              aria-label={t(labelKey)}
              aria-current={active ? "page" : undefined}
              onClick={() => haptic("light")}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150 active:scale-95"
            >
              <div
                className={cn(
                  "w-10 h-7 rounded-chip flex items-center justify-center transition-all duration-200",
                  active ? "bg-primary/10 shadow-brand" : "bg-transparent",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    active ? "scale-110 text-primary" : "text-muted",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-wide leading-none truncate max-w-[52px] text-center transition-colors",
                  active ? "font-bold text-primary" : "font-medium text-muted",
                )}
              >
                {t(labelKey)}
              </span>
            </Link>
          );
        })}

        {/* ── Rulet action button — flat bg-primary per DS §8 (no gradients on
            primary CTAs); shadow-brand for the same vatra glow effect. ─────── */}
        <button
          onClick={handleRulet}
          aria-label={t("openRulet")}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150"
        >
          <div
            className={cn(
              "w-12 h-8 -mt-3 rounded-chip flex items-center justify-center",
              "bg-primary shadow-brand transition-transform active:scale-90 duration-150",
            )}
          >
            <Shuffle className="w-[18px] h-[18px] text-primary-fg" />
          </div>
          <span className="text-[10px] font-bold tracking-wide leading-none text-primary">
            {t("rulet")}
          </span>
        </button>

        {/* Right two tabs */}
        {NAV_RIGHT.map(({ href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${prefix}${href}`}
              aria-label={t(labelKey)}
              aria-current={active ? "page" : undefined}
              onClick={() => haptic("light")}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150 active:scale-95"
            >
              <div
                className={cn(
                  "w-10 h-7 rounded-chip flex items-center justify-center transition-all duration-200",
                  active ? "bg-primary/10 shadow-brand" : "bg-transparent",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    active ? "scale-110 text-primary" : "text-muted",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-wide leading-none truncate max-w-[52px] text-center transition-colors",
                  active ? "font-bold text-primary" : "font-medium text-muted",
                )}
              >
                {t(labelKey)}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}

/** Fire a short vibration on devices that support it. */
function haptic(style: "light" | "medium" = "light") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(style === "light" ? 10 : 30);
  }
}
