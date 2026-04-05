import { cn } from "@/lib/utils";

interface LepinjaRatingProps {
  rating: number; // 0–5, supports decimals
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

export function LepinjaRating({
  rating,
  size = "md",
  showNumber = true,
  className,
}: LepinjaRatingProps) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  const clampedRating = Math.max(0, Math.min(5, rating ?? 0));
  const full = Math.floor(clampedRating);
  const hasHalf = clampedRating - full >= 0.25 && clampedRating - full < 0.75;
  const almostFull = clampedRating - full >= 0.75;
  const actualFull = almostFull ? full + 1 : full;
  const empty = 5 - actualFull - (hasHalf ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn("flex items-center gap-0.5", sizes[size])}>
        {Array.from({ length: actualFull }).map((_, i) => (
          <span key={`full-${i}`} className="opacity-100">🥯</span>
        ))}
        {hasHalf && (
          <span className="opacity-60">🥯</span>
        )}
        {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
          <span key={`empty-${i}`} className="opacity-20 grayscale">🥯</span>
        ))}
      </div>
      {showNumber && (
        <span className={cn(
          "font-bold text-burnt-orange-400 tabular-nums",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )} style={{ fontFamily: "Oswald, sans-serif" }}>
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
