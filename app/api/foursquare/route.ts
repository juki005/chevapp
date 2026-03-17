import { NextRequest, NextResponse } from "next/server";

// Foursquare Places API v3
// Auth: raw API key in the Authorization header — NO "Bearer " prefix.
// Docs: https://docs.foursquare.com/developer/reference/place-search

const FSQ_BASE         = "https://api.foursquare.com/v3/places/search";
const FSQ_CATEGORIES   = "13022,13049,13065"; // BBQ Joint, Eastern European, Restaurant
const FSQ_FIELDS       = "fsq_id,name,location,geocodes,categories,rating,tel,website";
const FSQ_API_VERSION  = "20231010"; // specific dated version — more reliable than "1970-01-01"
const FETCH_TIMEOUT_MS = 5000; // 5 s hard limit — returns 504 instead of hanging

const STATUS_HINTS: Record<number, string> = {
  401: "Invalid API key — check NEXT_PUBLIC_FOURSQUARE_API_KEY in .env.local.",
  403: "API key lacks Places Search permission. Regenerate the key in the Foursquare developer console.",
  429: "Rate limit exceeded. Foursquare free tier has a daily cap.",
};

export async function GET(req: NextRequest) {
  // ── 1. API key check ───────────────────────────────────────────────────────
  // Prefer FOURSQUARE_API_KEY (server-only, never sent to the browser).
  // Fall back to the NEXT_PUBLIC_ variant for legacy .env.local setups.
  const rawKey = process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY || "";
  const apiKey = rawKey.trim();

  if (!apiKey) {
    console.error("[foursquare] ❌ API key missing from environment.");
    console.error("  → Add NEXT_PUBLIC_FOURSQUARE_API_KEY=fsq3_... to .env.local and restart dev server.");
    return NextResponse.json(
      {
        error: "Foursquare API key is missing in environment variables.",
        hint:  "Add NEXT_PUBLIC_FOURSQUARE_API_KEY=fsq3_... to .env.local",
      },
      { status: 500 }
    );
  }

  // ── 2. Parse request params ────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const near  = searchParams.get("near")?.trim() ?? "";
  const query = searchParams.get("query")?.trim() || "grill cevapi";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20") || 20, 1), 50);

  if (!near) {
    return NextResponse.json(
      { error: "Missing `near` query parameter (e.g. ?near=Sarajevo)" },
      { status: 400 }
    );
  }

  // ── 3. Outer try/catch — nothing escapes to a raw Next.js 500 ─────────────
  try {
    // ── Barebones params — no categories/fields filter so we can confirm a 200 first
    const params = new URLSearchParams({
      query,
      near,
      limit: String(limit),
      // categories and fields re-enabled once bare search returns 200
    });
    const fsqUrl = `${FSQ_BASE}?${params.toString()}`;

    console.log(`[foursquare] 🔍 near="${near}" | query="${query}" | limit=${limit}`);
    console.log(`[foursquare]    URL: ${fsqUrl}`);

    // ── 4. AbortController timeout ────────────────────────────────────────────
    // Without this, fetch has no deadline and the Next.js runtime kills the
    // entire route after ~10–11 s with "terminated".
    // With it, we get a clean 504 response after exactly FETCH_TIMEOUT_MS.
    const controller  = new AbortController();
    const timeoutId   = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // ── 5. Fetch with timeout signal ──────────────────────────────────────────
    console.log("[foursquare] Sending request to Foursquare...");
    let fsqRes: Response;
    try {
      fsqRes = await fetch(fsqUrl, {
        headers: {
          Accept:                 "application/json",
          Authorization:          apiKey,        // raw key, NO "Bearer " prefix
          "X-Places-Api-Version": FSQ_API_VERSION,
        },
        cache:  "no-store",
        signal: controller.signal,
      });
    } finally {
      // Always clear the timer — prevents it firing after a successful response
      clearTimeout(timeoutId);
    }
    console.log("[foursquare] Received response status:", fsqRes.status);

    // ── 6. Read body as text (safe for both JSON and raw HTML error pages) ───
    const rawText = await fsqRes.text();
    console.log(`[foursquare] Body length: ${rawText.length} chars`);

    // ── 7. Handle Foursquare-level errors ────────────────────────────────────
    if (!fsqRes.ok) {
      const hint = STATUS_HINTS[fsqRes.status] ?? "Check the Foursquare developer console.";
      console.error(`[foursquare] ❌ ${fsqRes.status} ${fsqRes.statusText} — ${hint}`);
      console.error(`[foursquare]    Body: ${rawText.slice(0, 400)}`);

      return NextResponse.json(
        {
          error:  `Foursquare returned ${fsqRes.status} ${fsqRes.statusText}`,
          hint,
          status: fsqRes.status,
        },
        { status: fsqRes.status >= 500 ? 502 : fsqRes.status }
      );
    }

    // ── 8. Parse JSON ─────────────────────────────────────────────────────────
    let body: { results?: FsqPlace[] };
    try {
      body = JSON.parse(rawText);
    } catch {
      console.error("[foursquare] ❌ Non-JSON response:", rawText.slice(0, 300));
      return NextResponse.json(
        { error: "Foursquare returned a non-JSON response.", raw: rawText.slice(0, 300) },
        { status: 502 }
      );
    }

    const results: FsqPlace[] = Array.isArray(body?.results) ? body.results : [];
    console.log(`[foursquare] ✅ ${results.length} result(s) for near="${near}"`);

    if (results.length === 0) {
      console.warn(`[foursquare] ⚠️  Zero results — is "${near}" a recognised city name?`);
      console.warn(`[foursquare]    Category filter (${FSQ_CATEGORIES}) may be too narrow for this area.`);
    }

    // ── 9. Normalise to ChevApp shape ─────────────────────────────────────────
    const normalised = results.map((place) => ({
      fsq_id:     place.fsq_id,
      name:       place.name,
      address:    [place.location?.address, place.location?.locality].filter(Boolean).join(", "),
      city:       place.location?.locality ?? place.location?.region ?? near,
      latitude:   place.geocodes?.main?.latitude  ?? null,
      longitude:  place.geocodes?.main?.longitude ?? null,
      categories: place.categories?.map((c) => c.name) ?? [],
      rating:     place.rating ?? null,
      phone:      place.tel     ?? null,
      website:    place.website ?? null,
      source:     "foursquare" as const,
    }));

    return NextResponse.json({ results: normalised, total: normalised.length });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // AbortError means our 5 s timeout fired before Foursquare responded
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[foursquare] ⏱ Timeout — Foursquare did not respond within ${FETCH_TIMEOUT_MS}ms`);
      return NextResponse.json(
        {
          error:   "Foursquare API timed out.",
          details: `No response within ${FETCH_TIMEOUT_MS / 1000} seconds.`,
          hint:    "Foursquare may be slow or unreachable. Try again in a moment.",
        },
        { status: 504 }
      );
    }

    console.error("[foursquare] 🚨 Unhandled exception:", message);
    return NextResponse.json(
      { error: "Internal server error in Foursquare proxy.", details: message },
      { status: 500 }
    );
  }
}

// ── Foursquare v3 response types ───────────────────────────────────────────
interface FsqPlace {
  fsq_id: string;
  name:   string;
  location?: {
    address?:  string;
    locality?: string;
    region?:   string;
    country?:  string;
  };
  geocodes?: {
    main?: { latitude: number; longitude: number };
  };
  categories?: { id: number; name: string }[];
  rating?:  number;
  tel?:     string;
  website?: string;
}
