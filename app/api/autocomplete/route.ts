import { NextRequest, NextResponse } from "next/server";

// ── Google Places Autocomplete proxy ─────────────────────────────────────────
// Keeps the API key server-side. Called by LocationFilter when the user types
// a city name. Restricted to the selected country via `components=country:XX`.
//
// Endpoint: GET /api/autocomplete?input=Sara&country=BA
// Returns:  { predictions: { place_id, city, subtitle }[] }
// ─────────────────────────────────────────────────────────────────────────────

const AUTOCOMPLETE_BASE = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const FETCH_TIMEOUT     = 5000;

interface GAutocomplete {
  status:       string;
  predictions?: {
    place_id:               string;
    description:            string;
    structured_formatting:  { main_text: string; secondary_text: string };
  }[];
}

export async function GET(req: NextRequest) {
  const apiKey = (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const input   = searchParams.get("input")?.trim()   ?? "";
  const country = searchParams.get("country")?.trim() ?? "";

  if (input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const params = new URLSearchParams({
    input,
    types:    "(cities)",
    language: "bs",
    key:      apiKey,
  });

  // Restrict suggestions to the selected country (ISO 3166-1 alpha-2)
  if (country) {
    params.set("components", `country:${country.toLowerCase()}`);
  }

  const controller = new AbortController();
  const tid        = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    let res: Response;
    try {
      res = await fetch(`${AUTOCOMPLETE_BASE}?${params}`, {
        cache:  "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(tid);
    }

    const body = await res.json() as GAutocomplete;

    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      console.warn("[autocomplete] status:", body.status);
      return NextResponse.json({ predictions: [] });
    }

    const predictions = (body.predictions ?? []).slice(0, 6).map((p) => ({
      place_id: p.place_id,
      city:     p.structured_formatting.main_text,
      subtitle: p.structured_formatting.secondary_text,
    }));

    return NextResponse.json({ predictions }, {
      headers: {
        // Short cache — city names change rarely but we want freshness
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ predictions: [] }, { status: 504 });
    }
    console.error("[autocomplete] error:", err);
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }
}
