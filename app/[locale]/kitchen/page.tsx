import { createClient } from "@/lib/supabase/server";
import { KitchenPageClient } from "@/components/kitchen/KitchenPageClient";
import { mapDbRecipe, type DbRecipe } from "@/constants/recipes";
import { getKitchenVideos } from "@/lib/actions/kitchen";
import { getLocale } from "next-intl/server";

export const revalidate = 0;

export default async function KitchenPage() {
  const locale = await getLocale();

  // ── DEBUG: verify env vars are present ──────────────────────────────────
  console.log("📡 URL Configured:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("🔑 Key Configured:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("recipes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ SUPABASE KITCHEN ERROR:", error.message, error.details, error.hint);
    console.error("❌ Full error object:", JSON.stringify(error, null, 2));
  } else {
    console.log(`✅ Kitchen fetch OK — rows returned: ${data?.length ?? 0}, count: ${count}`);
  }

  const initialRecipes =
    !error && data && data.length > 0
      ? data.map((row) => mapDbRecipe(row as unknown as DbRecipe, locale))
      : [];

  // Fetch kitchen videos in parallel — safe fallback to [] on error
  const initialVideos = await getKitchenVideos();

  return <KitchenPageClient initialRecipes={initialRecipes} initialVideos={initialVideos} />;
}
