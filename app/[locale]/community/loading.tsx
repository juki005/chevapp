// Community loading — skeleton for post feed
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-pulse">

      {/* Compose box */}
      <div className="h-24 rounded-2xl bg-muted" />

      {/* Posts */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-4 space-y-3">
          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-3 bg-muted rounded w-28" />
              <div className="h-2 bg-muted rounded w-16" />
            </div>
          </div>
          {/* Content */}
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <div className="h-6 w-14 rounded-full bg-muted" />
            <div className="h-6 w-14 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
