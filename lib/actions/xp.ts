"use server";

import { revalidatePath } from "next/cache";

/**
 * Called by client components after awarding XP so Next.js invalidates
 * any cached server-rendered pages that display XP / rank data.
 */
export async function revalidateXP(): Promise<void> {
  revalidatePath("/[locale]/profile", "page");
  revalidatePath("/[locale]/academy", "page");
}
