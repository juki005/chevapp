"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CevapStyle } from "@/types/database";

// ── Auth guard ─────────────────────────────────────────────────────────────────
async function requireAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin === true ? user : null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers:           number;
  totalRestaurants:     number;
  verifiedRestaurants:  number;
  unverifiedRestaurants: number;
  totalReviews:         number;
  topStyle:             string;
}

export interface AdminUser {
  id:        string;
  username:  string;
  avatarUrl: string | null;
  xp:        number;
  isAdmin:   boolean;
  joinedAt:  string;
}

export interface AdminRestaurant {
  id:            string;
  name:          string;
  city:          string;
  address:       string;
  style:         string | null;
  isVerified:    boolean;
  createdAt:     string;
  googlePlaceId: string | null;
}

export interface AdminNewsPost {
  id:        string;
  title:     string;
  content:   string;
  imageUrl:  string | null;
  createdAt: string;
}

export interface AdminEvent {
  id:          string;
  title:       string;
  dateLabel:   string;
  location:    string;
  emoji:       string;
  description: string;
  tag:         string;
  tagColor:    string;
  isActive:    boolean;
  sortOrder:   number;
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats | null> {
  if (!(await requireAdmin())) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const [usersR, allR, verR, reviewsR, unverR, styleR] = await Promise.all([
    supabase.from("profiles").select("id",     { count: "exact", head: true }),
    supabase.from("restaurants").select("id",  { count: "exact", head: true }),
    supabase.from("restaurants").select("id",  { count: "exact", head: true }).eq("is_verified", true),
    supabase.from("reviews").select("id",      { count: "exact", head: true }),
    supabase.from("restaurants").select("id",  { count: "exact", head: true }).eq("is_verified", false),
    supabase.from("restaurants").select("style").eq("is_verified", true),
  ]);

  const counts: Record<string, number> = {};
  for (const r of styleR.data ?? []) if (r.style) counts[r.style] = (counts[r.style] ?? 0) + 1;
  const topStyle = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return {
    totalUsers:            usersR.count ?? 0,
    totalRestaurants:      allR.count   ?? 0,
    verifiedRestaurants:   verR.count   ?? 0,
    unverifiedRestaurants: unverR.count ?? 0,
    totalReviews:          reviewsR.count ?? 0,
    topStyle,
  };
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function getAdminUsers(search?: string): Promise<AdminUser[]> {
  if (!(await requireAdmin())) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  let q = supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, xp_points, is_admin, created_at")
    .order("xp_points", { ascending: false })
    .limit(100);
  if (search?.trim()) q = q.ilike("username", `%${search.trim()}%`);

  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    id:        p.id,
    username:  p.username ?? p.full_name ?? "Korisnik",
    avatarUrl: p.avatar_url ?? null,
    xp:        p.xp_points ?? 0,
    isAdmin:   p.is_admin  ?? false,
    joinedAt:  p.created_at,
  }));
}

export async function setUserXP(userId: string, xp: number): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("profiles").update({ xp_points: xp }).eq("id", userId);
  return !error;
}

export async function toggleUserAdmin(userId: string, makeAdmin: boolean): Promise<boolean> {
  const admin = await requireAdmin();
  if (!admin || admin.id === userId) return false; // can't change own role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("profiles").update({ is_admin: makeAdmin }).eq("id", userId);
  return !error;
}

// ── Restaurants ────────────────────────────────────────────────────────────────

export async function getAdminRestaurants(search?: string): Promise<AdminRestaurant[]> {
  if (!(await requireAdmin())) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  let q = supabase
    .from("restaurants")
    .select("id, name, city, address, style, is_verified, created_at, google_place_id")
    .order("is_verified", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(150);
  if (search?.trim()) q = q.ilike("name", `%${search.trim()}%`);

  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, city: r.city, address: r.address,
    style: r.style ?? null, isVerified: r.is_verified,
    createdAt: r.created_at, googlePlaceId: r.google_place_id ?? null,
  }));
}

export async function verifyRestaurant(id: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("restaurants").update({ is_verified: true }).eq("id", id);
  revalidatePath("/[locale]/finder", "page");
  return !error;
}

export async function updateRestaurantStyle(id: string, style: CevapStyle | null): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("restaurants").update({ style }).eq("id", id);
  return !error;
}

export async function deleteRestaurant(id: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  revalidatePath("/[locale]/finder", "page");
  return !error;
}

// ── News Posts ─────────────────────────────────────────────────────────────────

export async function getAdminNewsPosts(): Promise<AdminNewsPost[]> {
  if (!(await requireAdmin())) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("news_posts")
    .select("id, title, content, image_url, created_at")
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    id: p.id, title: p.title, content: p.content,
    imageUrl: p.image_url ?? null, createdAt: p.created_at,
  }));
}

export async function createNewsPost(
  title: string, content: string, imageUrl?: string
): Promise<boolean> {
  const admin = await requireAdmin();
  if (!admin) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("news_posts").insert({
    title, content, image_url: imageUrl || null, author_id: admin.id,
  });
  revalidatePath("/[locale]/community", "page");
  return !error;
}

export async function deleteNewsPost(id: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("news_posts").delete().eq("id", id);
  return !error;
}

// ── Events ─────────────────────────────────────────────────────────────────────

export async function getAdminEvents(): Promise<AdminEvent[]> {
  if (!(await requireAdmin())) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("events").select("*").order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((e: any) => ({
    id: e.id, title: e.title, dateLabel: e.date_label, location: e.location,
    emoji: e.emoji, description: e.description, tag: e.tag,
    tagColor: e.tag_color ?? "text-amber-400 bg-amber-400/10 border-amber-400/30",
    isActive: e.is_active ?? true, sortOrder: e.sort_order ?? 0,
  }));
}

export async function createEvent(input: {
  title: string; dateLabel: string; location: string; emoji: string;
  description: string; tag: string; tagColor: string; sortOrder: number;
}): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("events").insert({
    title: input.title, date_label: input.dateLabel, location: input.location,
    emoji: input.emoji, description: input.description, tag: input.tag,
    tag_color: input.tagColor, is_active: true, sort_order: input.sortOrder,
  });
  revalidatePath("/[locale]/community", "page");
  return !error;
}

export async function toggleEventActive(id: string, isActive: boolean): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("events").update({ is_active: isActive }).eq("id", id);
  return !error;
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("events").delete().eq("id", id);
  return !error;
}
