"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Route, Users, User, Shuffle } from "lucide-react";
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

  // Tab definitions — Finder | Route | Rulet | Community | Profile
  const NAV_ITEMS = [
    { href: "/finder",        icon: MapPin, labelKey: "finder"       },
    { href: "/route-planner", icon: Route,  labelKey: "routePlanner" },
  ] as const;

  const NAV_ITEMS_RIGHT = [
    { href: "/community", icon: Users, labelKey: "community" },
    { href: "/profile",   icon: User,  labelKey: "profile"   },
  ] as const;

  return (
    <nav
      aria-label="Glavna navigacija"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t"
      style={{
        background: "rgb(var(--surface) / 0.97)",
        borderColor: "rgb(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch h-16">

        {/* Left two tabs */}
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${prefix}${href}`}
              aria-label={t(labelKey)}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150"
              style={{ color: active ? "rgb(var(--primary))" : "rgb(var(--muted))" }}
            >
              <div
                className="w-10 h-7 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={active ? {
                  background: "rgb(var(--primary) / 0.15)",
                  boxShadow: "0 0 10px rgb(var(--primary) / 0.25)",
                } : {}}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110")} />
              </div>
              <span className={cn("text-[10px] tracking-wide leading-none truncate max-w-[52px] text-center", active ? "font-semibold" : "font-medium")}>
                {t(labelKey)}
              </span>
            </Link>
          );
        })}

        {/* ── Rulet action button — raised orange pill ─────────────────────── */}
        <button
          onClick={handleRulet}
          aria-label={t("openRulet")}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150"
          style={{ color: "#F97316" }}
        >
          <div
            className="w-12 h-8 -mt-3 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
            style={{
              background: "linear-gradient(135deg, #E84E0F 0%, #F97316 100%)",
              boxShadow: "0 4px 14px rgba(232,78,15,0.45)",
            }}
          >
            <Shuffle className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide leading-none">
            {t("rulet")}
          </span>
        </button>

        {/* Right two tabs */}
        {NAV_ITEMS_RIGHT.map(({ href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${prefix}${href}`}
              aria-label={t(labelKey)}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150"
              style={{ color: active ? "rgb(var(--primary))" : "rgb(var(--muted))" }}
            >
              <div
                className="w-10 h-7 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={active ? {
                  background: "rgb(var(--primary) / 0.15)",
                  boxShadow: "0 0 10px rgb(var(--primary) / 0.25)",
                } : {}}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110")} />
              </div>
              <span className={cn("text-[10px] tracking-wide leading-none truncate max-w-[52px] text-center", active ? "font-semibold" : "font-medium")}>
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
