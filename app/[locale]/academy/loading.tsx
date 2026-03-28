// Academy loading — skeleton for the game card grid
export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-pulse">

      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-72" />
      </div>

      {/* XP banner */}
      <div className="h-20 rounded-2xl bg-muted" />

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border p-6 space-y-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-9 bg-muted rounded-xl w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
