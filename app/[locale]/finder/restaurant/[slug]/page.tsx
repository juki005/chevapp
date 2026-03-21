import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchGooglePlacesData } from "@/lib/googlePlaces";
import { RestaurantProfileClient } from "@/components/finder/RestaurantProfileClient";
import type { Restaurant, RestaurantReview } from "@/types";
import type { GooglePlacesData } from "@/lib/googlePlaces";

// Cache the page for 1 hour — Google Places data changes infrequently.
// The photo proxy has its own 24 h cache.
export const revalidate = 3600;

// ── Raw DB row types ──────────────────────────────────────────────────────────

interface DbRestaurant {
  id:             string;
  name:           string;
  style:          string;
  city:           string;
  address:        string;
  latitude:       number | null;
  longitude:      number | null;
  lepinja_rating: number;
  tags:           string[];
  is_verified:    boolean;
  phone:          string | null;
  website:        string | null;
  slug:           string | null;
  rating:         number | null;
  review_count:   number | null;
  description:    string | null;
  tags_style:     string[] | null;
  tags_meat:      string[] | null;
}

interface DbReview {
  id:              string;
  restaurant_id:   string;
  user_id:         string | null;
  user_name:       string;
  user_avatar_url: string | null;
  reviewer_tag:    string | null;
  review_text:     string;
  rating:          number;
  created_at:      string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function RestaurantProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase  = await createClient();

  // Fetch restaurant — try slug first, fall back to raw id
  const { data: raw, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, style, city, address, latitude, longitude, lepinja_rating, " +
      "tags, is_verified, phone, website, slug, rating, review_count, " +
      "description, tags_style, tags_meat"
    )
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .limit(1)
    .maybeSingle();

  if (error || !raw) notFound();

  const dbRow = raw as unknown as DbRestaurant;

  const restaurant: Restaurant = {
    id:             dbRow.id,
    name:           dbRow.name,
    style:          dbRow.style as Restaurant["style"],
    city:           dbRow.city,
    address:        dbRow.address,
    latitude:       dbRow.latitude,
    longitude:      dbRow.longitude,
    lepinja_rating: dbRow.lepinja_rating,
    tags:           dbRow.tags        ?? [],
    is_verified:    dbRow.is_verified,
    phone:          dbRow.phone,
    website:        dbRow.website,
    slug:           dbRow.slug,
    rating:         dbRow.rating,
    review_count:   dbRow.review_count,
    description:    dbRow.description,
    tags_style:     dbRow.tags_style  ?? [],
    tags_meat:      dbRow.tags_meat   ?? [],
  };

  // Fetch reviews + Google Places data in parallel
  const [reviewsResult, googleData] = await Promise.all([
    supabase
      .from("restaurant_reviews")
      .select(
        "id, restaurant_id, user_id, user_name, user_avatar_url, " +
        "reviewer_tag, review_text, rating, created_at"
      )
      .eq("restaurant_id", dbRow.id)
      .order("created_at", { ascending: false })
      .limit(10),

    // fetchGooglePlacesData returns null on any error — profile still renders
    fetchGooglePlacesData(dbRow.name, dbRow.city),
  ]);

  const reviews: RestaurantReview[] = (
    (reviewsResult.data as unknown as DbReview[]) ?? []
  ).map((r) => ({
    id:              r.id,
    restaurant_id:   r.restaurant_id,
    user_id:         r.user_id,
    user_name:       r.user_name,
    user_avatar_url: r.user_avatar_url,
    reviewer_tag:    r.reviewer_tag,
    review_text:     r.review_text,
    rating:          r.rating,
    created_at:      r.created_at,
  }));

  return (
    <RestaurantProfileClient
      restaurant={restaurant}
      reviews={reviews}
      googleData={googleData as GooglePlacesData | null}
    />
  );
}
