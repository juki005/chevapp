// Finder loading — skeleton that matches the filter bar + grid layout
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-11 flex-1 rounded-xl bg-muted" />
        <div className="h-11 w-32 rounded-xl bg-muted" />
        <div className="h-11 w-24 rounded-xl bg-muted" />
      </div>

      {/* Style chips */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-muted flex-shrink-0" />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden">
            <div className="h-40 bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
