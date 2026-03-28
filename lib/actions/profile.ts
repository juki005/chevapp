"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CevapStyle } from "@/types/database";

export interface UpdateProfileInput {
  username:       string;
  avatar_url:     string | null;
  favorite_style: CevapStyle | null;
  bio?:           string | null;
  gender?:        string | null;
  weight_kg?:     number | null;
  height_cm?:     number | null;
}

export interface UpdateProfileResult {
  success: boolean;
  error?:  string;
}

/**
 * Updates the authenticated user's profile fields.
 * Validates username uniqueness (case-insensitive, trims whitespace).
 * Calls revalidatePath so server-rendered pages reflect the change.
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { data: { user } }: { data: { user: { id: string } | null } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nisi prijavljen/a." };

    const username = input.username.trim();

    if (username.length < 2) {
      return { success: false, error: "Korisničko ime mora imati najmanje 2 znaka." };
    }
    if (username.length > 30) {
      return { success: false, error: "Korisničko ime može imati najviše 30 znakova." };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return { success: false, error: "Korisničko ime smije sadržavati samo slova, brojeve, _, . i -" };
    }

    // Uniqueness check — exclude current user
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Ovo korisničko ime je već zauzeto." };
    }

    const updatePayload: Record<string, unknown> = {
      username,
      avatar_url:     input.avatar_url,
      favorite_style: input.favorite_style,
      updated_at:     new Date().toISOString(),
    };
    if (input.bio       !== undefined) updatePayload.bio       = input.bio       ?? null;
    if (input.gender    !== undefined) updatePayload.gender    = input.gender    ?? null;
    if (input.weight_kg !== undefined) updatePayload.weight_kg = input.weight_kg ?? null;
    if (input.height_cm !== undefined) updatePayload.height_cm = input.height_cm ?? null;

    const { error: dbError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (dbError) {
      console.error("[updateProfile]", dbError.message);
      return { success: false, error: "Greška pri spremanju. Pokušaj ponovo." };
    }

    revalidatePath("/[locale]/profile",   "page");
    revalidatePath("/[locale]/community", "page");
    revalidatePath("/[locale]/academy",   "page");

    return { success: true };
  } catch (err) {
    console.error("[updateProfile] unexpected:", err);
    return { success: false, error: "Neočekivana greška. Pokušaj ponovo." };
  }
}
