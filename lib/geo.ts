/**
 * ChevApp Geo Utilities
 * Haversine distance, point-to-segment distance, polyline sampling
 * for the Route Planner corridor search.
 */

const R = 6371; // Earth radius in km

/** Degrees → radians */
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two lat/lng points (km).
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Shortest distance (km) from point P to the line segment A→B.
 * Uses Cartesian approximation — accurate enough for ≤500 km routes.
 */
export function distanceToSegmentKm(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  // Approximate to Cartesian (flat earth) — fine for regional distances
  const cosLat = Math.cos(toRad((aLat + bLat) / 2));

  const ax = aLng * cosLat, ay = aLat;
  const bx = bLng * cosLat, by = bLat;
  const px = pLng * cosLat, py = pLat;

  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  const closestLat = ay + t * dy;
  const closestLng = (ax + t * dx) / cosLat;

  return haversineKm(pLat, pLng, closestLat, closestLng);
}

// ── Polyline utilities ────────────────────────────────────────────────────────

/**
 * Decode a Google Maps encoded polyline string into lat/lng coordinates.
 * Pure JS — no Google library required.
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded) return [];
  const pts: Array<{ lat: number; lng: number }> = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

/**
 * Sample one point every `stepKm` km along a polyline path.
 * Always includes the first and last point.
 */
export function samplePolyline(
  points: Array<{ lat: number; lng: number }>,
  stepKm = 7,
): Array<{ lat: number; lng: number }> {
  if (points.length === 0) return [];
  const samples = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    acc += haversineKm(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat,     points[i].lng,
    );
    if (acc >= stepKm) { samples.push(points[i]); acc = 0; }
  }
  const last = points[points.length - 1];
  if (samples[samples.length - 1] !== last) samples.push(last);
  return samples;
}

/**
 * Filter restaurants whose minimum distance to any sample point is ≤ radiusKm.
 * Deduplicates by id; returns results sorted by distanceKm ascending.
 */
export function filterByPolylineSamples<
  T extends { id: string; latitude: number | null; longitude: number | null },
>(
  restaurants: T[],
  samplePoints: Array<{ lat: number; lng: number }>,
  radiusKm: number,
): Array<T & { distanceKm: number }> {
  const seen = new Set<string>();
  const results: Array<T & { distanceKm: number }> = [];

  for (const r of restaurants) {
    if (r.latitude == null || r.longitude == null || seen.has(r.id)) continue;
    let minDist = Infinity;
    for (const pt of samplePoints) {
      const d = haversineKm(r.latitude, r.longitude, pt.lat, pt.lng);
      if (d < minDist) minDist = d;
      if (minDist <= radiusKm) break; // early exit
    }
    if (minDist <= radiusKm) {
      seen.add(r.id);
      results.push({ ...r, distanceKm: Math.round(minDist * 10) / 10 });
    }
  }
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Minimum perpendicular distance (km) from a point to any segment of a polyline.
 *
 * Iterates every consecutive segment and calls distanceToSegmentKm on each,
 * returning the global minimum. This is the correct "distance to road" metric —
 * unlike min-distance-to-sample-point, it never over-estimates for points that
 * sit between two sample dots on a straight stretch of road.
 */
export function distanceToPolylineKm(
  lat:      number,
  lng:      number,
  polyline: Array<{ lat: number; lng: number }>,
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineKm(lat, lng, polyline[0].lat, polyline[0].lng);
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegmentKm(
      lat, lng,
      polyline[i].lat,     polyline[i].lng,
      polyline[i + 1].lat, polyline[i + 1].lng,
    );
    if (d < min) min = d;
    if (min === 0) break; // can't improve further
  }
  return min;
}

// ── Segment-based filter (legacy straight-line approach) ──────────────────────

/**
 * Filter restaurants by proximity to route A→B within radiusKm.
 */
export function filterByRoute<T extends { latitude: number | null; longitude: number | null }>(
  restaurants: T[],
  aLat: number, aLng: number,
  bLat: number, bLng: number,
  radiusKm: number
): Array<T & { distanceKm: number }> {
  return restaurants
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      ...r,
      distanceKm: distanceToSegmentKm(r.latitude!, r.longitude!, aLat, aLng, bLat, bLng),
    }))
    .filter((r) => r.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
