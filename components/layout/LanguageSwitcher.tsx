"use client";

// ── LanguageSwitcher · layout (Sprint 26f · DS-migrated) ─────────────────────
// Globe dropdown in the top bar. 6 locales (hr/en/de/sr/bs/sl).
//
// Sprint 26f changes:
//   - Arbitrary rgb(var(--token)) classes → semantic aliases (text-muted,
//     text-foreground, bg-surface, border-border, bg-primary, text-primary).
//   - rounded-lg / rounded-xl → rounded-chip (DS shape scale).
//   - shadow-xl → shadow-soft-xl.
//   - Added aria-haspopup / aria-expanded to the trigger, role="menu" +
//     role="menuitem" on the dropdown items.
//   - Flag emoji kept — it's content, not UI chrome (language-as-flag is a
//     universal convention, no brand-icon swap planned).
//   - Check glyph (✓) tagged TODO(icons) for the Sprint 27 brand-icon pass.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️  Import useRouter + usePathname from next-intl navigation — NOT from next/navigation.
// next/navigation's router has no concept of locale prefixes. Pushing "/finder" from
// "/en/finder" via next/navigation just re-renders the same route without triggering
// the middleware locale redirect, so the URL stays stuck on /en/.
//
// next-intl's createNavigation() gives us:
//   • usePathname() → path WITHOUT locale prefix (e.g. "/finder" on both / and /en/finder)
//   • useRouter()   → router.push(path, { locale }) that correctly builds the prefixed URL

import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "hr", label: "Hrvatski",     flag: "🇭🇷" },
  { code: "en", label: "English",      flag: "🇬🇧" },
  { code: "de", label: "Deutsch",      flag: "🇩🇪" },
  { code: "sr", label: "Srpski",       flag: "🇷🇸" },
  { code: "bs", label: "Bosanski",     flag: "🇧🇦" },
  { code: "sl", label: "Slovenščina",  flag: "🇸🇮" },
];

export function LanguageSwitcher({ locale }: { locale: string }) {
  // pathname is already locale-stripped (e.g. "/finder", never "/en/finder")
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const switchLocale = (newLocale: string) => {
    setOpen(false);
    // next-intl handles all prefix logic:
    //   hr → /finder        (as-needed: no prefix for default locale)
    //   en → /en/finder
    //   de → /de/finder  etc.
    router.push(pathname, { locale: newLocale });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-chip text-sm",
          "text-muted hover:text-foreground hover:bg-border/40 transition-colors",
        )}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline font-medium">
          {current.flag} {current.code.toUpperCase()}
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 w-44 rounded-chip border border-border bg-surface shadow-soft-xl overflow-hidden"
          >
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                role="menuitem"
                onClick={() => switchLocale(loc.code)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors",
                  locale === loc.code
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-border/30",
                )}
              >
                <span>{loc.flag}</span>
                <span className="font-medium">{loc.label}</span>
                {locale === loc.code && (
                  // TODO(icons): swap ✓ for brand <Check> or lucide Check when Sprint 27 lands
                  <span className="ml-auto text-[10px] opacity-60" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
