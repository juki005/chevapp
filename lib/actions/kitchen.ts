"use server";

import { createClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KitchenVideo {
  id:      string;
  title:   string;
  embedId: string;
  channel: string;
  style:   string; // e.g. "Sarajevski" | "Banjalučki" | "default"
}

// ── Fetch kitchen videos from DB ──────────────────────────────────────────────

export async function getKitchenVideos(): Promise<KitchenVideo[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data } = await supabase
      .from("kitchen_videos")
      .select("id, title, embed_id, channel, style")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!data || data.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((v: any) => ({
      id:      v.id,
      title:   v.title,
      embedId: v.embed_id,
      channel: v.channel ?? "",
      style:   v.style   ?? "default",
    }));
  } catch {
    return [];
  }
}
