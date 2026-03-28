import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";

const BASE           = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DEFAULT_LOCALE = routing.defaultLocale; // "hr" — no URL prefix

// ── Public pages ──────────────────────────────────────────────────────────────
// Auth-only routes (/profile, /admin) and API routes are intentionally excluded.
const PAGES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "",               priority: 1.0, freq: "daily"   }, // home
  { path: "/finder",        priority: 0.9, freq: "daily"   }, // restaurant finder — most-visited
  { path: "/route-planner", priority: 0.8, freq: "weekly"  },
  { path: "/academy",       priority: 0.7, freq: "weekly"  },
  { path: "/kitchen",       priority: 0.7, freq: "weekly"  },
  { path: "/community",     priority: 0.6, freq: "weekly"  },
  { path: "/jukebox",       priority: 0.5, freq: "monthly" },
];

/** Build an absolute URL respecting next-intl's localePrefix: "as-needed" */
function url(locale: string, path: string): string {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return `${BASE}${prefix}${path || "/"}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PAGES.flatMap(({ path, priority, freq }) =>
    routing.locales.map((locale) => ({
      url:              url(locale, path),
      lastModified,
      changeFrequency:  freq,
      priority,
    }))
  );
}
