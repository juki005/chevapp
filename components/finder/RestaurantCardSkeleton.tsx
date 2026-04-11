/**
 * Skeleton placeholder for a RestaurantCard while DB/Places results are loading.
 * Uses animate-pulse (Tailwind) + CSS variable colours so it respects light/dark mode.
 */
export function RestaurantCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-4 animate-pulse"
      style={{
        background:   "rgb(var(--surface)/0.5)",
        borderColor:  "rgb(var(--border))",
      }}
    >
      {/* Image placeholder */}
      <div
        className="w-full h-36 rounded-xl mb-3"
        style={{ background: "rgb(var(--border))" }}
      />
      {/* Title */}
      <div
        className="h-4 rounded-lg mb-2 w-3/4"
        style={{ background: "rgb(var(--border))" }}
      />
      {/* Subtitle / city */}
      <div
        className="h-3 rounded-lg mb-3 w-1/2"
        style={{ background: "rgb(var(--border))" }}
      />
      {/* Rating dots */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{ background: "rgb(var(--border))" }}
          />
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
