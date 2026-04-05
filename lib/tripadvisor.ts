// Pure utility — NOT a server action.
// Safe to import in both client and server components.
export function getTripAdvisorUrl(name: string): string {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(name)}`;
}
