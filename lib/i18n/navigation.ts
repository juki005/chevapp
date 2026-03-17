// Single source of truth for all locale-aware navigation in ChevApp.
//
// Import Link, useRouter, usePathname from HERE (not from next/navigation or next-intl directly)
// whenever you need locale-aware routing.
//
// Key behaviour with localePrefix: "as-needed":
//   - usePathname() returns the path WITHOUT the locale segment
//     e.g. on /en/finder  → returns "/finder"
//         on /finder      → returns "/finder"  (HR default, no prefix)
//   - router.push("/finder", { locale: "en" }) → navigates to /en/finder
//   - router.push("/finder", { locale: "hr" }) → navigates to /finder  (no prefix)

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
