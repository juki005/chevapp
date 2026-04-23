// ── RestaurantCardSkeleton · finder (Sprint 26g · DS-migrated) ──────────────
// Skeleton placeholder for a RestaurantCard while DB/Places results are loading.
// Uses animate-pulse (Tailwind) and semantic colour tokens so it respects both
// Ugljen (dark) and Somun (light) modes.
//
// Sprint 26g changes:
//   - All inline style={{ background: "rgb(var(--token))" }} blocks collapsed
//     to className utilities (bg-surface/50, bg-border, border-border).
//   - rounded-2xl → rounded-card, rounded-xl → rounded-chip, rounded-lg →
//     rounded-chip (stays within DS shape scale).
// ────────────────────────────────────────────────────────────────────────────────

export function RestaurantCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface/50 p-4 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-36 rounded-chip mb-3 bg-border" />
      {/* Title */}
      <div className="h-4 rounded-chip mb-2 w-3/4 bg-border" />
      {/* Subtitle / city */}
      <div className="h-3 rounded-chip mb-3 w-1/2 bg-border" />
      {/* Rating dots */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-4 h-4 rounded-full bg-border" />
        ))}
      </div>
    </div>
  );
}

/** Six skeletons in a responsive grid — drop-in replacement for the results grid. */
export function RestaurantGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}
