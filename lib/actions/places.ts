"use server";

// ─────────────────────────────────────────────────────────────────────────────
// lib/actions/places.ts
// Server actions for the user-submitted places pipeline (Sprint 19).
//
// - submitNewPlace    → any authenticated user can propose a new restaurant.
//                       Row lands with is_approved = false; filtered from the
//                       public finder query by RLS (see migration 016).
// - getPendingPlaces  → admin-only; moderation queue.
// - approvePlace      → admin-only; flips is_approved = true + verified = true.
// - rejectPlace       → admin-only; deletes the pending row entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CevapStyle } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────────────────
export interface SubmitPlaceInput {
  name:        string;
  city:        string;
  address:     string;
  style?:      CevapStyle | null;
  phone?:      string | null;
  website?:    string | null;
  description?: string | null;         // stored into tags[0] for now (no dedicated column)
}

export interface SubmitPlaceResult {
  success:       boolean;
  error?:        string;
  restaurantId?: string;
}

export interface PendingPlace {
  id:            string;
  name:          string;
  city:          string;
  address:       string;
  style:         string | null;
  phone:         string | null;
  website:       string | null;
  tags:          string[];
  submittedBy:   string | null;
  submittedByName: string | null;
  createdAt:     string;
}

// ── Admin guard ──────────────────────────────────────────────────────────────
async function requireAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_admin === true ? user : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// submitNewPlace — any authenticated user.
// Forces is_approved = false and submitted_by = auth.uid() (RLS enforces it).
// ─────────────────────────────────────────────────────────────────────────────
export async function submitNewPlace(input: SubmitPlaceInput): Promise<SubmitPlaceResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Nisi prijavljen/a." };

    // ── Validation ──────────────────────────────────────────────────────────
    const name    = input.name?.trim();
    const city    = input.city?.trim();
    const address = input.address?.trim();
    if (!name    || name.length    > 200) return { success: false, error: "Ime je obavezno (max 200 znakova)." };
    if (!city    || city.length    > 120) return { success: false, error: "Grad je obavezan (max 120 znakova)." };
    if (!address || address.length > 300) return { success: false, error: "Adresa je obavezna (max 300 znakova)." };
    if (input.phone   && input.phone.length   > 80)  return { success: false, error: "Telefon predug." };
    if (input.website && input.website.length > 300) return { success: false, error: "Web adresa preduga." };

    // Pack an optional user description into tags[0] so we don't need a new
    // column right now. Admin can clean this up on approval.
    const tags = input.description?.trim()
      ? [input.description.trim().slice(0, 500)]
      : [];

    const insertRow = {
      name,
      city,
      address,
      style:          input.style ?? "Ostalo",
      phone:          input.phone?.trim()   || null,
      website:        input.website?.trim() || null,
      tags,
      is_verified:    false,          // community submissions start unverified
      is_approved:    false,          // RLS forces this on public insert too
      submitted_by:   user.id,
      lepinja_rating: 0,
    };

    const { data, error } = await supabase
      .from("restaurants")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/finder");
    revalidatePath("/admin");
    return { success: true, restaurantId: data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Neočekivana greška." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingPlaces — admin-only moderation queue.
// ─────────────────────────────────────────────────────────────────────────────
export async function getPendingPlaces(): Promise<PendingPlace[]> {
  if (!(await requireAdmin())) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      id, name, city, address, style, phone, website, tags,
      submitted_by, created_at,
      profiles:submitted_by ( username, full_name )
    `)
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id:              r.id,
    name:            r.name,
    city:            r.city,
    address:         r.address,
    style:           r.style ?? null,
    phone:           r.phone ?? null,
    website:         r.website ?? null,
    tags:            r.tags ?? [],
    submittedBy:     r.submitted_by ?? null,
    submittedByName: r.profiles?.username ?? r.profiles?.full_name ?? null,
    createdAt:       r.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// approvePlace — admin-only; marks a submission as approved + verified.
// ─────────────────────────────────────────────────────────────────────────────
export async function approvePlace(id: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Samo admin." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("restaurants")
    .update({ is_approved: true, is_verified: true })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/finder");
  revalidatePath("/admin");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// rejectPlace — admin-only; deletes the pending row.
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectPlace(id: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Samo admin." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("id", id)
    .eq("is_approved", false);  // belt-and-suspenders: never delete approved rows
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}
