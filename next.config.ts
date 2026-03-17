import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Leaflet and react-leaflet must be transpiled so Next.js handles
  // their ESM/CJS correctly in the app router.
  transpilePackages: ["leaflet", "react-leaflet"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cnzoqfxhnautkgctksbj.supabase.co" },
      { protocol: "https", hostname: "fastly.4sqi.net" },
      { protocol: "https", hostname: "img.youtube.com" },
      // Leaflet CDN marker icons
      { protocol: "https", hostname: "cdnjs.cloudflare.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
