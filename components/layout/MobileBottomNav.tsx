"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ChefHat, GraduationCap, User, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  locale: string;
}

// ── Nav items ─────────────────────────────────────────────────────────────────
// "rulet" is a special action item (fires custom event to open the Rulet modal)
type NavItem =
  | { type: "link";   href: string; icon: React.ElementType; label: string }
  | { type: "action"; id: string;   icon: React.ElementType; label: string };

const BOTTOM_ITEMS: NavItem[] = [
  { type: "link",   href: "/finder",  icon: MapPin,        label: "Finder"    },
  { type: "link",   href: "/academy", icon: GraduationCap, label: "Akademija" },
  { type: "action", id:  "rulet",     icon: Shuffle,       label: "Rulet"     },
  { type: "link",   href: "/kitchen", icon: ChefHat,       label: "Kuhinja"   },
  { type: "link",   href: "/profile", icon: User,          label: "Profil"    },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const prefix   = locale === "hr" ? "" : `/${locale}`;

  const isActive = (href: string) =>
    pathname === `${prefix}${href}` || pathname.startsWith(`${prefix}${href}/`);

  // When Rulet tapped: navigate to finder if not there, then open modal via event
  const handleRulet = () => {
    const finderPath = `${prefix}/finder`;
    if (!pathname.startsWith(finderPath)) {
      window.location.href = `${finderPath}?rulet=1`;
    } else {
      window.dispatchEvent(new CustomEvent("chevapp:open_rulet"));
    }
  };

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
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;

          // ── Rulet action button — raised orange pill ──────────────────────
          if (item.type === "action") {
            return (
              <button
                key={item.id}
                onClick={handleRulet}
                aria-label="Otvori Ćevap-Rulet"
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
                  <Icon className="w-[18px] h-[18px] text-white" />
                </div>
                <span className="text-[10px] font-semibold tracking-wide leading-none">
                  {item.label}
                </span>
              </button>
            );
          }

          // ── Standard link item ───────────────────────────────────────────
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`${prefix}${item.href}`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 px-2 min-h-[48px] transition-all duration-150"
              style={{ color: active ? "rgb(var(--primary))" : "rgb(var(--muted))" }}
            >
              {/* Active indicator pill */}
              <div
                className="w-10 h-7 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={active ? {
                  background: "rgb(var(--primary) / 0.15)",
                  boxShadow: "0 0 10px rgb(var(--primary) / 0.25)",
                } : {}}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110")} />
              </div>
              <span className={cn("text-[10px] tracking-wide leading-none", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
