// Shared PlaceResult type — used by /api/places (server) and client components
// Keep this file free of Next.js server-only imports (NextRequest / NextResponse)
// so it is safe to import in both client and server bundles.

export interface PlaceResult {
  place_id:  string;
  name:      string;
  address:   string;
  city:      string;
  latitude:  number | null;
  longitude: number | null;
  rating:    number | null;
  open_now:  boolean | null;
  types:     string[];
  source:    "google";
}
