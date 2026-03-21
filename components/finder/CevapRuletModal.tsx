"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, RefreshCw, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
// ── Types ─────────────────────────────────────────────────────────────────────
export interface RouletteItem {
  key:       string;
  name:      string;
  city:      string;
  address?:  string;
  latitude?: number | null;
  longitude?: number | null;
}

type RuletMode = "grad" | "blizu" | "wishlist" | "avantura";

interface Props {
  isOpen:      boolean;
  onClose:     () => void;
  currentCity: string;   // city dropdown value from finder (may be "")
  searchTerm:  string;   // text search box value — often a city name
  userId:      string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SEGMENT_COLORS = [
  "#E84E0F", "#F97316", "#EA580C", "#C2410C",
  "#B45309", "#D97706", "#F59E0B", "#FBBF24",
];

const MODES: { key: RuletMode; emoji: string; label: string; desc: string }[] = [
  { key: "grad",     emoji: "🏙️", label: "Gradski Rulet",   desc: "Google Places · odabrani grad" },
  { key: "blizu",    emoji: "📍", label: "Blizu Mene",      desc: "GPS + Google · okolica 100km" },
  { key: "wishlist", emoji: "🔖", label: "Moja Wishlista",  desc: "Samo s tvoje wishlist" },
  { key: "avantura", emoji: "🎲", label: "Avantura!",       desc: "Google · nasumičan grad regije" },
];

const ADVENTURE_CITIES = ["Sarajevo", "Mostar", "Zagreb", "Beograd", "Banja Luka", "Split", "Ljubljana", "Skopje", "Tuzla", "Novi Sad"];

const MAX_SEGMENTS = 8;
const SPIN_DURATION = 3800; // ms
const SPIN_ROTATIONS = 6;

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Wheel canvas drawing ──────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, segments: RouletteItem[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx || segments.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const r  = cx - 6;
  const n  = segments.length;
  const arc = (2 * Math.PI) / n;

  // Outer glow ring
  const glow = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r + 4);
  glow.addColorStop(0, "rgba(232,78,15,0.0)");
  glow.addColorStop(1, "rgba(232,78,15,0.3)");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
  ctx.fillStyle = glow;
  ctx.fill();

  segments.forEach((seg, i) => {
    const startAngle = i * arc - Math.PI / 2;
    const endAngle   = startAngle + arc;
    const color      = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();

    // Radial gradient per slice (lighter at center, darker at edge)
    const midAngle = startAngle + arc / 2;
    const gx = cx + (r * 0.5) * Math.cos(midAngle);
    const gy = cy + (r * 0.5) * Math.sin(midAngle);
    const sliceGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.9);
    sliceGrad.addColorStop(0, lighten(color, 30));
    sliceGrad.addColorStop(1, color);
    ctx.fillStyle = sliceGrad;
    ctx.fill();

    // Separator line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + (r + 2) * Math.cos(startAngle),
      cy + (r + 2) * Math.sin(startAngle),
    );
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Text label
    const textR    = r * 0.62;
    const tx       = cx + textR * Math.cos(midAngle);
    const ty       = cy + textR * Math.sin(midAngle);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font      = `bold ${n > 6 ? 10 : 12}px "Oswald", sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur  = 3;
    let label = seg.name;
    if (label.length > 11) label = label.slice(0, 10) + "…";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  // Outer rim ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth   = 3;
  ctx.stroke();

  // Center hub
  const hubR = 26;
  const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, hubR);
  hubGrad.addColorStop(0, "#3a1a0a");
  hubGrad.addColorStop(1, "#1a0a00");
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(232,78,15,0.6)";
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Center emoji
  ctx.font = "18px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur   = 0;
  ctx.fillText("🎡", cx, cy + 1);
}

// ── Simple color lightening helper ────────────────────────────────────────────
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

// ── Tick sound (Web Audio API) ────────────────────────────────────────────────
function playTick() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 900;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
    setTimeout(() => ctx.close(), 200);
  } catch { /* audio not available */ }
}

// ── Confetti ──────────────────────────────────────────────────────────────────
async function fireConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 140,
      spread: 90,
      origin:  { x: 0.5, y: 0.55 },
      colors:  ["#E84E0F", "#F97316", "#FBBF24", "#ffffff", "#FED7AA"],
      gravity: 1.1,
      scalar:  1.1,
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { x: 0.2, y: 0.5 },
        colors: ["#E84E0F", "#FBBF24", "#fff"],
      });
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { x: 0.8, y: 0.5 },
        colors: ["#F97316", "#FED7AA", "#fff"],
      });
    }, 300);
  } catch { /* confetti not available */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Component
// ─────────────────────────────────────────────────────────────────────────────
export function CevapRuletModal({
  isOpen, onClose, currentCity, searchTerm, userId,
}: Props) {
  const supabase = createClient();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef   = useRef(false);

  const [mode,        setMode]        = useState<RuletMode>("grad");
  const [segments,    setSegments]    = useState<RouletteItem[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError,   setPoolError]   = useState<string | null>(null);
  const [statusMsg,   setStatusMsg]   = useState<string>("");   // "Tražim restorane u Sarajevu…"
  const [rotation,    setRotation]    = useState(0);
  const [isSpinning,  setIsSpinning]  = useState(false);
  const [winner,      setWinner]      = useState<RouletteItem | null>(null);
  const [winnerIdx,   setWinnerIdx]   = useState<number>(-1);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => { setMounted(true); mountedRef.current = true; }, []);

  // ── Re-draw canvas whenever segments change ───────────────────────────────
  useEffect(() => {
    if (canvasRef.current && segments.length > 0) {
      drawWheel(canvasRef.current, segments);
    }
  }, [segments]);

  // ── Google Places fetch helper ────────────────────────────────────────────
  const fetchPlaces = useCallback(async (city: string): Promise<RouletteItem[]> => {
    const params = new URLSearchParams({ near: city, query: "cevapi rostilj grill", limit: "20" });
    const res  = await fetch(`/api/places?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.hint ?? json?.error ?? `Greška pri Google pretraživanju (${res.status})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.results as any[]).map((r) => ({
      key:       r.place_id,
      name:      r.name,
      city:      r.city ?? city,
      address:   r.address,
      latitude:  r.latitude,
      longitude: r.longitude,
    }));
  }, []);

  // ── Build pool for selected mode ─────────────────────────────────────────
  const buildPool = useCallback(async (): Promise<RouletteItem[]> => {
    setPoolError(null);

    // ── Gradski Rulet ─────────────────────────────────────────────────────
    if (mode === "grad") {
      const city = (currentCity || searchTerm).trim();
      if (!city) throw new Error(
        "Upiši naziv grada u pretraživač ili odaberi grad iz padajućeg izbornika, pa ponovo otvori Rulet."
      );
      setStatusMsg(`Tražim restorane u ${city}…`);
      const places = await fetchPlaces(city);
      if (places.length === 0) throw new Error(`Google nije pronašao ćevabdžinice za "${city}". Pokušaj drugi grad.`);
      return places;
    }

    // ── Blizu Mene — GPS + reverse geocode + Google Places ────────────────
    if (mode === "blizu") {
      setStatusMsg("Čekam dozvolu za lokaciju…");
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("GPS nije dostupan u ovom pregledniku.")); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          ()    => reject(new Error("Dozvola za lokaciju odbijena. Provjeri postavke preglednika.")),
          { timeout: 10000 }
        );
      });

      // Reverse-geocode with Nominatim (free, no key)
      setStatusMsg("Pronašao sam te! Tražim grad…");
      const geoRes  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=hr`,
        { headers: { "User-Agent": "ChevApp/1.0 contact@chevapp.com" } }
      );
      const geoData = await geoRes.json() as { address?: { city?: string; town?: string; village?: string; county?: string } };
      const city    = geoData.address?.city ?? geoData.address?.town ?? geoData.address?.village ?? geoData.address?.county ?? "";
      if (!city) throw new Error("Nije moguće odrediti grad iz GPS koordinata. Pokušaj ručno unijeti grad.");

      setStatusMsg(`GPS lokacija: ${city} · Tražim restorane…`);
      const places = await fetchPlaces(city);
      if (places.length === 0) throw new Error(`Nema ćevabdžinica na Google Mapsu za "${city}".`);

      // Optional: further filter by actual distance from user
      return places.filter((p) =>
        p.latitude == null || p.longitude == null ||
        haversine(coords.latitude, coords.longitude, p.latitude!, p.longitude!) <= 100
      ).concat(
        places.filter((p) => p.latitude == null || p.longitude == null)
      ).slice(0, 20);
    }

    // ── Moja Wishlista ────────────────────────────────────────────────────
    if (mode === "wishlist") {
      const items: RouletteItem[] = [];

      // localStorage (Google Places saved as "Name::City")
      try {
        const lsKeys = JSON.parse(localStorage.getItem("chevapp:place_wishlist") ?? "[]") as string[];
        for (const k of lsKeys) {
          const sep  = k.indexOf("::");
          const name = sep >= 0 ? k.slice(0, sep) : k;
          const city = sep >= 0 ? k.slice(sep + 2) : "";
          items.push({ key: k, name, city });
        }
      } catch { /* ignore */ }

      // Supabase DB wishlist
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from("user_wishlist") as any)
          .select("restaurants(id, name, city, address, latitude, longitude)")
          .eq("user_id", userId);
        if (data) {
          for (const row of data as { restaurants: { id: string; name: string; city: string; address: string; latitude: number | null; longitude: number | null } | null }[]) {
            const r = row.restaurants;
            if (r && !items.find((i) => i.key === r.id)) {
              items.push({ key: r.id, name: r.name, city: r.city, address: r.address, latitude: r.latitude, longitude: r.longitude });
            }
          }
        }
      }

      if (items.length === 0) throw new Error("Wishlist je prazan. Dodaj restorane klikom na 🔖 u profilu restorana.");
      return items;
    }

    // ── Avantura — random Balkan city, exclude already-favourited ─────────
    if (mode === "avantura") {
      // Exclude everything already on fav/wishlist (by name::city key)
      const excluded = new Set<string>();
      try {
        const lsFavs = JSON.parse(localStorage.getItem("chevapp:place_favorites") ?? "[]") as string[];
        const lsWish = JSON.parse(localStorage.getItem("chevapp:place_wishlist")  ?? "[]") as string[];
        [...lsFavs, ...lsWish].forEach((k) => excluded.add(k.toLowerCase()));
      } catch { /* ignore */ }

      // Pick random city from the adventure list
      const adventureCity = ADVENTURE_CITIES[Math.floor(Math.random() * ADVENTURE_CITIES.length)];
      setStatusMsg(`Avantura te vodi u ${adventureCity}…`);
      const places = await fetchPlaces(adventureCity);
      if (places.length === 0) throw new Error(`Nema rezultata za "${adventureCity}". Pokušaj ponovno!`);

      const pool = places.filter((p) => !excluded.has(`${p.name}::${p.city}`.toLowerCase()));
      return pool.length > 0 ? pool : places; // fallback to all if everything excluded
    }

    return [];
  }, [mode, currentCity, searchTerm, fetchPlaces, userId, supabase]);

  // ── Reload pool whenever mode changes or modal opens ─────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setWinner(null);
    setWinnerIdx(-1);
    setPoolError(null);
    setStatusMsg("");
    setPoolLoading(true);

    buildPool()
      .then((pool) => {
        const shuffled = shuffle(pool).slice(0, MAX_SEGMENTS);
        setSegments(shuffled);
        setStatusMsg("");
      })
      .catch((err: Error) => {
        setPoolError(err.message);
        setSegments([]);
        setStatusMsg("");
      })
      .finally(() => setPoolLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // ── Spin logic ────────────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (isSpinning || segments.length === 0) return;

    // Pick a random winner from the segments
    const idx = Math.floor(Math.random() * segments.length);
    const n   = segments.length;
    const segAngle = 360 / n;

    // We want segment `idx` to land under the pointer (top, 12 o'clock)
    // Pointer = 0° in screen space. Segment center angle (in wheel space) = idx * segAngle + segAngle/2
    // After total rotation R: winnerCenter + R ≡ 0 (mod 360) → R = (−winnerCenter) mod 360
    const winnerCenterAngle = idx * segAngle + segAngle / 2;
    const toTop = ((360 - winnerCenterAngle) % 360);

    // Build from accumulated rotation so wheel always spins forward
    const base     = Math.ceil((rotation + 1) / 360) * 360;
    const newRot   = base + SPIN_ROTATIONS * 360 + toTop;

    setIsSpinning(true);
    setWinner(null);
    setWinnerIdx(-1);
    setRotation(newRot);

    // Tick sound — speeds up then slows
    let tickInterval = 80;
    const startTicking = () => {
      playTick();
      tickInterval = Math.min(tickInterval * 1.08, 400);
      tickTimerRef.current = setTimeout(startTicking, tickInterval);
    };
    startTicking();

    // Finish
    setTimeout(() => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      if (!mountedRef.current) return;
      setIsSpinning(false);
      setWinner(segments[idx]);
      setWinnerIdx(idx);
      fireConfetti();
    }, SPIN_DURATION);
  }, [isSpinning, segments, rotation]);

  // ── Reset when closed ─────────────────────────────────────────────────────
  const handleClose = () => {
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    onClose();
    setTimeout(() => {
      setWinner(null);
      setWinnerIdx(-1);
      setIsSpinning(false);
      setRotation(0);
    }, 300);
  };

  // ── Re-spin ───────────────────────────────────────────────────────────────
  const handleRespin = () => {
    setWinner(null);
    setWinnerIdx(-1);
    setPoolLoading(true);
    buildPool()
      .then((pool) => setSegments(shuffle(pool).slice(0, MAX_SEGMENTS)))
      .catch((err: Error) => setPoolError(err.message))
      .finally(() => setPoolLoading(false));
  };

  if (!mounted) return null;

  // ── Navigation URL ────────────────────────────────────────────────────────
  const navUrl = winner
    ? winner.latitude && winner.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${winner.latitude},${winner.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${winner.name} ${winner.city}`)}`
    : "#";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rulet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              zIndex: 9998,
            }}
          />

          {/* Modal panel */}
          <motion.div
            key="rulet-panel"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.92, y: 30  }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: "fixed", zIndex: 9999,
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(96vw, 560px)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "rgb(var(--surface))",
              border: "1px solid rgba(232,78,15,0.25)",
              borderRadius: "24px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,78,15,0.1)",
              scrollbarWidth: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Orange gradient stripe at top ────────────────────────── */}
            <div style={{ height: 4, background: "linear-gradient(90deg, #E84E0F, #F97316, #FBBF24, #F97316, #E84E0F)", borderRadius: "24px 24px 0 0" }} />

            <div style={{ padding: "20px 20px 24px" }}>

              {/* ── Header ─────────────────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>🎡</span>
                  <div>
                    <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 800, fontSize: 20, color: "rgb(var(--foreground))", letterSpacing: "0.05em", margin: 0, lineHeight: 1 }}>
                      ĆEVAP-RULET
                    </p>
                    <p style={{ fontSize: 11, color: "rgb(var(--muted))", margin: 0, marginTop: 2 }}>
                      Ne možeš se odlučiti? Pusti kolo da odluči!
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  style={{ width: 32, height: 32, borderRadius: 10, background: "rgb(var(--border)/0.4)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgb(var(--muted))", flexShrink: 0 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* ── Mode selector ──────────────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setWinner(null); setWinnerIdx(-1); }}
                    disabled={isSpinning}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: `1px solid ${mode === m.key ? "rgba(232,78,15,0.5)" : "rgba(var(--border),1)"}`,
                      background: mode === m.key ? "rgba(232,78,15,0.12)" : "rgba(var(--surface),0.4)",
                      color: mode === m.key ? "#F97316" : "rgb(var(--muted))",
                      cursor: isSpinning ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: isSpinning ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 15 }}>{m.emoji}</span>
                      <span style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em" }}>
                        {m.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: mode === m.key ? "rgba(249,115,22,0.7)" : "rgb(var(--muted))", margin: 0, lineHeight: 1.3 }}>
                      {m.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* ── Wheel area ─────────────────────────────────────────── */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

                {poolLoading ? (
                  <div style={{ width: 300, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <Loader2 style={{ width: 40, height: 40, color: "#F97316", animation: "spin 1s linear infinite" }} />
                    <p style={{ fontSize: 13, color: "rgb(var(--muted))", textAlign: "center", maxWidth: 240 }}>
                      {statusMsg || "Tražim restorane na Google Mapsu…"}
                    </p>
                  </div>
                ) : poolError ? (
                  <div style={{ width: "100%", padding: "32px 20px", textAlign: "center", borderRadius: 16, border: "1px dashed rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                    <span style={{ fontSize: 36 }}>😕</span>
                    <p style={{ fontSize: 13, color: "#f87171", marginTop: 10, lineHeight: 1.5 }}>{poolError}</p>
                  </div>
                ) : segments.length > 0 ? (
                  <>
                    {/* Pointer triangle */}
                    <div style={{ position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", zIndex: 10, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
                      <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
                        <polygon points="12,0 24,22 0,22" fill="#FBBF24" stroke="#E84E0F" strokeWidth="1.5" />
                        <line x1="12" y1="22" x2="12" y2="28" stroke="#E84E0F" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Spinning wheel */}
                    <motion.div
                      animate={{ rotate: rotation }}
                      transition={{
                        duration: isSpinning ? SPIN_DURATION / 1000 : 0,
                        ease: isSpinning ? [0.15, 0.85, 0.3, 1] : "linear",
                      }}
                      style={{
                        width: 300, height: 300,
                        borderRadius: "50%",
                        filter: isSpinning ? "drop-shadow(0 0 20px rgba(232,78,15,0.5))" : "none",
                        transition: isSpinning ? undefined : "filter 0.5s",
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        style={{ width: 300, height: 300, borderRadius: "50%", display: "block" }}
                      />
                    </motion.div>

                    {/* Segment count pill */}
                    <p style={{ fontSize: 11, color: "rgb(var(--muted))", textAlign: "center" }}>
                      {segments.length} restorana na kolu · {MODES.find(m => m.key === mode)?.emoji} {MODES.find(m => m.key === mode)?.label}
                    </p>
                  </>
                ) : null}
              </div>

              {/* ── VRTI button ─────────────────────────────────────────── */}
              {!poolLoading && !poolError && segments.length > 0 && !winner && (
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    padding: "14px 0",
                    borderRadius: 16,
                    border: "none",
                    background: isSpinning
                      ? "rgba(232,78,15,0.35)"
                      : "linear-gradient(135deg, #E84E0F 0%, #F97316 100%)",
                    color: "white",
                    fontFamily: "Oswald, sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: "0.08em",
                    cursor: isSpinning ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: isSpinning ? "none" : "0 4px 20px rgba(232,78,15,0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  {isSpinning ? (
                    <>
                      <Loader2 style={{ width: 20, height: 20, animation: "spin 0.6s linear infinite" }} />
                      VRTEEEEE SE…
                    </>
                  ) : (
                    <>🎡 VRTI!</>
                  )}
                </button>
              )}

              {/* ── Winner card ─────────────────────────────────────────── */}
              <AnimatePresence>
                {winner && (
                  <motion.div
                    key="winner-card"
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1,    y: 0  }}
                    exit={{   opacity: 0, scale: 0.85, y: 20  }}
                    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ marginTop: 16 }}
                  >
                    <div style={{
                      borderRadius: 20,
                      border: "1px solid rgba(251,191,36,0.35)",
                      background: "linear-gradient(135deg, rgba(232,78,15,0.12) 0%, rgba(251,191,36,0.08) 100%)",
                      padding: "20px",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {/* Decorative glow blob */}
                      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(251,191,36,0.15)", filter: "blur(20px)", pointerEvents: "none" }} />

                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, position: "relative" }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(232,78,15,0.2)", border: "1px solid rgba(232,78,15,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                          🏆
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 10, color: "#FBBF24", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>
                            ✨ KOLO JE ODLUČILO!
                          </p>
                          <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 800, fontSize: 20, color: "rgb(var(--foreground))", margin: 0, lineHeight: 1.1 }}>
                            {winner.name}
                          </p>
                          <p style={{ fontSize: 12, color: "rgb(var(--muted))", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                            📍 {winner.city}{winner.address ? ` · ${winner.address}` : ""}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            padding: "12px 0",
                            borderRadius: 12,
                            background: "linear-gradient(135deg, #E84E0F 0%, #F97316 100%)",
                            color: "white",
                            fontFamily: "Oswald, sans-serif",
                            fontWeight: 700,
                            fontSize: 14,
                            letterSpacing: "0.06em",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            boxShadow: "0 4px 16px rgba(232,78,15,0.35)",
                          }}
                        >
                          <Navigation style={{ width: 15, height: 15 }} />
                          KRENI ODMAH
                        </a>
                        <button
                          onClick={handleRespin}
                          style={{
                            padding: "12px 16px",
                            borderRadius: 12,
                            border: "1px solid rgba(232,78,15,0.3)",
                            background: "rgba(232,78,15,0.1)",
                            color: "#F97316",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 12,
                            fontFamily: "Oswald, sans-serif",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                          }}
                        >
                          <RefreshCw style={{ width: 14, height: 14 }} />
                          RE-SPIN
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>{/* end inner padding */}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
