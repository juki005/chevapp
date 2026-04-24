"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReviewList (Sprint 26i · DS-migrated)
// Fetches and renders public reviews for a given place_id.
// Self-contained: handles loading / empty / error states internally.
//
// Sprint 26i changes:
//   - All arbitrary rgb(var(--token)) classes → semantic Tailwind aliases
//     (bg-surface/30, border-border/60, text-foreground, text-muted, bg-border).
//   - Star accent fill-amber-400 / text-amber-400 → fill-amber-xp /
//     text-amber-xp (matches ReviewModal + ReviewStatsBadge — review
//     aggregates are gamification-adjacent; amber-xp stays off buttons).
//   - rounded-xl → rounded-chip (DS shape scale).
//   - 🥩 🫓 sub-rating emojis tagged TODO(icons) + aria-hidden for Sprint 27.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Star, User as UserIcon } from "lucide-react";
import { getReviewsForPlace, type PlaceReviewWithAuthor } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

interface Props {
  placeId:    string;
  /** Bump this number to force a refetch (e.g. after submitting a new review). */
  refreshKey?: number;
}

export function ReviewList({ placeId, refreshKey = 0 }: Props) {
  const [reviews, setReviews] = useState<PlaceReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReviewsForPlace(placeId).then((data) => {
      if (cancelled) return;
      setReviews(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [placeId, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-chip border border-border/60 bg-surface/30 p-3 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-border" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-border rounded w-1/3" />
                <div className="h-2 bg-border rounded w-1/4" />
              </div>
            </div>
            <div className="h-3 bg-border rounded w-full mb-1.5" />
            <div className="h-3 bg-border rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-center text-sm text-muted py-6">
        Još nema recenzija. Budi prvi!
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {reviews.map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewItem
// ─────────────────────────────────────────────────────────────────────────────
function ReviewItem({ review }: { review: PlaceReviewWithAuthor }) {
  const avg = (review.rating_meat + review.rating_bread) / 2;
  const date = new Date(review.created_at).toLocaleDateString("hr-HR", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });

  return (
    <div className="rounded-chip border border-border/70 bg-surface/30 p-3.5">
      {/* Header: avatar + name + overall avg */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {review.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.author_avatar_url}
            alt={review.author_name ?? "Gost"}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-border/60 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {review.author_name ?? "Anonimni gost"}
          </p>
          <p className="text-[11px] text-muted">{date}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-3.5 h-3.5 fill-amber-xp text-amber-xp" />
          <span className="text-sm font-bold text-foreground">{avg.toFixed(1)}</span>
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="flex items-center gap-3 text-[11px] text-muted mb-2">
        <span className="inline-flex items-center gap-1">
          {/* TODO(icons): swap 🥩 for brand <Rostilj> */}
          <span aria-hidden="true">🥩</span> Meso{" "}
          <span className="font-semibold text-foreground">
            {review.rating_meat}/5
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          {/* TODO(icons): swap 🫓 for brand <Somun> */}
          <span aria-hidden="true">🫓</span> Somun{" "}
          <span className="font-semibold text-foreground">
            {review.rating_bread}/5
          </span>
        </span>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
          {review.comment}
        </p>
      )}

      {/* Photo */}
      {review.photo_url && (
        <div className="mt-2.5">
          <a
            href={review.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-chip overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={review.photo_url}
              alt="Fotografija recenzije"
              className={cn(
                "w-full max-h-64 object-cover transition-transform hover:scale-[1.02]",
              )}
              loading="lazy"
            />
          </a>
        </div>
      )}
    </div>
  );
}
