/** Known city coordinates for Gastro Route Planner geo-lookup. */
export const CITY_COORDS: Record<string, [number, number]> = {
  // Croatia
  "zagreb":           [45.8150, 15.9819],
  "split":            [43.5081, 16.4402],
  "rijeka":           [45.3271, 14.4422],
  "osijek":           [45.5550, 18.6950],
  "dubrovnik":        [42.6507, 18.0944],
  "zadar":            [44.1194, 15.2314],
  "pula":             [44.8683, 13.8481],
  "slavonski brod":   [45.1603, 18.0156],
  "varaždin":         [46.3044, 16.3378],
  "sisak":            [45.4658, 16.3752],
  // Bosnia & Herzegovina
  "sarajevo":         [43.8563, 18.4131],
  "banja luka":       [44.7751, 17.1878],
  "travnik":          [44.2261, 17.6614],
  "mostar":           [43.3438, 17.8078],
  "tuzla":            [44.5384, 18.6762],
  "zenica":           [44.2014, 17.9077],
  "brčko":            [44.8709, 18.8102],
  "konjic":           [43.6531, 17.9658],
  "foča":             [43.5024, 18.7724],
  "bijeljina":        [44.7565, 19.2148],
  // Serbia
  "beograd":          [44.8176, 20.4569],
  "belgrade":         [44.8176, 20.4569],
  "novi sad":         [45.2671, 19.8335],
  "niš":              [43.3209, 21.8956],
  "nis":              [43.3209, 21.8956],
  "leskovac":         [42.9983, 21.9461],
  "kragujevac":       [44.0128, 20.9115],
  "subotica":         [46.1006, 19.6672],
  // Montenegro
  "podgorica":        [42.4304, 19.2594],
  "bar":              [42.0938, 19.0978],
  "nikšić":           [42.7731, 18.9441],
  // Slovenia
  "ljubljana":        [46.0569, 14.5058],
  "maribor":          [46.5547, 15.6467],
  "celje":            [46.2311, 15.2686],
  // North Macedonia
  "skopje":           [41.9965, 21.4314],
  "bitola":           [41.0297, 21.3290],
  // Kosovo
  "prishtina":        [42.6629, 21.1655],
  "pristina":         [42.6629, 21.1655],
};

/**
 * Resolve a city name (case-insensitive, trimmed) to [lat, lng].
 * Returns null if not found.
 */
export function resolveCityCoords(input: string): [number, number] | null {
  const key = input.trim().toLowerCase();
  return CITY_COORDS[key] ?? null;
}
