import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RestaurantInsert = Database["public"]["Tables"]["restaurants"]["Insert"];

const LEGENDARY_RESTAURANTS: RestaurantInsert[] = [
  {
    name: "Željo 1",
    style: "Sarajevski" as const,
    city: "Sarajevo",
    address: "Kundurdžiluk 19",
    latitude: 43.8591,
    longitude: 18.4322,
    lepinja_rating: 5.0,
    tags: ["Govedina", "Janjetina", "Otvoreno", "Legendarna lokacija"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
  {
    name: "Kod Muje",
    style: "Banjalučki" as const,
    city: "Banja Luka",
    address: "Zdrave Korde 1",
    latitude: 44.7752,
    longitude: 17.1881,
    lepinja_rating: 4.8,
    tags: ["Govedina", "Pet-friendly", "Otvoreno"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
  {
    name: "Hari",
    style: "Travnički" as const,
    city: "Travnik",
    address: "Varoš 1",
    latitude: 44.2258,
    longitude: 17.6611,
    lepinja_rating: 5.0,
    tags: ["Janjetina", "Travnički sir", "Legendarna lokacija"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
  {
    name: "Tvornica Faširanaca",
    style: "Ostalo" as const,
    city: "Zagreb",
    address: "Ilica 65",
    latitude: 45.8121,
    longitude: 15.9702,
    lepinja_rating: 4.5,
    tags: ["Govedina", "Otvoreno", "Zagreb"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
  {
    name: "Kantun Paulina",
    style: "Ostalo" as const,
    city: "Split",
    address: "Matošića ul. 1",
    latitude: 43.5081,
    longitude: 16.4402,
    lepinja_rating: 4.7,
    tags: ["Govedina", "Morska veza", "Split"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
  {
    name: "Kralj Roštilja",
    style: "Leskovački" as const,
    city: "Leskovac",
    address: "Centar",
    latitude: 42.9983,
    longitude: 21.9461,
    lepinja_rating: 4.9,
    tags: ["Leskovački", "Pikantno", "Tradicija", "Legendarna lokacija"],
    is_verified: true,
    gallery_urls: [],
    status_reports: [],
  },
];

export async function POST() {
  try {
    const supabase = await createClient();

    // Step 1: Delete existing seeded restaurants by their known names
    // (safer than truncating the whole table)
    const seedNames = LEGENDARY_RESTAURANTS.map((r) => r.name);
    const { error: deleteError } = await supabase
      .from("restaurants")
      .delete()
      .in("name", seedNames);

    if (deleteError) {
      console.error("[seed] Delete step failed:", deleteError);
      // Non-fatal — table might be empty. Continue to insert.
    }

    // Step 2: Fresh insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: insertError } = await supabase
      .from("restaurants")
      .insert(LEGENDARY_RESTAURANTS as any)
      .select("id, name, city, lepinja_rating");

    if (insertError) {
      console.error("[seed] Insert failed:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          hint: insertError.hint ?? "Check Supabase RLS policies — ensure the anon key can INSERT into 'restaurants'.",
          details: insertError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `✅ ${data?.length ?? 0} legendary restaurants seeded successfully!`,
      restaurants: data,
    });
  } catch (err) {
    console.error("[seed] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: "Send POST /api/seed to seed the restaurants table (delete-then-insert).",
    willSeed: LEGENDARY_RESTAURANTS.map((r) => ({
      name: r.name,
      city: r.city,
      style: r.style,
      lepinja_rating: r.lepinja_rating,
    })),
  });
}
