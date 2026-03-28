"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActivityType = "GAME" | "REVIEW";

export interface ActivityResult {
  success:              boolean;
  /** True if this is the first activity logged today (triggers daily bonus) */
  isFirstActivityToday: boolean;
  /** +20 XP awarded as daily challenge bonus, 0 if already active today */
  bonusXP:              number;
  newStreak:            number;
  streakIncreased:      boolean;
}

const DAILY_BONUS_XP = 20;

/**
 * Records a user activity (game win or review submission).
 * Handles streak logic and awards a daily challenge bonus once per calendar day.
 *
 * Streak rules:
 *  - last_activity_date === today  → maintain (no-op, already counted)
 *  - last_activity_date === yesterday → increment streak by 1
 *  - last_activity_date > 1 day ago  → reset streak to 1
 *  - no previous activity            → set streak to 1
 *
 * Called from client components (server action — runs server-side with auth cookies).
 */
export async function recordUserActivity(
  type: ActivityType // kept for future per-type logic / analytics
): Promise<ActivityResult> {
  const fallback: ActivityResult = {
    success: false,
    isFirstActivityToday: false,
    bonusXP: 0,
    newStreak: 0,
    streakIncreased: false,
  };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallback;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Read current stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("current_streak, last_activity_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const statsTyped    = stats as { current_streak: number; last_activity_date: string | null } | null;
    const lastActivity  = statsTyped?.last_activity_date ?? null;
    const currentStreak = statsTyped?.current_streak ?? 0;

    // Already active today — nothing to update
    if (lastActivity === today) {
      return {
        success: true,
        isFirstActivityToday: false,
        bonusXP: 0,
        newStreak: currentStreak,
        streakIncreased: false,
      };
    }

    // ── Compute new streak ─────────────────────────────────────────────────
    let newStreak = 1;
    if (lastActivity) {
      const diffMs   = new Date(today).getTime() - new Date(lastActivity).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak = currentStreak + 1; // consecutive day
      }
      // diffDays > 1 → gap, reset to 1 (already set above)
    }

    // ── Update user_stats ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: statsError } = await (supabase as any)
      .from("user_stats")
      .upsert(
        {
          user_id:                    user.id,
          current_streak:             newStreak,
          last_activity_date:         today,
          daily_challenge_claimed_at: today,
        },
        { onConflict: "user_id" }
      );

    if (statsError) {
      console.error("[recordUserActivity] user_stats upsert failed — aborting XP award:", statsError.message);
      return fallback;
    }

    // ── Award daily bonus XP to profiles ──────────────────────────────────
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("id", user.id)
      .single();

    const profileData = profileRaw as { xp_points: number } | null;
    const currentXP = profileData?.xp_points ?? 0;
    await supabase
      .from("profiles")
      .update({
        xp_points:  currentXP + DAILY_BONUS_XP,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as never)
      .eq("id", user.id);

    // Invalidate server-rendered pages that display XP / streak
    revalidatePath("/[locale]/profile", "page");
    revalidatePath("/[locale]/academy", "page");

    return {
      success:              true,
      isFirstActivityToday: true,
      bonusXP:              DAILY_BONUS_XP,
      newStreak,
      streakIncreased:      newStreak > currentStreak,
    };
  } catch (err) {
    console.error("[recordUserActivity]", err);
    return fallback;
  }
}
