import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/API routes out of indexes
        disallow: ["/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
