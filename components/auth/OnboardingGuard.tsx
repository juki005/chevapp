"use client";

/**
 * OnboardingGuard
 *
 * Renders its children normally, but overlays the OnboardingFlow if the
 * currently logged-in user hasn't completed onboarding yet.
 *
 * Strategy:
 *   - Always render children (the page loads behind the overlay instantly)
 *   - On mount, check auth + profile.onboarding_completed via Supabase
 *   - Show overlay only when we're certain it's needed (avoids false positives)
 *   - Once onComplete() fires, dismiss the overlay immediately
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OnboardingFlow } from "./OnboardingFlow";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  // "unknown" = still checking, "needed" = show flow, "done" = hide
  const [status, setStatus]   = useState<"unknown" | "needed" | "done">("unknown");
  const [userId, setUserId]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          // Not logged in → no onboarding needed
          setStatus("done");
          return;
        }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        // Default to TRUE (done) — only show onboarding when explicitly false.
        // Covers: migration not yet run, column missing, or existing users.
        const completed = (profile as { onboarding_completed?: boolean } | null)
          ?.onboarding_completed ?? true;

        setStatus(completed ? "done" : "needed");
      } catch (err) {
        // Auth or DB failure — default to "done" so the page is never frozen.
        if (!cancelled) {
          console.warn("[OnboardingGuard] check failed, skipping onboarding:", err);
          setStatus("done");
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {children}

      {status === "needed" && userId && (
        <OnboardingFlow
          userId={userId}
          onComplete={() => setStatus("done")}
        />
      )}
    </>
  );
}
