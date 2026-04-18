// ─────────────────────────────────────────────────────────────────────────────
// lib/utils/imageCompression.ts
//
// Client-side image compression — the FIRST line of defense against storage
// bloat. Every photo destined for the `user_photos` Supabase bucket MUST pass
// through compressImage() before the upload call.
//
// Defaults:
//   • 800 px on the longest side
//   • 500 KB max (the bucket has a 512 KB server-side ceiling — see migration 016)
//   • WebP output (best size/quality ratio for food photos)
//
// Why client-side?
//   Compressing in the browser means we never send the original (often 5–15 MB)
//   over the wire. Bandwidth, storage, and Supabase egress costs all go down.
//
// Dependency:
//   npm install browser-image-compression
// ─────────────────────────────────────────────────────────────────────────────

import imageCompression from "browser-image-compression";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CompressOptions {
  /** Longest side in pixels. Default: 800 */
  maxWidthOrHeight?: number;
  /** Target size in megabytes. Default: 0.5 (500 KB) */
  maxSizeMB?: number;
  /** Output MIME type. Default: "image/webp" */
  fileType?: "image/webp" | "image/jpeg" | "image/png";
  /** Initial encoder quality (0–1). Default: 0.82 */
  initialQuality?: number;
}

export interface CompressResult {
  /** Compressed File ready to upload */
  file: File;
  /** Original byte size (for telemetry / UX) */
  originalBytes: number;
  /** Compressed byte size */
  compressedBytes: number;
  /** compressedBytes / originalBytes — lower is better */
  ratio: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidthOrHeight: 800,
  maxSizeMB:        0.5,     // 500 KB
  fileType:         "image/webp",
  initialQuality:   0.82,
};

// Bucket server-side limit (in bytes) — keep this in sync with migration 016.
const BUCKET_HARD_LIMIT_BYTES = 524_288; // 512 KB

// ─────────────────────────────────────────────────────────────────────────────
// compressImage — main entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function compressImage(
  input: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  if (!input.type.startsWith("image/")) {
    throw new Error(`compressImage: not an image (${input.type || "unknown"})`);
  }

  const opts = { ...DEFAULTS, ...options };
  const originalBytes = input.size;

  let compressed: File;
  try {
    compressed = await imageCompression(input, {
      maxSizeMB:            opts.maxSizeMB,
      maxWidthOrHeight:     opts.maxWidthOrHeight,
      fileType:             opts.fileType,
      initialQuality:       opts.initialQuality,
      useWebWorker:         true,
      alwaysKeepResolution: false,
    });
  } catch (err) {
    throw new Error(
      `compressImage failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Edge case: tiny input can occasionally come back larger. Prefer whichever
  // is smaller — no point uploading a worse version.
  const chosen = compressed.size < input.size ? compressed : input;

  // Hard guard: if we're still over the bucket ceiling, reject instead of
  // letting Supabase return a cryptic 413.
  if (chosen.size > BUCKET_HARD_LIMIT_BYTES) {
    throw new Error(
      `compressImage: result ${Math.round(chosen.size / 1024)} KB exceeds bucket limit of ${BUCKET_HARD_LIMIT_BYTES / 1024} KB. Try a smaller image.`,
    );
  }

  const outFile = new File(
    [chosen],
    renameWithExt(input.name, chosen.type),
    { type: chosen.type, lastModified: Date.now() },
  );

  return {
    file:            outFile,
    originalBytes,
    compressedBytes: outFile.size,
    ratio:           outFile.size / Math.max(originalBytes, 1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// makePhotoPath — canonical storage path for user_photos uploads
//
// Format: "{userId}/{placeId}/{uuid}.{ext}"
//
// The leading {userId} segment is REQUIRED by the RLS policy
// `user_photos_auth_insert` (see migration 016). Violating it → RLS blocks the
// upload.
// ─────────────────────────────────────────────────────────────────────────────
export function makePhotoPath(args: {
  userId:  string;
  placeId: string;
  file:    File;
}): string {
  const ext = (args.file.name.split(".").pop() || "webp").toLowerCase();
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const safePlaceId = sanitizeSegment(args.placeId);
  return `${args.userId}/${safePlaceId}/${uuid}.${ext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────
function renameWithExt(filename: string, mime: string): string {
  const ext = (mime.split("/")[1] ?? "webp").toLowerCase();
  const base = filename.replace(/\.[^./\\]+$/, "") || "photo";
  return `${sanitizeSegment(base)}.${ext}`;
}

function sanitizeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "x";
}
