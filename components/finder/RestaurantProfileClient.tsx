"use client";

import { useState } from "react";
import {
  MapPin, Star, CheckCircle, MessageSquarePlus,
  BedDouble, ChevronLeft, ChevronRight, Globe, Phone,
  Clock, ChevronDown, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { LepinjaRating } from "@/components/ui/LepinjaRating";
import { DirectionsButton } from "@/components/finder/DirectionsButton";
import { AccommodationModal } from "@/components/finder/AccommodationModal";
import { cn } from "@/lib/utils";
import type { Restaurant, RestaurantReview } from "@/types";
import type { GooglePlacesData } from "@/lib/googlePlaces";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STYLE_EMOJIS: Record<string, string> = {
  Sarajevski:   "🕌",
  "Banjalučki": "🌊",
  "Travnički":  "⛰️",
  "Leskovački": "🌶️",
  Ostalo:       "🔥",
};

function StarRow({ value, max = 5, size = "sm" }: { value: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sz,
            i < Math.round(value)
              ? "text-burnt-orange-400 fill-burnt-orange-400"
              : "text-charcoal-600 dark:text-ugljen-border"
          )}
        />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Danas";
  if (days === 1) return "1 dan";
  if (days < 30)  return `${days} dana`;
  const m = Math.floor(days / 30);
  return m === 1 ? "1 mjesec" : `${m} mjeseca`;
}

// ── Photo Carousel ────────────────────────────────────────────────────────────

function PhotoCarousel({ photoRefs }: { photoRefs: string[] }) {
  const [idx, setIdx] = useState(0);

  if (photoRefs.length === 0) return null;

  const prev = () => setIdx((i) => (i - 1 + photoRefs.length) % photoRefs.length);
  const next = () => setIdx((i) => (i + 1) % photoRefs.length);

  return (
    <div className="relative w-full aspect-[16/7] rounded-2xl overflow-hidden bg-charcoal-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photoRefs[idx]}
        src={`/api/place-photo?ref=${encodeURIComponent(photoRefs[idx])}&maxwidth=1200`}
        alt="Fotografija restorana"
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Nav arrows — only if more than 1 photo */}
      {photoRefs.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photoRefs.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === idx ? "bg-white scale-125" : "bg-white/40"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Google attribution */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1 opacity-60">
        <span className="text-[10px] text-white">Foto:</span>
        <span className="text-[10px] text-white font-medium">Google Maps</span>
      </div>
    </div>
  );
}

// ── Opening Hours (collapsible) ───────────────────────────────────────────────

function OpeningHours({ weekdayText, openNow }: { weekdayText: string[]; openNow: boolean | null }) {
  const [expanded, setExpanded] = useState(false);

  const today = new Date().getDay(); // 0 = Sunday
  // Google weekday_text starts Monday (index 0 = Monday ... 6 = Sunday)
  const todayGoogleIdx = today === 0 ? 6 : today - 1;

  return (
    <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-charcoal-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-burnt-orange-400" />
          <span className="text-sm font-semibold text-cream">Radno vrijeme</span>
          {openNow !== null && (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                openNow
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-red-500/40 bg-red-500/10 text-red-400"
              )}
            >
              {openNow ? "● Otvoreno" : "● Zatvoreno"}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-cream/40 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && weekdayText.length > 0 && (
        <div className="px-5 pb-4 space-y-1 border-t border-charcoal-700/60 dark:border-ugljen-border/60 pt-3">
          {weekdayText.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex items-baseline justify-between text-sm py-0.5",
                i === todayGoogleIdx ? "text-cream font-semibold" : "text-cream/50"
              )}
            >
              <span>{line.split(":")[0]}</span>
              <span>{line.split(":").slice(1).join(":").trim()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Google Ratings Badge ──────────────────────────────────────────────────────

function GoogleRatingBadge({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 flex-shrink-0">
        {/* Google "G" logo via inline SVG */}
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </div>
      <span className="text-lg font-bold text-cream" style={{ fontFamily: "Oswald, sans-serif" }}>
        {rating.toFixed(1)}
      </span>
      <StarRow value={rating} />
      <span className="text-xs text-cream/40">Google</span>
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: RestaurantReview }) {
  const initial = review.user_name[0]?.toUpperCase() ?? "G";
  return (
    <div className="rounded-xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/20 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-burnt-orange-500/20 border border-burnt-orange-500/30 flex items-center justify-center text-sm font-bold text-burnt-orange-400 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-cream text-sm">{review.user_name}</span>
            {review.reviewer_tag && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-burnt-orange-500/10 border border-burnt-orange-500/20 text-burnt-orange-400">
                {review.reviewer_tag}
              </span>
            )}
            <span className="text-xs text-cream/30 ml-auto">{timeAgo(review.created_at)}</span>
          </div>
          <StarRow value={review.rating} />
          <p className="text-cream/70 text-sm leading-relaxed mt-2">{review.review_text}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  restaurant:  Restaurant;
  reviews:     RestaurantReview[];
  googleData:  GooglePlacesData | null;
}

export function RestaurantProfileClient({ restaurant, reviews, googleData }: Props) {
  const locale = useLocale();
  const [accommodationOpen, setAccommodationOpen] = useState(false);

  const emoji       = STYLE_EMOJIS[restaurant.style] ?? "🔥";
  const ourRating   = restaurant.rating ?? 0;
  const reviewCount = restaurant.review_count ?? reviews.length;

  return (
    <div className="min-h-screen bg-charcoal-950 dark:bg-ugljen-bg text-cream">
      {/* Sticky back nav */}
      <div className="border-b border-charcoal-700/60 dark:border-ugljen-border/60 bg-charcoal-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <Link
            href={`/${locale}/finder`}
            className="inline-flex items-center gap-1.5 text-sm text-cream/50 hover:text-cream transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Natrag na pretragu
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Google Photos carousel ───────────────────────────────────────── */}
        {googleData && googleData.photoRefs.length > 0 && (
          <PhotoCarousel photoRefs={googleData.photoRefs} />
        )}

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-800 flex items-center justify-center text-4xl flex-shrink-0">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1
                  className="text-3xl font-bold text-cream leading-tight"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {restaurant.name}
                </h1>
                {restaurant.is_verified && (
                  <CheckCircle className="w-5 h-5 text-burnt-orange-400 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-1.5 text-cream/50 text-sm mb-3">
                <MapPin className="w-3.5 h-3.5" />
                <span>{restaurant.city} · {restaurant.address}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full border border-burnt-orange-500/40 bg-burnt-orange-500/10 text-burnt-orange-400 font-medium">
                  {restaurant.style}
                </span>
                {/* Live open status from Google (trumps hardcoded) */}
                {googleData?.openNow !== null && googleData?.openNow !== undefined ? (
                  <span className={cn(
                    "text-xs px-2.5 py-1 rounded-full border font-medium",
                    googleData.openNow
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : "border-red-500/40 bg-red-500/10 text-red-400"
                  )}>
                    {googleData.openNow ? "● Otvoreno" : "● Zatvoreno"}
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full border border-charcoal-600 text-cream/30">
                    Status nepoznat
                  </span>
                )}
                {(restaurant.tags_style ?? []).map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-charcoal-700/60 text-cream/50">{t}</span>
                ))}
                {(restaurant.tags_meat ?? []).map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-charcoal-700/40 text-cream/40">🥩 {t}</span>
                ))}
                {restaurant.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-charcoal-700/40 text-cream/40">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Ratings row ──────────────────────────────────────────────────── */}
        <div className={cn("grid gap-4", googleData?.rating ? "grid-cols-3" : "grid-cols-2")}>
          {/* ChevApp rating */}
          <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 p-5 flex flex-col items-center justify-center gap-1.5">
            <span className="text-xs text-cream/40 uppercase tracking-widest font-medium">ChevApp</span>
            <span className="text-4xl font-bold text-burnt-orange-400" style={{ fontFamily: "Oswald, sans-serif" }}>
              {ourRating > 0 ? ourRating.toFixed(1) : "—"}
            </span>
            <StarRow value={ourRating} />
            <span className="text-xs text-cream/40">
              {reviewCount > 0
                ? `${reviewCount} ${reviewCount === 1 ? "recenzija" : reviewCount < 5 ? "recenzije" : "recenzija"}`
                : "Nema recenzija"}
            </span>
          </div>

          {/* Google rating */}
          {googleData?.rating && (
            <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 p-5 flex flex-col items-center justify-center gap-1.5">
              <span className="text-xs text-cream/40 uppercase tracking-widest font-medium">Google</span>
              <span className="text-4xl font-bold text-[#4285F4]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {googleData.rating.toFixed(1)}
              </span>
              <StarRow value={googleData.rating} />
              <span className="text-xs text-cream/40">Recenzije s Google Maps</span>
            </div>
          )}

          {/* Lepinja score */}
          <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 p-5 flex flex-col items-center justify-center gap-1.5">
            <span className="text-xs text-cream/40 uppercase tracking-widest font-medium">Lepinja</span>
            <LepinjaRating rating={restaurant.lepinja_rating} size="lg" />
            <span className="text-xs text-cream/40">{restaurant.lepinja_rating}/10</span>
          </div>
        </div>

        {/* ── Opening hours (Google) ────────────────────────────────────────── */}
        {googleData && (googleData.weekdayText.length > 0 || googleData.openNow !== null) && (
          <OpeningHours weekdayText={googleData.weekdayText} openNow={googleData.openNow} />
        )}

        {/* ── Description ──────────────────────────────────────────────────── */}
        {restaurant.description && (
          <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 p-6">
            <h2 className="text-xs text-cream/40 uppercase tracking-widest font-medium mb-3">O restoranu</h2>
            <p className="text-cream/75 text-sm leading-relaxed">{restaurant.description}</p>
          </div>
        )}

        {/* ── Contact ──────────────────────────────────────────────────────── */}
        {(restaurant.phone || restaurant.website) && (
          <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-900/60 px-6 py-4 flex flex-wrap gap-4">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 text-sm text-cream/60 hover:text-burnt-orange-400 transition-colors">
                <Phone className="w-4 h-4" /> {restaurant.phone}
              </a>
            )}
            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-cream/60 hover:text-burnt-orange-400 transition-colors">
                <Globe className="w-4 h-4" /> Web stranica
              </a>
            )}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <DirectionsButton
            name={restaurant.name}
            address={restaurant.address}
            city={restaurant.city}
            lat={restaurant.latitude}
            lng={restaurant.longitude}
            phone={restaurant.phone}
            className="w-full justify-center"
          />

          <Link
            href={`/${locale}/finder/restaurant/${restaurant.slug ?? restaurant.id}/review`}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl",
              "border border-charcoal-700 dark:border-ugljen-border",
              "bg-charcoal-800/50 hover:border-burnt-orange-500/40 hover:bg-burnt-orange-500/05",
              "text-cream/70 hover:text-cream transition-all text-center"
            )}
          >
            <MessageSquarePlus className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif" }}>
              Ocijeni
            </span>
          </Link>

          <button
            onClick={() => setAccommodationOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl",
              "border border-charcoal-700 dark:border-ugljen-border",
              "bg-charcoal-800/50 hover:border-burnt-orange-500/40 hover:bg-burnt-orange-500/05",
              "text-cream/70 hover:text-cream transition-all"
            )}
          >
            <BedDouble className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif" }}>
              Smještaj
            </span>
          </button>
        </div>

        {/* ── Reviews ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-cream" style={{ fontFamily: "Oswald, sans-serif" }}>
              RECENZIJE
            </h2>
            <span className="text-xs text-cream/40">{reviews.length} prikazano</span>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-charcoal-700 p-8 text-center">
              <p className="text-cream/40 text-sm">Još nema recenzija.</p>
              <p className="text-cream/25 text-xs mt-1">Budi prvi koji dijeli iskustvo!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </div>

        {/* ── Accommodation CTA (prominent bottom section) ─────────────────── */}
        <div className="rounded-2xl border border-burnt-orange-500/20 bg-burnt-orange-500/05 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-burnt-orange-500/15 flex items-center justify-center flex-shrink-0">
              <BedDouble className="w-6 h-6 text-burnt-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-cream mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                PLANIRAŠ POSJET?
              </h3>
              <p className="text-cream/50 text-sm mb-4">
                Pronađi smještaj u <span className="text-burnt-orange-400">{restaurant.city}</span> i pretvori ručak u pravi gastro-odmor.
              </p>
              <button
                onClick={() => setAccommodationOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-burnt-orange-500 hover:bg-burnt-orange-600 text-white text-sm font-bold transition-all active:scale-[0.98]"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                <ExternalLink className="w-4 h-4" />
                PRETRAŽI SMJEŠTAJ
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Accommodation Modal */}
      <AccommodationModal
        isOpen={accommodationOpen}
        onClose={() => setAccommodationOpen(false)}
        restaurantName={restaurant.name}
        city={restaurant.city}
      />
    </div>
  );
}
