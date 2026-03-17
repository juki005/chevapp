import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Lepinja rating (1–5) as lepinja emoji string */
export function formatLepinjaRating(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return "🥯".repeat(full) + (half ? "½" : "") + "·".repeat(empty);
}

/** Generate a Google Maps directions URL */
export function getGoogleMapsUrl(address: string, city: string): string {
  const query = encodeURIComponent(`${address}, ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}

/** Generate a Waze navigation URL */
export function getWazeUrl(lat: number | null, lng: number | null, address: string): string {
  if (lat && lng) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  const query = encodeURIComponent(address);
  return `https://waze.com/ul?q=${query}`;
}

/** Detect if user is on iOS */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Format a number with compact notation */
export function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

/** Capitalise first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
