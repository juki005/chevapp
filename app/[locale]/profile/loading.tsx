// Profile loading — skeleton matching the avatar + stats + tabs layout
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-muted flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-muted rounded w-36" />
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>

      {/* XP bar */}
      <div className="space-y-1">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-2 bg-muted rounded w-1/2" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-1">
            <div className="h-6 bg-muted rounded w-10 mx-auto" />
            <div className="h-3 bg-muted rounded w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded bg-muted" />
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
