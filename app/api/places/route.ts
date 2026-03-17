import { NextRequest, NextResponse } from "next/server";

// ── Google Places Text Search proxy ──────────────────────────────────────────
// Keeps the API key server-side (GOOGLE_MAPS_API_KEY) so it's never exposed in
// browser bundles or network requests from the client.
//
// Env vars:
//   GOOGLE_MAPS_API_KEY            — server-only (preferred, restrict to server IP)
//   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — fallback (same key, already in .env.local)
//
// Endpoint: GET /api/places?near=Sarajevo&query=cevapi&limit=20
// Uses:    Places API (Legacy) → Text Search
// Docs:    https://developers.google.com/maps/documentation/places/web-service/text-search
// ─────────────────────────────────────────────────────────────────────────────

const PLACES_BASE     = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const FETCH_TIMEOUT   = 6000; // 6 s — Places API is usually fast

const STATUS_HINTS: Record<string, string> = {
  REQUEST_DENIED:        "API key is invalid or Places API is not enabled. Check the Google Cloud Console.",
  OVER_DAILY_LIMIT:      "Daily quota exceeded. Check your billing/quota settings in Google Cloud Console.",
  OVER_QUERY_LIMIT:      "Rate limit hit. Wait a moment and retry.",
  INVALID_REQUEST:       "The request was malformed (missing or invalid parameters).",
  UNKNOWN_ERROR:         "Google returned an internal error. Retry in a moment.",
};

export async function GET(req: NextRequest) {
  // ── 1. API key ─────────────────────────────────────────────────────────────
  // Prefer server-only key; fall back to the NEXT_PUBLIC_ variant that the user
  // has already added to .env.local for the map component.
  const rawKey = process.env.GOOGLE_MAPS_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    || "";
  const apiKey = rawKey.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Google Maps API key missing.",
        hint:  "Add GOOGLE_MAPS_API_KEY=... to .env.local and restart dev server.",
      },
      { status: 500 }
    );
  }

  // ── 2. Query params ────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const near  = searchParams.get("near")?.trim()  ?? "";
  const query = searchParams.get("query")?.trim() || "cevapi rostilj grill";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20") || 20, 1), 20);

  if (!near) {
    return NextResponse.json(
      { error: "Missing `near` query parameter (e.g. ?near=Sarajevo)" },
      { status: 400 }
    );
  }

  // Combine the text query with the city name for a focused local search.
  const fullQuery = `${query} ${near}`;

  // ── 3. Fetch with timeout ──────────────────────────────────────────────────
  try {
    const params = new URLSearchParams({
      query:    fullQuery,
      key:      apiKey,
      type:     "restaurant",
      language: "bs",
      region:   "ba",
    });

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    console.log(`[places] 🔍 query="${fullQuery}" | limit=${limit}`);

    let res: Response;
    try {
      res = await fetch(`${PLACES_BASE}?${params.toString()}`, {
        cache:  "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await res.text();

    if (!res.ok) {
      console.error(`[places] ❌ HTTP ${res.status}: ${rawText.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Google Places returned HTTP ${res.status}`, raw: rawText.slice(0, 200) },
        { status: 502 }
      );
    }

    // ── 4. Parse ─────────────────────────────────────────────────────────────
    let body: GooglePlacesResponse;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Non-JSON response from Google Places.", raw: rawText.slice(0, 200) },
        { status: 502 }
      );
    }

    // ── 5. Status check (Google returns 200 even for API errors) ─────────────
    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      const hint = STATUS_HINTS[body.status] ?? `Google API status: ${body.status}`;
      console.error(`[places] ❌ status=${body.status} — ${hint}`);
      return NextResponse.json(
        { error: hint, status: body.status },
        { status: body.status === "REQUEST_DENIED" ? 401 : 502 }
      );
    }

    const raw    = body.results ?? [];
    const sliced = raw.slice(0, limit);

    console.log(`[places] ✅ ${sliced.length} result(s) for "${fullQuery}"`);

    // ── 6. Normalise to ChevApp shape ─────────────────────────────────────────
    const results: PlaceResult[] = sliced.map((place) => ({
      place_id:  place.place_id,
      name:      place.name,
      address:   place.formatted_address ?? "",
      // Extract the locality from formatted_address ("…, City ZIP, Country")
      // as a best-effort city name; fall back to the `near` param.
      city:      extractCity(place.formatted_address ?? "", near),
      latitude:  place.geometry?.location?.lat ?? null,
      longitude: place.geometry?.location?.lng ?? null,
      rating:    place.rating     ?? null,
      open_now:  place.opening_hours?.open_now ?? null,
      types:     place.types      ?? [],
      source:    "google" as const,
    }));

    return NextResponse.json({ results, total: results.length });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Google Places API timed out.", hint: "Retry in a moment." },
        { status: 504 }
      );
    }

    console.error("[places] 🚨 Unhandled error:", message);
    return NextResponse.json(
      { error: "Internal proxy error.", details: message },
      { status: 500 }
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Extract a human-readable city from a Google formatted_address string.
 * Example: "Bravadžiluk 3, Sarajevo 71000, Bosnia and Herzegovina" → "Sarajevo"
 * Falls back to the `near` query parameter.
 */
function extractCity(formatted: string, fallback: string): string {
  const parts = formatted.split(",").map((p) => p.trim());
  // City is typically the second-to-last segment before the country.
  if (parts.length >= 2) {
    // Strip ZIP code (e.g. "Sarajevo 71000" → "Sarajevo")
    const candidate = parts[parts.length - 2].replace(/\s+\d+$/, "").trim();
    if (candidate.length > 1) return candidate;
  }
  return fallback;
}

// ── Google Places API types ───────────────────────────────────────────────────
interface GooglePlacesResponse {
  status:  string;
  results: GPlaceRaw[];
  next_page_token?: string;
}

interface GPlaceRaw {
  place_id:         string;
  name:             string;
  formatted_address?: string;
  geometry?: {
    location?: { lat: number; lng: number };
  };
  rating?:          number;
  types?:           string[];
  opening_hours?: { open_now?: boolean };
}

// Normalised shape returned to the frontend
export interface PlaceResult {
  place_id:  string;
  name:      string;
  address:   string;
  city:      string;
  latitude:  number | null;
  longitude: number | null;
  rating:    number | null;
  open_now:  boolean | null;
  types:     string[];
  source:    "google";
}
