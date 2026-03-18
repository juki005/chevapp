import { createClient } from "@/lib/supabase/server";
import { KitchenPageClient } from "@/components/kitchen/KitchenPageClient";
import { mapDbRecipe, RECIPES, type DbRecipe } from "@/constants/recipes";
import { getLocale } from "next-intl/server";

export const revalidate = 0;

export default async function KitchenPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Kitchen] Server fetch error:", error.message, error);
  }

  const initialRecipes =
    !error && data && data.length > 0
      ? data.map((row) => mapDbRecipe(row as unknown as DbRecipe, locale))
      : RECIPES;

  return <KitchenPageClient initialRecipes={initialRecipes} />;
}
