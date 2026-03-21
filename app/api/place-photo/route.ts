import { NextRequest, NextResponse } from "next/server";

// ── Google Places Photo Proxy ─────────────────────────────────────────────────
// Streams a Google Places photo back to the client without exposing the API key
// in HTML source. The photo reference from the Places API is passed as `?ref=`.
//
// GET /api/place-photo?ref={photo_reference}&maxwidth=800
//
// Response is cached for 24 h at the edge (Vercel) and in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";

  if (!apiKey) {
    return new NextResponse("API key not configured", { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const ref      = searchParams.get("ref");
  const maxwidth = searchParams.get("maxwidth") ?? "800";

  if (!ref) {
    return new NextResponse("Missing ?ref= param", { status: 400 });
  }

  const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  googleUrl.searchParams.set("maxwidth",        maxwidth);
  googleUrl.searchParams.set("photoreference",  ref);
  googleUrl.searchParams.set("key",             apiKey);

  try {
    // Google returns a 302 → actual CDN image; redirect: "follow" resolves it.
    const upstream = await fetch(googleUrl.toString(), {
      redirect: "follow",
      // Tell Next.js to cache this fetch for 24 h so repeated profile loads
      // don't hit the Google API on every request.
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer      = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType,
        // Cache at the edge for 24 h, in browser for 1 h
        "Cache-Control": "public, s-maxage=86400, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch photo", { status: 502 });
  }
}
