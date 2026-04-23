import type { MetadataRoute } from "next";

// ── PWA manifest (Sprint 26e · DS-aligned) ───────────────────────────────────
// Next.js metadata routes return literals — we can't reference Tailwind's
// config from here, so hex values stay inline but every one is annotated
// back to its DS token for traceability.
// ─────────────────────────────────────────────────────────────────────────────

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChevApp",
    short_name: "ChevApp",
    description: "Pronađi, ocijeni i bilježi ćevapi restorane na Balkanu.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // somun.bg — light-mode app background (splash screen on iOS/Android).
    // Was #F9FAFB (the legacy app-bg alias); switched to the actual somun-bg
    // value so the splash matches the :root --background token.
    background_color: "#F9F7F2",
    // vatra-hover — used for browser chrome / status bar tint. We keep the
    // brighter #FF6B00 over vatra.DEFAULT (#D35400) because mobile OS chrome
    // benefits from the more saturated value; matches the brand-orange token
    // per tailwind.config §vatra.hover.
    theme_color: "#FF6B00",
    categories: ["food", "lifestyle", "travel"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [],
  };
}
