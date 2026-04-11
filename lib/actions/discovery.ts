"use server";

// ── lib/actions/discovery.ts ──────────────────────────────────────────────────
// Server actions for the "Cevap-First" Discovery System.
// Uses the legacy Places API (same key/pattern as /api/place-details).
//
// getLandmarksForBounds  — map Discovery Mode (bounds → nearby landmarks)
// getLandmarksForCity    — Community page card (city name → top landmarks)
// getCityFromCoords      — reverse geocode lat/lng → city name
//
// getTripAdvisorUrl is NOT a server action — see lib/tripadvisor.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface Landmark {
  id:               string;
  name:             string;
  rating:           number | null;
  userRatingCount:  number;
  lat:              number;
  lng:              number;
  types:            string[];
  vicinity:         string;
}

// Only surface these landmark categories
const LANDMARK_TYPES = new Set(["museum", "church", "park", "tourist_attraction"]);
// Minimum reviews to avoid obscure/low-quality pins
const MIN_RATINGS = 500;

function apiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
}

// ── Nearby Search (for map bounds) ───────────────────────────────────────────
export async function getLandmarksForBounds(
  lat:          number,
  lng:          number,
  radiusMeters: number,
): Promise<Landmark[]> {
  const key = apiKey();
  if (!key) return [];

  const radius = Math.round(Math.min(radiusMeters, 50_000));

  try {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius:   String(radius),
      type:     "tourist_attraction",
      key,
      language: "bs",
    });

    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
      { next: { revalidate: 3600 } },
    );
    const body = await res.json() as NearbySearchResponse;

    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      console.error("[discovery] Nearby Search status:", body.status, body.error_message);
      return [];
    }

    return (body.results ?? [])
      .filter(p =>
        (p.user_ratings_total ?? 0) >= MIN_RATINGS &&
        p.types?.some(t => LANDMARK_TYPES.has(t)),
      )
      .map(p => ({
        id:              p.place_id,
        name:            p.name,
        rating:          p.rating ?? null,
        userRatingCount: p.user_ratings_total ?? 0,
        lat:             p.geometry.location.lat,
        lng:             p.geometry.location.lng,
        types:           p.types ?? [],
        vicinity:        p.vicinity ?? "",
      }));
  } catch (err) {
    console.error("[discovery] getLandmarksForBounds error:", err);
    return [];
  }
}

// ── Text Search (for community page city card) ────────────────────────────────
export async function getLandmarksForCity(
  cityName: string,
  limit     = 3,
): Promise<Landmark[]> {
  const key = apiKey();
  if (!key) return [];

  try {
    const params = new URLSearchParams({
      query:    `top tourist attractions in ${cityName}`,
      type:     "tourist_attraction",
      key,
      language: "bs",
    });

    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { next: { revalidate: 3600 } },
    );
    const body = await res.json() as NearbySearchResponse;

    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      console.error("[discovery] Text Search status:", body.status, body.error_message);
      return [];
    }

    return (body.results ?? [])
      .filter(p => (p.user_ratings_total ?? 0) >= MIN_RATINGS)
      .slice(0, limit)
      .map(p => ({
        id:              p.place_id,
        name:            p.name,
        rating:          p.rating ?? null,
        userRatingCount: p.user_ratings_total ?? 0,
        lat:             p.geometry.location.lat,
        lng:             p.geometry.location.lng,
        types:           p.types ?? [],
        vicinity:        p.vicinity ?? p.formatted_address ?? "",
      }));
  } catch (err) {
    console.error("[discovery] getLandmarksForCity error:", err);
    return [];
  }
}

// ── Forward geocoding (city name → lat/lng) ───────────────────────────────────
export async function getCoordsFromCity(
  cityName: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = apiKey();
  if (!key) return null;

  try {
    const params = new URLSearchParams({ address: cityName, key });
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { next: { revalidate: 86_400 } },
    );
    const body = await res.json() as {
      results?: { geometry: { location: { lat: number; lng: number } } }[];
    };
    const loc = body.results?.[0]?.geometry?.location;
    return loc ?? null;
  } catch {
    return null;
  }
}

// ── Reverse geocoding ─────────────────────────────────────────────────────────
export async function getCityFromCoords(lat: number, lng: number): Promise<string> {
  const key = apiKey();
  if (!key) return "Sarajevo";

  try {
    const params = new URLSearchParams({
      latlng:      `${lat},${lng}`,
      result_type: "locality",
      key,
    });
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { next: { revalidate: 86_400 } },
    );
    const body = await res.json() as {
      results?: { address_components: { long_name: string; types: string[] }[] }[];
    };

    const locality = body.results?.[0]?.address_components
      ?.find(c => c.types.includes("locality"));
    return locality?.long_name ?? "Sarajevo";
  } catch {
    return "Sarajevo";
  }
}

/**
 * Reverse geocode lat/lng → city name + ISO 3166-1 alpha-2 country code.
 * Used by LocationFilter to auto-select both country and city from GPS.
 */
export async function getLocationFromCoords(
  lat: number,
  lng: number,
): Promise<{ city: string; countryCode: string }> {
  const key = apiKey();
  if (!key) return { city: "Sarajevo", countryCode: "BA" };

  try {
    const params = new URLSearchParams({
      latlng:      `${lat},${lng}`,
      result_type: "locality",
      key,
    });
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { next: { revalidate: 86_400 } },
    );
    const body = await res.json() as {
      results?: { address_components: { long_name: string; short_name: string; types: string[] }[] }[];
    };

    const components = body.results?.[0]?.address_components ?? [];
    const city        = components.find(c => c.types.includes("locality"))?.long_name    ?? "Sarajevo";
    const countryCode = components.find(c => c.types.includes("country"))?.short_name   ?? "BA";
    return { city, countryCode };
  } catch {
    return { city: "Sarajevo", countryCode: "BA" };
  }
}

// ── Internal response types ───────────────────────────────────────────────────
interface PlaceResult {
  place_id:           string;
  name:               string;
  rating?:            number;
  user_ratings_total?: number;
  types?:             string[];
  vicinity?:          string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
}

interface NearbySearchResponse {
  status:        string;
  error_message?: string;
  results?:      PlaceResult[];
}
