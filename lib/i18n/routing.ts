import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["hr", "en", "de", "sr", "bs", "sl"],
  defaultLocale: "hr",
  localePrefix: "as-needed", // hr → no prefix, /en/... for others
});
