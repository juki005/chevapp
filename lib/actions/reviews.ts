"use server";

// ─────────────────────────────────────────────────────────────────────────────
// lib/actions/reviews.ts
// Server actions for the public.place_reviews table (Sprint 17 migration 016).
//
// All writes are auth-gated; reads are public. The UNIQUE(user_id, place_id)
// constraint means a user can only have ONE review per place — we upsert so
// resubmission simply updates the existing row.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ── Types ────────────────────────────────────────────────────────────────────
export interface PlaceReview {
  id:           string;
  user_id:      string;
  place_id:     string;
  rating_meat:  number;
  rating_bread: number;
  comment:      string | null;
  photo_url:    string | null;
  created_at:   string;
  updated_at:   string;
}

export interface PlaceReviewWithAuthor extends PlaceReview {
  author_name:       string | null;
  author_avatar_url: string | null;
}

export interface SubmitReviewInput {
  placeId:     string;
  ratingMeat:  number;
  ratingBread: number;
  comment:     string | null;
  photoUrl:    string | null;
}

export interface SubmitReviewResult {
  success:   boolean;
  error?:    string;
  reviewId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// submitReview — upserts the caller's review for a place.
// Unique key: (user_id, place_id) → re-submitting updates the existing row.
// ─────────────────────────────────────────────────────────────────────────────
export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nisi prijavljen/a." };

    // Input validation
    if (!input.placeId || input.placeId.length > 256) {
      return { success: false, error: "Neispravan place_id." };
    }
    if (!Number.isInteger(input.ratingMeat) || input.ratingMeat < 1 || input.ratingMeat > 5) {
      return { success: false, error: "Ocjena mesa mora biti između 1 i 5." };
    }
    if (!Number.isInteger(input.ratingBread) || input.ratingBread < 1 || input.ratingBread > 5) {
      return { success: false, error: "Ocjena somuna mora biti između 1 i 5." };
    }
    const comment = input.comment?.trim() || null;
    if (comment && comment.length > 2000) {
      return { success: false, error: "Komentar može imati najviše 2000 znakova." };
    }

    // Upsert on (user_id, place_id)
    const { data, error } = await supabase
      .from("place_reviews")
      .upsert(
        {
          user_id:      user.id,
          place_id:     input.placeId,
          rating_meat:  input.ratingMeat,
          rating_bread: input.ratingBread,
          comment,
          photo_url:    input.photoUrl,
        },
        { onConflict: "user_id,place_id" },
      )
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/finder");
    revalidatePath("/community");
    return { success: true, reviewId: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Neočekivana greška." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteReview — owner-only (RLS enforces it too)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nisi prijavljen/a." };

    const { error } = await supabase
      .from("place_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/finder");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Neočekivana greška." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminDeleteReview — admin-only; removes ANY review (for abuse moderation).
// Regular users can only delete their own via deleteReview() above.
// ─────────────────────────────────────────────────────────────────────────────
export async function adminDeleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nisi prijavljen/a." };

    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (profile?.is_admin !== true) return { success: false, error: "Samo admin." };

    const { error } = await supabase.from("place_reviews").delete().eq("id", reviewId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/finder");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Neočekivana greška." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRecentReviewsForAdmin — admin-only; latest reviews across all places for
// quick moderation scanning. Joins profile + place name for context.
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminReviewRow extends PlaceReviewWithAuthor {
  place_name: string | null;
}

export async function getRecentReviewsForAdmin(limit = 50): Promise<AdminReviewRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profile?.is_admin !== true) return [];

  const { data, error } = await supabase
    .from("place_reviews")
    .select(`
      id, user_id, place_id, rating_meat, rating_bread, comment,
      photo_url, created_at, updated_at,
      profiles:user_id ( username, avatar_url )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  // Fetch restaurant names for place_ids that are google_place_ids stored in restaurants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeIds = Array.from(new Set((data as any[]).map((r) => r.place_id)));
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, google_place_id, name")
    .or(`id.in.(${placeIds.map((p) => `"${p}"`).join(",")}),google_place_id.in.(${placeIds.map((p) => `"${p}"`).join(",")})`);

  const nameByPlaceId = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (restaurants ?? []) as any[]) {
    if (r.google_place_id) nameByPlaceId.set(r.google_place_id, r.name);
    if (r.id)              nameByPlaceId.set(r.id,              r.name);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id:                row.id,
    user_id:           row.user_id,
    place_id:          row.place_id,
    rating_meat:       row.rating_meat,
    rating_bread:      row.rating_bread,
    comment:           row.comment,
    photo_url:         row.photo_url,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    author_name:       row.profiles?.username   ?? null,
    author_avatar_url: row.profiles?.avatar_url ?? null,
    place_name:        nameByPlaceId.get(row.place_id) ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// getReviewsForPlace — public list of reviews for one place, newest first.
// Joins profiles (username + avatar_url) for author display.
// ─────────────────────────────────────────────────────────────────────────────
export async function getReviewsForPlace(placeId: string): Promise<PlaceReviewWithAuthor[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("place_reviews")
    .select(`
      id, user_id, place_id, rating_meat, rating_bread, comment,
      photo_url, created_at, updated_at,
      profiles:user_id ( username, avatar_url )
    `)
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id:                row.id,
    user_id:           row.user_id,
    place_id:          row.place_id,
    rating_meat:       row.rating_meat,
    rating_bread:      row.rating_bread,
    comment:           row.comment,
    photo_url:         row.photo_url,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    author_name:       row.profiles?.username       ?? null,
    author_avatar_url: row.profiles?.avatar_url     ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// getReviewStatsForPlaces — batch avg+count lookup for many placeIds at once.
// Returns map { [placeId]: { avg, count } } — missing IDs simply absent.
// Used to decorate cards with an inline "⭐ 4.5 · 12 recenzija" badge.
// ─────────────────────────────────────────────────────────────────────────────
export interface PlaceReviewStats {
  avg:   number;
  count: number;
}

export async function getReviewStatsForPlaces(
  placeIds: string[],
): Promise<Record<string, PlaceReviewStats>> {
  if (placeIds.length === 0) return {};

  // Dedupe + hard-cap the IN list to prevent abuse
  const unique = Array.from(new Set(placeIds.filter(Boolean))).slice(0, 200);
  if (unique.length === 0) return {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  // Fetch all rows for the requested places and aggregate client-side.
  // Aggregation in PostgREST would need a view or RPC — fine for current scale.
  const { data, error } = await supabase
    .from("place_reviews")
    .select("place_id, rating_meat, rating_bread")
    .in("place_id", unique);

  if (error || !data) return {};

  const acc: Record<string, { sum: number; count: number }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data as any[])) {
    const overall = (row.rating_meat + row.rating_bread) / 2;
    if (!acc[row.place_id]) acc[row.place_id] = { sum: 0, count: 0 };
    acc[row.place_id].sum   += overall;
    acc[row.place_id].count += 1;
  }

  const out: Record<string, PlaceReviewStats> = {};
  for (const [id, v] of Object.entries(acc)) {
    out[id] = { avg: v.sum / v.count, count: v.count };
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyReviewForPlace — returns the caller's own review for a place (or null).
// Used to pre-fill the modal when the user has already reviewed.
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyReviewForPlace(placeId: string): Promise<PlaceReview | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("place_reviews")
    .select("id, user_id, place_id, rating_meat, rating_bread, comment, photo_url, created_at, updated_at")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlaceReview;
}
