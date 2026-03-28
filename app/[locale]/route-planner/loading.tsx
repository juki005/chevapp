// Route Planner loading — skeleton for the two-city input + map area
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">

      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-52" />
        <div className="h-4 bg-muted rounded w-80" />
      </div>

      {/* City inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-12 rounded-xl bg-muted" />
      </div>

      {/* Search button */}
      <div className="h-11 w-40 rounded-xl bg-muted" />

      {/* Map placeholder */}
      <div className="h-[400px] rounded-2xl bg-muted" />
    </div>
  );
}
