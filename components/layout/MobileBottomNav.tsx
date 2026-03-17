"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ChefHat, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  locale: string;
}

const BOTTOM_ITEMS = [
  { href: "/finder",   icon: MapPin,        label: "Ruta"      },
  { href: "/academy",  icon: GraduationCap, label: "Akademija" },
  { href: "/kitchen",  icon: ChefHat,       label: "Kuhinja"   },
  { href: "/profile",  icon: User,          label: "Profil"    },
] as const;

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const prefix   = locale === "hr" ? "" : `/${locale}`;

  const isActive = (href: string) =>
    pathname === `${prefix}${href}` || pathname.startsWith(`${prefix}${href}/`);

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-charcoal-700 dark:border-ugljen-border",
        "bg-charcoal-800/98 dark:bg-ugljen-surface/98 backdrop-blur-md",
        // Safe-area inset for notch/home-indicator devices
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex items-stretch h-16">
        {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${prefix}${href}`}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 px-2 py-2",
                "min-h-[44px] transition-all duration-150 rounded-none",
                active ? "text-burnt-orange-400" : "text-cream/40 hover:text-cream/70",
              )}
            >
              {/* Icon pill — highlighted when active */}
              <div
                className={cn(
                  "w-10 h-7 rounded-2xl flex items-center justify-center transition-all",
                  active
                    ? "bg-burnt-orange-500/20 shadow-[0_0_10px_rgba(211,84,0,0.25)]"
                    : "",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    active ? "scale-110 drop-shadow-[0_0_6px_rgba(211,84,0,0.6)]" : "",
                  )}
                />
              </div>
              <span className="text-[10px] font-medium tracking-wide leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
