"use client";

// ── GastroMapClient · profile (Sprint 26v · DS-migrated) ──────────────────────
// Leaflet-backed map showing best-rated city pins from the user's journal.
// ⚠️ Load only via next/dynamic({ ssr: false }) — Leaflet touches `window`
// on import.
//
// Sprint 26v changes:
//   - All rgb(var(--token)) Tailwind classes → semantic aliases.
//   - Inline style={{fontFamily:"Oswald"}} on Popup title → font-display.
//   - rounded-2xl wrapper → rounded-card.
//   - Inline <style> block for Leaflet popup theming: removed defensive
//     CSS-var fallback values. Original was rgb(var(--surface, 30 27 24))
//     etc. — the fallbacks hardcoded Ugljen-mode colours, which would
//     render mode-mismatched if they ever fired (Somun mode page with
//     dark popup chrome). In practice fallbacks never trigger because the
//     CSS variables are always defined in globals.css; removing them
//     prevents the latent mode-mismatch trap if globals ever stop loading
//     in some edge case.
//   - 🔥 / 🩶 flame rating glyphs in popup tagged TODO(icons) +
//     aria-hidden — content marker for popup rating display, Sprint 27.
//   - 🗺️ empty-state icon tagged TODO(icons) + aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef, useState, useId } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix webpack-hashed icon paths ─────────────────────────────────────────────
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images";
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       `${CDN}/marker-icon.png`,
  iconRetinaUrl: `${CDN}/marker-icon-2x.png`,
  shadowUrl:     `${CDN}/marker-shadow.png`,
});

const FLAME_ICON = new L.Icon({
  iconUrl:       `${CDN}/marker-icon.png`,
  iconRetinaUrl: `${CDN}/marker-icon-2x.png`,
  shadowUrl:     `${CDN}/marker-shadow.png`,
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  className:     "gastro-marker",
});

// ── Hardcoded coordinates for Balkan cities ───────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  "Sarajevo":      [43.8563, 18.4131],
  "Banja Luka":    [44.7722, 17.1910],
  "Banjaluka":     [44.7722, 17.1910],
  "Mostar":        [43.3438, 17.8078],
  "Travnik":       [44.2263, 17.6651],
  "Tuzla":         [44.5384, 18.6734],
  "Zenica":        [44.2018, 17.9077],
  "Bihać":         [44.8175, 15.8708],
  "Goražde":       [43.6687, 18.9759],
  "Konjic":        [43.6569, 17.9611],
  "Jajce":         [44.3393, 17.2707],
  "Fojnica":       [43.9665, 17.9019],
  "Leskovac":      [42.9983, 21.9463],
  "Niš":           [43.3209, 21.8954],
  "Novi Sad":      [45.2671, 19.8335],
  "Beograd":       [44.8176, 20.4633],
  "Subotica":      [46.1000, 19.6648],
  "Kragujevac":    [44.0165, 20.9114],
  "Čačak":         [43.8914, 20.3497],
  "Zagreb":        [45.8150, 15.9819],
  "Split":         [43.5081, 16.4402],
  "Dubrovnik":     [42.6507, 18.0944],
  "Rijeka":        [45.3271, 14.4422],
  "Osijek":        [45.5511, 18.6939],
  "Ljubljana":     [46.0569, 14.5058],
  "Maribor":       [46.5547, 15.6459],
  "Podgorica":     [42.4304, 19.2594],
  "Bar":           [42.0977, 19.1004],
  "Nikšić":        [42.7767, 18.9445],
  "Priština":      [42.6629, 21.1655],
  "Prizren":       [42.2139, 20.7397],
  "Skopje":        [41.9973, 21.4280],
  "Bitola":        [41.0297, 21.3341],
  "Tirana":        [41.3275, 19.8187],
  "Durrës":        [41.3233, 19.4414],
};

function resolveCoords(city: string): [number, number] | null {
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  const lower = city.toLowerCase();
  const key = Object.keys(CITY_COORDS).find((k) => k.toLowerCase() === lower);
  return key ? CITY_COORDS[key] : null;
}

// ── Auto-fit bounds ───────────────────────────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map  = useMap();
  const prev = useRef(0);
  useEffect(() => {
    if (positions.length === 0 || positions.length === prev.current) return;
    prev.current = positions.length;
    if (positions.length === 1) {
      map.setView(positions[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 13 });
    }
  }, [map, positions]);
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GastroPin {
  city:       string;
  restaurant: string;
  rating:     number;
  date:       string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GastroMapClient({
  pins,
  height = "240px",
}: {
  pins:    GastroPin[];
  height?: string;
}) {
  // Each React mount gets a unique ID → used as MapContainer key so React
  // always creates a FRESH DOM node, preventing Leaflet from encountering
  // an already-initialised container when the tab is revisited.
  const instanceId = useId();

  // Hold the Leaflet map instance so we can explicitly destroy it on unmount.
  const mapRef = useRef<L.Map | null>(null);

  // Gate: render MapContainer only after the previous instance's cleanup has
  // had a chance to run (rAF gives Leaflet's async teardown time to finish).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setReady(true));

    return () => {
      cancelAnimationFrame(rafId);
      // Explicitly remove the Leaflet map instance before React unmounts the
      // DOM node.  Without this, fast tab-switching leaves a "zombie" instance
      // that throws "Map container is already initialized" on the next mount.
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) { /* already removed */ }
        mapRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // Deduplicate: keep best-rated entry per city
  const cityMap = new Map<string, GastroPin>();
  for (const p of pins) {
    const existing = cityMap.get(p.city);
    if (!existing || p.rating > existing.rating) cityMap.set(p.city, p);
  }

  const resolved = Array.from(cityMap.values())
    .map((p) => ({ ...p, coords: resolveCoords(p.city) }))
    .filter((p): p is GastroPin & { coords: [number, number] } => p.coords !== null);

  const positions = resolved.map((p) => p.coords);
  // TODO(icons): swap 🔥 / 🩶 flame ratings for brand <Vatra> filled/empty SVG
  const flames    = (n: number) => "🔥".repeat(n) + "🩶".repeat(5 - n);

  return (
    <div
      style={{ height, width: "100%" }}
      className="rounded-card overflow-hidden border border-border relative z-0"
    >
      {/* Leaflet popup theming. CSS variables are guaranteed defined by
          globals.css (both Ugljen + Somun modes) so no fallback values —
          fallbacks would hardcode one mode and risk mismatch if they fired. */}
      <style>{`
        .gastro-marker { filter: hue-rotate(168deg) saturate(2) brightness(1.1); }
        .leaflet-popup-content-wrapper {
          background: rgb(var(--surface));
          color: rgb(var(--foreground));
          border: 1px solid rgb(var(--border));
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .leaflet-popup-tip { background: rgb(var(--surface)); }
        .leaflet-popup-close-button { color: rgb(var(--muted)) !important; }
      `}</style>

      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
          Učitavam kartu…
        </div>
      ) : (
        // key={instanceId} guarantees React allocates a brand-new DOM node for
        // every mount of this component, so Leaflet never sees a used container.
        <MapContainer
          key={instanceId}
          ref={(map: L.Map | null) => { mapRef.current = map; }}
          center={resolved[0]?.coords ?? [44.1, 17.9]}
          zoom={6}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />

          <FitBounds positions={positions} />

          {resolved.map((p, i) => (
            <Marker key={`${p.city}-${i}`} position={p.coords} icon={FLAME_ICON}>
              <Popup maxWidth={200}>
                <div className="p-1">
                  <p className="font-display font-bold text-sm">
                    {p.restaurant}
                  </p>
                  <p className="text-xs opacity-60 mt-0.5">{p.city} · {p.date}</p>
                  <p className="text-sm mt-1" aria-label={`Ocjena ${p.rating} od 5`}>
                    <span aria-hidden="true">{flames(p.rating)}</span>
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {resolved.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 z-[1000] rounded-card">
          {/* TODO(icons): swap 🗺️ for brand <Karta> */}
          <span className="text-4xl mb-2" aria-hidden="true">🗺️</span>
          <p className="text-muted text-sm text-center px-4">
            Gradovi iz dnevnika pojavit će se na karti.
          </p>
        </div>
      )}
    </div>
  );
}
