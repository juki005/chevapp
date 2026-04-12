"use server";

// ── Supabase Place Harvester ──────────────────────────────────────────────────
// Silently saves Google Places discoveries to our Supabase restaurants table.
// This grows the database over time so Supabase becomes the primary source of
// truth and future searches can be served from our own data.
//
// Conflict strategy: UPSERT on google_place_id (UNIQUE constraint, migration 013).
//   • ignoreDuplicates: true — never overwrite admin-verified entries.
//     If a row exists (same google_place_id), we skip it entirely.
//   • Only net-new places are inserted.
//
// Requires: SUPABASE_SERVICE_ROLE_KEY in environment (bypasses RLS which only
// allows authenticated writes). If the key is absent, the function is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import type { PlaceResult } from "@/types/places";

export interface HarvestResult {
  synced: number;
  skipped: number;
  error: string | null;
}

/**
 * Upsert an array of Google Places into the `restaurants` table.
 *
 * @param places   - Normalised PlaceResult array from usePlacesNearby
 * @param cityName - The city these places belong to (used for the `city` column)
 */
export async function syncPlacesToSupabase(
  places: PlaceResult[],
  cityName: string,
): Promise<HarvestResult> {
  const supabase = createAdminClient();

  if (!supabase) {
    // Service role key not configured — silent no-op, not a user-facing error
    return { synced: 0, skipped: places.length, error: null };
  }

  // Only sync places that have the minimum required fields
  const valid = places.filter(
    (p) => p.place_id && p.name && p.latitude != null && p.longitude != null,
  );

  if (valid.length === 0) {
    return { synced: 0, skipped: places.length, error: null };
  }

  const rows = valid.map((p) => ({
    google_place_id: p.place_id,
    name:            p.name.trim(),
    city:            cityName.trim(),
    address:         (p.address || p.name).trim(),
    latitude:        p.latitude as number,
    longitude:       p.longitude as number,
    // Defaults for Google-sourced entries — admins can update these later
    style:           "Ostalo" as const,
    is_verified:     false,
    lepinja_rating:  0,
    tags:            [] as string[],
  }));

  const { data, error } = await supabase
    .from("restaurants")
    .upsert(rows, {
      onConflict:       "google_place_id",
      ignoreDuplicates: true,  // Never overwrite admin-verified data
    })
    .select("id");

  if (error) {
    console.error("[harvest] Supabase upsert error:", error.message);
    return { synced: 0, skipped: valid.length, error: error.message };
  }

  const synced = data?.length ?? 0;
  if (synced > 0) {
    console.log(`[harvest] ✅ Synced ${synced} new places to Supabase (city: ${cityName})`);
  }

  return { synced, skipped: valid.length - synced, error: null };
}
