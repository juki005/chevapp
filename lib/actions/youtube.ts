"use server";

// ── YouTube Data API v3 — Gated Kitchen Search ────────────────────────────────
//
// SECURITY: YOUTUBE_API_KEY must be set as a server-side env variable only
// (no NEXT_PUBLIC_ prefix). It is never exposed to the client bundle.
//
// The "Kitchen Gate" suffix is appended here on the server so it cannot
// be stripped or overridden by the client.
// ─────────────────────────────────────────────────────────────────────────────

const GATE_SUFFIX = "recepti food recipe";
const MAX_RESULTS = 6;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3/search";

export interface YtSearchResult {
  id:           string; // YouTube videoId — safe to use in embed src
  title:        string;
  thumbnail:    string;
  channelTitle: string;
}

// ── YouTube API error shape ───────────────────────────────────────────────────
interface YtApiError {
  code:    number;
  message: string;
  errors?: { reason: string; domain: string; message: string }[];
}

interface YtApiItem {
  id: { videoId?: string };
  snippet: {
    title:        string;
    channelTitle: string;
    thumbnails: {
      medium?:  { url: string };
      default?: { url: string };
    };
  };
}

interface YtApiResponse {
  items?: YtApiItem[];
  error?: YtApiError;
}

// ── Map YouTube error reasons to actionable messages ─────────────────────────
function describeYtError(err: YtApiError): string {
  const reason = err.errors?.[0]?.reason ?? "";

  const map: Record<string, string> = {
    keyInvalid:
      "API ključ nije validan (keyInvalid). Provjeri Environment Variables na Vercelu.",
    keyExpired:
      "API ključ je istekao (keyExpired). Generiši novi ključ u Google Cloud Console.",
    quotaExceeded:
      "YouTube API dnevna kvota je prekoračena (quotaExceeded). Pokušaj ponovo sutra.",
    dailyLimitExceeded:
      "YouTube API dnevna kvota je prekoračena (dailyLimitExceeded). Pokušaj ponovo sutra.",
    rateLimitExceeded:
      "YouTube API rate limit je dostignut. Pričekaj nekoliko sekundi i pokušaj ponovo.",
    accessNotConfigured:
      "YouTube Data API v3 nije aktiviran u Google Cloud Console. Posjeti APIs & Services → Enable APIs.",
    forbidden:
      "Pristup odbijen (403). Provjeri da je API ključ aktivan i da je YouTube Data API v3 uključen.",
    badRequest:
      "Neispravan zahtjev (400). Provjeri parametre pretrage.",
  };

  if (map[reason]) return map[reason];

  // Fall back to the raw message with code so it shows in Vercel logs too
  return `YouTube API greška ${err.code}: ${err.message}${reason ? ` (${reason})` : ""}`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function fetchYouTubeMetadata(
  rawQuery: string
): Promise<{ results: YtSearchResult[]; error: string | null }> {

  // ── 1. Key guard ─────────────────────────────────────────────────────────
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error(
      "[youtube] YOUTUBE_API_KEY is not set. " +
      "Add it to Vercel → Settings → Environment Variables (no NEXT_PUBLIC_ prefix)."
    );
    return {
      results: [],
      error:   "YOUTUBE_API_KEY nije konfigurisan na serveru. Dodaj ga u Vercel Environment Variables.",
    };
  }

  // ── 2. Build gated URL ────────────────────────────────────────────────────
  const gatedQuery = `${rawQuery.trim()} ${GATE_SUFFIX}`;

  const url = new URL(YT_API_BASE);
  url.searchParams.set("part",             "snippet");
  url.searchParams.set("q",               gatedQuery);
  url.searchParams.set("type",            "video");
  url.searchParams.set("videoEmbeddable", "true");   // only return embeddable videos
  url.searchParams.set("maxResults",      String(MAX_RESULTS));
  url.searchParams.set("key",             apiKey);

  console.log(
    `[youtube] fetching — query="${rawQuery}" gated="${gatedQuery}" maxResults=${MAX_RESULTS}`
  );

  // ── 3. Fetch ──────────────────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      // Data Cache: same gated query won't re-hit the API for 5 minutes.
      // Vercel will bust this automatically when the server action is
      // called again after the TTL expires.
      next: { revalidate: 300 },
    });
  } catch (networkErr) {
    console.error("[youtube] network error —", networkErr);
    return {
      results: [],
      error:   "Mrežna greška: nije moguće kontaktirati YouTube API. Provjeri internet konekciju.",
    };
  }

  // ── 4. Parse body (always — even on error, YouTube returns JSON) ──────────
  let json: YtApiResponse;
  try {
    json = (await res.json()) as YtApiResponse;
  } catch (parseErr) {
    console.error("[youtube] failed to parse response body —", parseErr, "status:", res.status);
    return {
      results: [],
      error:   `YouTube API vratio nečitljiv odgovor (HTTP ${res.status}).`,
    };
  }

  // ── 5. API-level error ────────────────────────────────────────────────────
  if (!res.ok || json.error) {
    const apiErr  = json.error ?? { code: res.status, message: res.statusText };
    const message = describeYtError(apiErr);
    console.error("[youtube] API error —", JSON.stringify(apiErr));
    return { results: [], error: message };
  }

  // ── 6. Map results ────────────────────────────────────────────────────────
  const results: YtSearchResult[] = (json.items ?? [])
    .filter((item) => !!item.id.videoId)
    .map((item) => ({
      id:   item.id.videoId!,
      title: item.snippet.title,
      thumbnail:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      channelTitle: item.snippet.channelTitle,
    }));

  console.log(`[youtube] OK — ${results.length} embeddable results for "${rawQuery}"`);

  return { results, error: null };
}
