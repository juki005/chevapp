import { NextRequest, NextResponse } from "next/server";

// ── Google Places Details proxy ───────────────────────────────────────────────
// GET /api/place-details?place_id=ChIJ...
// Returns: { rating, open_now, phone, website, types }
// Uses the Place Details API (only the fields we need to keep cost low).
// ─────────────────────────────────────────────────────────────────────────────

const DETAILS_BASE = "https://maps.googleapis.com/maps/api/place/details/json";
const FIELDS       = "rating,opening_hours,formatted_phone_number,website,types";

export async function GET(req: NextRequest) {
  const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  const placeId = new URL(req.url).searchParams.get("place_id")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ place_id: placeId, fields: FIELDS, key: apiKey, language: "bs" });
    const res    = await fetch(`${DETAILS_BASE}?${params}`, { cache: "no-store" });
    const body   = await res.json() as { status: string; result?: PlaceDetailsResult };

    if (body.status !== "OK") {
      return NextResponse.json({ error: `Google status: ${body.status}` }, { status: 502 });
    }

    const r = body.result!;
    return NextResponse.json({
      rating:   r.rating  ?? null,
      open_now: r.opening_hours?.open_now ?? null,
      phone:    r.formatted_phone_number ?? null,
      website:  r.website ?? null,
      types:    r.types   ?? [],
    }, {
      // Cache 10 minutes — open_now changes during the day
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

interface PlaceDetailsResult {
  rating?:                  number;
  opening_hours?:           { open_now?: boolean };
  formatted_phone_number?:  string;
  website?:                 string;
  types?:                   string[];
}
