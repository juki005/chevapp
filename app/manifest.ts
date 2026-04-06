import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChevApp",
    short_name: "ChevApp",
    description: "Pronađi, ocijeni i bilježi ćevapi restorane na Balkanu.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9FAFB",
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
