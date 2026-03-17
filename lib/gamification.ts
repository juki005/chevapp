/**
 * lib/gamification.ts
 *
 * Client-side gamification helpers.
 * All functions accept a Supabase browser client so they can be called
 * from any client component without circular imports.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * GameClient is derived from the return type of createBrowserClient so it is
 * structurally identical to what createClient() in lib/supabase/client.ts
 * returns — preventing the SupabaseClient<Database> ↔ BrowserClient type
 * mismatch that occurs when @supabase/supabase-js and @supabase/ssr resolve
 * the same generic differently across package boundaries.
 */
export type GameClient = ReturnType<typeof createBrowserClient<Database>>;

// ── Rank system ───────────────────────────────────────────────────────────────

export const RANKS = [
  { title: "Početnik",    minXP: 0,    maxXP: 499,  emoji: "🌱", color: "text-green-400",  bg: "bg-green-400/10"  },
  { title: "Gurman",      minXP: 500,  maxXP: 999,  emoji: "🍽️", color: "text-blue-400",   bg: "bg-blue-400/10"   },
  { title: "Poznavatelj", minXP: 1000, maxXP: 1999, emoji: "🧑‍🍳", color: "text-purple-400", bg: "bg-purple-400/10" },
  { title: "Šef",         minXP: 2000, maxXP: 3999, emoji: "👨‍🍳", color: "text-amber-400",  bg: "bg-amber-400/10"  },
  { title: "Maestro",     minXP: 4000, maxXP: Infinity, emoji: "🏆", color: "text-orange-400", bg: "bg-orange-400/10" },
] as const;

export type RankTitle = typeof RANKS[number]["title"];

export function getRank(xp: number) {
  return [...RANKS].reverse().find((r) => xp >= r.minXP) ?? RANKS[0];
}

export function getNextRank(xp: number) {
  return RANKS.find((r) => r.minXP > xp) ?? null;
}

/** Progress 0–100 within the current rank band */
export function rankProgress(xp: number): number {
  const current = getRank(xp);
  const next    = getNextRank(xp);
  if (!next) return 100; // Maestro — already at max
  const bandSize = next.minXP - current.minXP;
  const inBand   = xp - current.minXP;
  return Math.round((inBand / bandSize) * 100);
}

// ── User stats ────────────────────────────────────────────────────────────────

// Extends user_stats with xp_points from the profiles table (authoritative XP).
export type UserStats = Database["public"]["Tables"]["user_stats"]["Row"] & {
  xp_points: number;
};

/** Minimal stats shape built purely from profile data (no user_stats row needed) */
function syntheticStats(userId: string, xp: number): UserStats {
  return {
    user_id:                    userId,
    xp_total:                   xp,
    xp_points:                  xp,
    current_streak:             0,
    last_activity_date:         null,
    rank_title:                 getRank(xp).title,
    daily_challenge_claimed_at: null,
    created_at:                 new Date().toISOString(),
    updated_at:                 new Date().toISOString(),
  };
}

export async function getUserStats(
  userId: string,
  supabase: GameClient
): Promise<UserStats | null> {
  // profiles.xp_points is the authoritative source — always fetch it first
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_points")
    .eq("id", userId)
    .single();

  const profileXP = profile?.xp_points ?? 0;

  // Try user_stats — gracefully degrade if the table is missing or has no row
  const { data: statsData, error: statsError } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (statsError) {
    // PGRST116 = no row yet; any other code = table missing / RLS issue.
    // Either way, synthesise a valid object from profile XP so the UI never crashes.
    if (statsError.code !== "PGRST116") {
      console.warn("[gamification] getUserStats fallback:", statsError.message);
    }
    return syntheticStats(userId, profileXP);
  }

  // Prefer profile XP (more up-to-date) but keep the real streak/challenge data
  const xp = profileXP > 0 ? profileXP : statsData.xp_total;
  return {
    ...statsData,
    xp_total:  xp,
    xp_points: xp,
  };
}

// ── Award XP ──────────────────────────────────────────────────────────────────
// Calls the `award_xp` Postgres function (SECURITY DEFINER) which handles
// streak logic and rank assignment atomically.

export interface AwardXPResult {
  stats:       UserStats;
  leveledUp:   boolean;
  newRank:     typeof RANKS[number];
  prevRankXP:  number;
}

export async function awardXP(
  userId:  string,
  points:  number,
  supabase: GameClient
): Promise<AwardXPResult | null> {
  // Capture previous XP (from profiles, the authoritative source)
  const prev   = await getUserStats(userId, supabase);
  const prevXP = prev?.xp_points ?? prev?.xp_total ?? 0;

  // Try the streak-tracking RPC (may not exist in all envs — always ignore errors)
  let rpcXP: number | null = null;
  try {
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc("award_xp", { p_user_id: userId, p_points: points })
      .single();
    if (!rpcErr && rpcData) {
      rpcXP = (rpcData as UserStats | null)?.xp_total ?? null;
    }
  } catch { /* RPC missing — silently ignore */ }

  // Determine the definitive new XP value
  const newXP = rpcXP ?? (prevXP + points);

  // Always upsert profiles.xp_points — this is the column the app reads
  await supabase
    .from("profiles")
    .upsert(
      { id: userId, xp_points: newXP, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  const stats: UserStats = {
    ...(prev ?? {
      user_id:                    userId,
      xp_total:                   newXP,
      xp_points:                  newXP,
      current_streak:             0,
      last_activity_date:         null,
      rank_title:                 getRank(newXP).title,
      daily_challenge_claimed_at: null,
      created_at:                 new Date().toISOString(),
      updated_at:                 new Date().toISOString(),
    }),
    xp_total:  newXP,
    xp_points: newXP,
  };

  const prevRank  = getRank(prevXP);
  const newRank   = getRank(newXP);
  const leveledUp = newRank.title !== prevRank.title;

  return { stats, leveledUp, newRank, prevRankXP: prevXP };
}

// ── Daily challenge ───────────────────────────────────────────────────────────
// Returns { claimed: true } if just claimed, { claimed: false } if already done today.

export async function claimDailyChallenge(
  userId:   string,
  supabase: GameClient,
  points:   number = 30
): Promise<{ success: boolean; alreadyClaimed: boolean }> {
  const { data, error } = await supabase
    .rpc("claim_daily_challenge", { p_user_id: userId, p_points: points })
    .single();

  if (error) {
    console.error("[gamification] claimDailyChallenge rpc error:", error.message);
    return { success: false, alreadyClaimed: false };
  }

  const claimed = data as boolean;
  return { success: claimed, alreadyClaimed: !claimed };
}

/** Check if today's challenge is already claimed (for initial render) */
export function isTodayClaimed(stats: UserStats | null): boolean {
  if (!stats?.daily_challenge_claimed_at) return false;
  return stats.daily_challenge_claimed_at === new Date().toISOString().split("T")[0];
}

/**
 * Returns true if the user has logged any activity today.
 * Drives the streak flame colour in the Navbar and the daily challenge card state.
 */
export function isActivityToday(stats: UserStats | null): boolean {
  if (!stats?.last_activity_date) return false;
  return stats.last_activity_date === new Date().toISOString().split("T")[0];
}

// ── Word of the Day ───────────────────────────────────────────────────────────

export type WordOfDay = Database["public"]["Tables"]["word_of_the_day"]["Row"];

/** Hardcoded fallback pool — shown if DB table is empty or migration not run */
const FALLBACK_WORDS: Omit<WordOfDay, "id" | "created_at" | "display_date">[] = [
  { word: "Ćevapi",   definition: "Ručno oblikovane mesne rolade, grilane na žaru. Simbol balkanske kuhinje.", tags: ["meso", "osnove"] },
  { word: "Somun",    definition: "Mekani bosanski kruh, pečen na kamenu. Neophodan prilog uz ćevape.", tags: ["kruh", "tradicija"] },
  { word: "Kajmak",   definition: "Kremasti mliječni namaz. Bogatog okusa, neophodan uz svaki ćevap.", tags: ["mliječno", "prilog"] },
  { word: "Ajvar",    definition: "Začinski umak od pečenih crvenih paprika. Balkanski kečap.", tags: ["umak", "vegetarijansko"] },
  { word: "Žar",      definition: "Ugasnuta žeravica bez plamena. Savršena temperatura za ćevape.", tags: ["tehnika"] },
  { word: "Lepinja",  definition: "Pljosnati mekani kruh, regionalna alternativa somunu.", tags: ["kruh", "osnove"] },
  { word: "Roštilj",  definition: "Grill na drveni ugljen. Srce balkanske kuhinje na otvorenom.", tags: ["tehnika", "oprema"] },
  { word: "Mješano",  definition: "Kombinirana porcija raznih mesnih specijaliteta s roštilja.", tags: ["meso", "specijalitet"] },
];

export async function getWordOfDay(supabase: GameClient): Promise<WordOfDay | null> {
  const today = new Date().toISOString().split("T")[0];

  // 1. Try today's pinned word
  const { data: pinned } = await supabase
    .from("word_of_the_day")
    .select("*")
    .eq("display_date", today)
    .single();

  if (pinned) return pinned;

  // 2. Pick a random word from the pool
  const { data: pool } = await supabase
    .from("word_of_the_day")
    .select("*")
    .is("display_date", null);

  if (pool && pool.length > 0) {
    // Deterministic-ish: use today's date as seed so the same word shows all day
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return pool[dayOfYear % pool.length];
  }

  // 3. Pure fallback — DB not yet populated
  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const w = FALLBACK_WORDS[dayOfYear % FALLBACK_WORDS.length];
  return { id: "fallback", created_at: today, display_date: null, ...w };
}
