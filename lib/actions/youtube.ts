"use server";

// ── YouTube Data API v3 — Gated Kitchen Search ────────────────────────────────
//
// SECURITY: YOUTUBE_API_KEY must be set as a server-side env variable only
// (no NEXT_PUBLIC_ prefix). It is never exposed to the client bundle.
//
// The "Kitchen Gate" suffix ("recepti food recipe") is appended here on the
// server so the client never needs to know about it, and it cannot be stripped.
// ─────────────────────────────────────────────────────────────────────────────

const GATE_SUFFIX  = "recepti food recipe";
const MAX_RESULTS  = 6;
const YT_API_BASE  = "https://www.googleapis.com/youtube/v3/search";

export interface YtSearchResult {
  id:           string;   // YouTube videoId — safe to use in embed src
  title:        string;
  thumbnail:    string;   // mqdefault thumbnail URL
  channelTitle: string;
}

interface YtApiItem {
  id: { videoId?: string };
  snippet: {
    title:        string;
    channelTitle: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YtApiResponse {
  items?: YtApiItem[];
  error?: { message: string; code: number };
}

export async function fetchYouTubeMetadata(
  rawQuery: string
): Promise<{ results: YtSearchResult[]; error: string | null }> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      results: [],
      error: "YOUTUBE_API_KEY nije konfigurisan na serveru.",
    };
  }

  const gatedQuery = `${rawQuery.trim()} ${GATE_SUFFIX}`;

  const url = new URL(YT_API_BASE);
  url.searchParams.set("part",       "snippet");
  url.searchParams.set("q",          gatedQuery);
  url.searchParams.set("type",       "video");
  url.searchParams.set("maxResults", String(MAX_RESULTS));
  url.searchParams.set("key",        apiKey);

  try {
    const res = await fetch(url.toString(), {
      // Cache for 5 minutes — same query within a session won't re-hit the API
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[youtube] API HTTP error", res.status, text);
      return {
        results: [],
        error: `YouTube API greška (${res.status}). Provjeri API ključ i kvote.`,
      };
    }

    const json: YtApiResponse = await res.json();

    if (json.error) {
      console.error("[youtube] API error payload", json.error);
      return {
        results: [],
        error: `YouTube API: ${json.error.message} (${json.error.code})`,
      };
    }

    const results: YtSearchResult[] = (json.items ?? [])
      .filter((item) => !!item.id.videoId)
      .map((item) => ({
        id:           item.id.videoId!,
        title:        item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
        channelTitle: item.snippet.channelTitle,
      }));

    return { results, error: null };
  } catch (err) {
    console.error("[youtube] fetch failed", err);
    return {
      results: [],
      error: "Mrežna greška pri dohvaćanju YouTube rezultata.",
    };
  }
}
