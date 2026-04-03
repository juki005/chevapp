"use server";

import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/gamification";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank:      number;
  name:      string;
  avatarUrl: string | null;
  xp:        number;
  badge:     string;
  streak:    number;
}

export interface FeedPost {
  id:             string;
  userName:       string;
  userAvatar:     string | null;
  userXP:         number;
  content:        string;
  restaurantName: string | null;
  restaurantCity: string | null;
  likesCount:     number;
  isInsiderTip:   boolean;
  createdAt:      string;
}

export interface RecentReview {
  id:             string;
  userName:       string;
  userAvatar:     string | null;
  restaurantName: string;
  restaurantCity: string;
  rating:         number;
  comment:        string | null;
  createdAt:      string;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, xp_points")
      .order("xp_points", { ascending: false })
      .limit(10);

    if (!profiles || profiles.length === 0) return [];

    // Fetch streaks separately to avoid FK join issues
    const userIds = profiles.map((p: { id: string }) => p.id);
    const { data: stats } = await supabase
      .from("user_stats")
      .select("user_id, current_streak")
      .in("user_id", userIds);

    const streakMap: Record<string, number> = {};
    for (const s of stats ?? []) {
      streakMap[s.user_id] = s.current_streak ?? 0;
    }

    return profiles.map((p: {
      id: string; username: string | null; full_name: string | null;
      avatar_url: string | null; xp_points: number | null;
    }, i: number) => {
      const xp   = p.xp_points ?? 0;
      const name = p.username ?? p.full_name ?? "Korisnik";
      const rank = getRank(xp);
      return {
        rank:      i + 1,
        name,
        avatarUrl: p.avatar_url ?? null,
        xp,
        badge:     `${rank.emoji} ${rank.title}`,
        streak:    streakMap[p.id] ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ── Community Feed (from `posts` table) ───────────────────────────────────────

export async function getActivityFeed(): Promise<FeedPost[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, restaurant_id, user_id, likes_count, is_insider_tip, created_at")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!posts || posts.length === 0) return [];

    // Batch-fetch profiles + restaurants to avoid N+1
    const userIds        = [...new Set(posts.map((p: { user_id: string }) => p.user_id))] as string[];
    const restaurantIds  = [...new Set(posts.filter((p: { restaurant_id: string | null }) => p.restaurant_id).map((p: { restaurant_id: string }) => p.restaurant_id))] as string[];

    const [profilesRes, restaurantsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url, xp_points").in("id", userIds),
      restaurantIds.length > 0
        ? supabase.from("restaurants").select("id, name, city").in("id", restaurantIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap: Record<string, { username: string | null; avatar_url: string | null; xp_points: number | null }> = {};
    for (const p of profilesRes.data ?? []) profileMap[p.id] = p;

    const restaurantMap: Record<string, { name: string; city: string }> = {};
    for (const r of restaurantsRes.data ?? []) restaurantMap[r.id] = r;

    return posts.map((p: {
      id: string; content: string; restaurant_id: string | null; user_id: string;
      likes_count: number; is_insider_tip: boolean; created_at: string;
    }) => {
      const profile    = profileMap[p.user_id];
      const restaurant = p.restaurant_id ? restaurantMap[p.restaurant_id] : null;
      return {
        id:             p.id,
        userName:       profile?.username ?? "Korisnik",
        userAvatar:     profile?.avatar_url ?? null,
        userXP:         profile?.xp_points ?? 0,
        content:        p.content,
        restaurantName: restaurant?.name ?? null,
        restaurantCity: restaurant?.city ?? null,
        likesCount:     p.likes_count ?? 0,
        isInsiderTip:   p.is_insider_tip ?? false,
        createdAt:      p.created_at,
      };
    });
  } catch {
    return [];
  }
}

// ── Recent Reviews (for activity sidebar / feed enrichment) ───────────────────

export async function getRecentReviews(limit = 5): Promise<RecentReview[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: reviews } = await supabase
      .from("reviews")
      .select("id, user_id, restaurant_id, rating, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!reviews || reviews.length === 0) return [];

    const userIds       = [...new Set(reviews.map((r: { user_id: string }) => r.user_id))] as string[];
    const restaurantIds = [...new Set(reviews.map((r: { restaurant_id: string }) => r.restaurant_id))] as string[];

    const [profilesRes, restaurantsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
      supabase.from("restaurants").select("id, name, city").in("id", restaurantIds),
    ]);

    const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    for (const p of profilesRes.data ?? []) profileMap[p.id] = p;

    const restaurantMap: Record<string, { name: string; city: string }> = {};
    for (const r of restaurantsRes.data ?? []) restaurantMap[r.id] = r;

    return reviews.map((r: { id: string; user_id: string; restaurant_id: string; rating: number; comment: string | null; created_at: string }) => ({
      id:             r.id,
      userName:       profileMap[r.user_id]?.username ?? "Korisnik",
      userAvatar:     profileMap[r.user_id]?.avatar_url ?? null,
      restaurantName: restaurantMap[r.restaurant_id]?.name ?? "Restoran",
      restaurantCity: restaurantMap[r.restaurant_id]?.city ?? "",
      rating:         r.rating,
      comment:        r.comment,
      createdAt:      r.created_at,
    }));
  } catch {
    return [];
  }
}
