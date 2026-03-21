// ── Google Places server-side helpers ────────────────────────────────────────
// Called only from Server Components / Route Handlers — API key never reaches
// the client bundle.

export interface GooglePlacesData {
  placeId:      string;
  rating:       number | null;
  openNow:      boolean | null;
  weekdayText:  string[];   // e.g. ["Ponedjeljak: 09:00 – 22:00", ...]
  photoRefs:    string[];   // up to 4 photo_reference strings
}

interface FindPlaceResponse {
  candidates?: { place_id?: string }[];
  status:       string;
}

interface PlaceDetailsResponse {
  result?: {
    rating?:         number;
    opening_hours?: {
      open_now?:      boolean;
      weekday_text?:  string[];
    };
    photos?: { photo_reference: string }[];
  };
  status: string;
}

/**
 * Fetches Google Places data for a restaurant by name + city.
 * Results are cached by Next.js for 1 hour (revalidate: 3600).
 * Returns null if the API key is missing, the place isn't found, or any
 * network/quota error occurs — callers should handle null gracefully.
 */
export async function fetchGooglePlacesData(
  name: string,
  city: string,
): Promise<GooglePlacesData | null> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";

  if (!apiKey) return null;

  try {
    // ── Step 1: Find Place ─────────────────────────────────────────────────
    const findParams = new URLSearchParams({
      input:     `${name} ${city}`,
      inputtype: "textquery",
      fields:    "place_id",
      key:       apiKey,
      language:  "hr",
    });

    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams}`,
      { next: { revalidate: 3600 } },
    );

    if (!findRes.ok) return null;

    const findJson = (await findRes.json()) as FindPlaceResponse;
    const placeId  = findJson.candidates?.[0]?.place_id;
    if (!placeId) return null;

    // ── Step 2: Place Details ──────────────────────────────────────────────
    const detailParams = new URLSearchParams({
      place_id: placeId,
      fields:   "rating,opening_hours,photos",
      key:      apiKey,
      language: "hr",
    });

    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${detailParams}`,
      { next: { revalidate: 3600 } },
    );

    if (!detailRes.ok) return null;

    const detailJson = (await detailRes.json()) as PlaceDetailsResponse;
    if (detailJson.status !== "OK") return null;

    const r = detailJson.result ?? {};

    return {
      placeId,
      rating:      r.rating      ?? null,
      openNow:     r.opening_hours?.open_now     ?? null,
      weekdayText: r.opening_hours?.weekday_text ?? [],
      // Grab up to 4 photo references — resolved to proxied URLs client-side
      photoRefs:   (r.photos ?? []).slice(0, 4).map((p) => p.photo_reference),
    };
  } catch {
    // Network error, quota exceeded, etc. — fail silently
    return null;
  }
}
