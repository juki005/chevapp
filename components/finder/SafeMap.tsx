"use client";

// ── SafeMap.tsx · finder (Sprint 26ag · DS-migrated) ──────────────────────────
// Raw Leaflet (NOT react-leaflet) implementation with a singleton guard.
//
// Why raw Leaflet?
//   react-leaflet's <MapContainer> creates a new Leaflet instance internally,
//   but if the component is remounted (strict mode double-invoke, HMR, fast
//   navigation) the DOM node can still carry a `_leaflet_id`, causing the
//   dreaded "Map container is already initialized" crash.
//
//   Here we hold the map in a ref and explicitly call `.remove()` before each
//   new `.map()` call, so remounts are always safe.
//
// Exported via dynamic({ ssr: false }) — Leaflet reads `window` on import.
//
// Sprint 26ag changes:
//   - All rgb(var(--token)) Tailwind classes → semantic aliases.
//   - Inline <style> block CSS-var fallbacks removed (rgb(var(--surface,
//     30 27 24)) etc.) — same latent mode-mismatch fix as GastroMapClient
//     Sprint 26v. The hardcoded hex fallbacks were Ugljen-only and would
//     render mismatched on Somun if they ever fired (they don't in
//     practice, variables always defined in globals.css).
//   - buildPopupHtml() raw HTML strings: brand-orange #e65100 hex →
//     rgb(var(--primary)) (Leaflet popup is in the React tree, CSS vars
//     work). Foursquare blue #60a5fa kept as documented external-source
//     categorical marker (same precedent as TripAdvisor green, Spotify
//     green) — DS has no blue and "via Foursquare" is a passive data-
//     source readout, not app chrome.
//   - 🗺️ empty-state emoji + 📍 / 🔥 / 🩶 popup emoji tagged TODO(icons)
//     where appropriate.
//   - rounded-2xl → rounded-card.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapRestaurant {
  id?: string;
  fsq_id?: string;
  name: string;
  city: string;
  address: string;
  latitude:  number | null;
  longitude: number | null;
  lepinja_rating?: number;
  is_verified?: boolean;
  tags?: string[];
  source?: "supabase" | "foursquare";
}

interface Props {
  restaurants: MapRestaurant[];
  height?: string;
}

// ── Icon setup (done once) ────────────────────────────────────────────────────
const ICON_BASE = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images";
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl:     `${ICON_BASE}/marker-shadow.png`,
});

const ORANGE_ICON = new L.Icon({
  iconUrl:       `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl:     `${ICON_BASE}/marker-shadow.png`,
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  className:   "safemap-marker-orange",
});

const FSQ_ICON = new L.Icon({
  iconUrl:       `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl:     `${ICON_BASE}/marker-shadow.png`,
  iconSize:    [20, 33],
  iconAnchor:  [10, 33],
  popupAnchor: [1, -28],
  className:   "safemap-marker-fsq",
});

// ── Popup HTML builder ────────────────────────────────────────────────────────
// Foursquare blue (#60a5fa) is a documented external-source categorical marker
// — DS has no blue and "via Foursquare" is a passive data-origin readout, not
// app chrome (same precedent as TripAdvisor green, Spotify green).
const FSQ_BLUE = "#60a5fa";

function buildPopupHtml(r: MapRestaurant): string {
  const isFsq    = r.source === "foursquare";
  // TODO(icons): swap 📍 / 🔥 / 🩶 for brand <Pin> / <Vatra> SVG
  const emoji    = isFsq ? "📍" : "🔥";
  const badge    = isFsq
    ? `<span style="color:${FSQ_BLUE};border:1px solid ${FSQ_BLUE}33">via Foursquare</span>`
    : `<span style="color:rgb(var(--primary));border:1px solid rgb(var(--primary) / 0.4)">✓ Verificiran</span>`;
  const mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`;
  const flames   = r.lepinja_rating
    ? "🔥".repeat(r.lepinja_rating) + "🩶".repeat(5 - r.lepinja_rating)
    : "";

  const tagHtml = (r.tags ?? []).slice(0, 3)
    .map((t) => `<span style="font-size:10px;padding:2px 6px;border-radius:999px;background:rgb(var(--primary) / 0.15);color:rgb(var(--primary))">${t}</span>`)
    .join("");

  return `
    <div style="min-width:180px;padding:4px 2px;font-family:system-ui,sans-serif">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
        <span style="font-size:18px;line-height:1">${emoji}</span>
        <div>
          <p style="margin:0;font-weight:700;font-size:13px;line-height:1.3;font-family:'Oswald',sans-serif">${r.name}</p>
          <p style="margin:0;font-size:11px;opacity:.6">${r.city}</p>
        </div>
      </div>
      ${r.address ? `<p style="margin:0 0 6px;font-size:11px;opacity:.6">${r.address}</p>` : ""}
      ${flames ? `<p style="margin:0 0 6px;font-size:14px">${flames}</p>` : ""}
      ${tagHtml ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${tagHtml}</div>` : ""}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <span style="font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid transparent">${badge}</span>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
           style="font-size:10px;color:${FSQ_BLUE};text-decoration:none">
          Mapa →
        </a>
      </div>
    </div>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SafeMap({ restaurants, height = "500px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);

  // ── Phase 1: Mount the map exactly once ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── Singleton guard ───────────────────────────────────────────────────
    // If the container still carries a _leaflet_id from a previous mount
    // (HMR, React strict-mode double-invoke, fast navigation), destroy it
    // before calling L.map() to prevent "Map container already initialized".
    if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
      mapRef.current?.remove();
      mapRef.current  = null;
      layerRef.current = null;
    }

    const map = L.map(el, {
      center:    [44.1, 17.9],
      zoom:      6,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    // ── Cleanup: full map teardown on unmount ─────────────────────────────
    return () => {
      mapRef.current?.remove();
      mapRef.current  = null;
      layerRef.current = null;
    };
  }, []); // run exactly once — map never recreated unless unmounted

  // ── Phase 2: Sync markers whenever the restaurants array changes ─────────
  useEffect(() => {
    const map   = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const mapped = restaurants.filter(
      (r) => r.latitude != null && r.longitude != null
    );

    mapped.forEach((r) => {
      const icon = r.source === "foursquare" ? FSQ_ICON : ORANGE_ICON;
      L.marker([r.latitude as number, r.longitude as number], { icon })
        .bindPopup(buildPopupHtml(r), { maxWidth: 260 })
        .addTo(layer);
    });

    if (mapped.length > 0) {
      const bounds = L.latLngBounds(
        mapped.map((r) => [r.latitude as number, r.longitude as number])
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
  }, [restaurants]);

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-card overflow-hidden border border-border relative z-0"
    >
      {/* Inline CSS: marker tints + popup theme. CSS variables guaranteed
          defined by globals.css — fallbacks removed (Sprint 26v pattern,
          they were Ugljen-only and a latent mode-mismatch trap). */}
      <style>{`
        .safemap-marker-orange { filter: hue-rotate(168deg) saturate(2) brightness(1.1); }
        .safemap-marker-fsq    { filter: hue-rotate(200deg) saturate(.7) brightness(.9); opacity:.75; }
        .leaflet-popup-content-wrapper {
          background: rgb(var(--surface));
          color: rgb(var(--foreground));
          border: 1px solid rgb(var(--border));
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.4);
        }
        .leaflet-popup-tip { background: rgb(var(--surface)); }
        .leaflet-popup-close-button { color: rgb(var(--muted)) !important; }
      `}</style>

      {/* The raw DOM node Leaflet attaches to */}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

      {/* Empty-state overlay */}
      {restaurants.filter((r) => r.latitude != null).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/85 z-[1000] rounded-card pointer-events-none">
          {/* TODO(icons): swap 🗺️ for brand <Karta> */}
          <span className="text-5xl mb-3" aria-hidden="true">🗺️</span>
          <p className="text-foreground font-semibold text-base">
            Nema lokacija za prikaz
          </p>
          <p className="text-muted text-sm mt-1 text-center max-w-xs px-4">
            Pokrenite Seed ili pretražite grad iznad da se učitaju markeri.
          </p>
        </div>
      )}
    </div>
  );
}
