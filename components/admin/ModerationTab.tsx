"use client";

// ── ModerationTab · admin (Sprint 26q · DS-migrated) ──────────────────────────
// Admin queue for:
//   • Pending place submissions (is_approved = false)     → Approve / Reject
//   • Recent reviews across all places                    → Delete (abuse)
// Uses server actions from lib/actions/places.ts + lib/actions/reviews.ts.
//
// Sprint 26q changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Pending state amber-500 family → zar-red token family throughout
//     (admin-attention, consistent with StatsTab "Pending" card and the
//     RestaurantsTab unverified state — DS has no warning-amber slot).
//     · Counter pill bg-amber-500/20 + amber-400 → zar-red/20 + zar-red
//     · Pending card border-amber-500/25 + bg-amber-500/[0.03] →
//       border-zar-red/25 + bg-zar-red/5
//     · "Na čekanju" badge bg-amber-500/15 + amber-400 → zar-red token
//   - Approve button green-500 family → ember-green family.
//   - Reject + Delete-review destructive-hover red-500 family → zar-red family.
//   - Sub-tab active rgb(var(--primary)/0.12) → primary/10 (round to standard
//     Tailwind opacity scale; visual delta imperceptible).
//   - Pending-place title inline Oswald → font-display.
//   - Review stars text-amber-500 + fill/text-amber-400 → text-amber-xp +
//     fill-amber-xp / text-amber-xp (matches ReviewList Sprint 26i — review
//     aggregates are gamification-adjacent).
//   - 🎉 / 🥩 / 🫓 emoji tagged TODO(icons) + aria-hidden — Sprint 27.
//   - Toast keeps bg-foreground + text-background (intentional inverse-tone
//     surface, mode-aware via tokens).
//   - shadow-lg toast → shadow-soft-xl.
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle, Trash2, Loader2, MapPin, Globe, Phone, Shield,
  Star, MessageSquare, Image as ImageIcon, ShieldAlert,
} from "lucide-react";
import {
  getPendingPlaces, approvePlace, rejectPlace,
  type PendingPlace,
} from "@/lib/actions/places";
import {
  getRecentReviewsForAdmin, adminDeleteReview,
  type AdminReviewRow,
} from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

type SubTab = "places" | "reviews";

export function ModerationTab() {
  const [tab, setTab] = useState<SubTab>("places");

  const [places,        setPlaces]        = useState<PendingPlace[]>([]);
  const [reviews,       setReviews]       = useState<AdminReviewRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isPending,     startTransition]  = useTransition();
  const [toast,         setToast]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    if (tab === "places") {
      getPendingPlaces().then((d) => { setPlaces(d); setLoading(false); });
    } else {
      getRecentReviewsForAdmin(100).then((d) => { setReviews(d); setLoading(false); });
    }
  }, [tab]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApprove = (id: string, name: string) => {
    startTransition(async () => {
      const r = await approvePlace(id);
      if (r.success) {
        setPlaces((p) => p.filter((x) => x.id !== id));
        showToast(`"${name}" odobreno ✓`);
      } else {
        showToast(`Greška: ${r.error ?? "?"}`);
      }
    });
  };

  const handleReject = (id: string, name: string) => {
    if (!window.confirm(`Odbij i obriši prijedlog "${name}"?`)) return;
    startTransition(async () => {
      const r = await rejectPlace(id);
      if (r.success) {
        setPlaces((p) => p.filter((x) => x.id !== id));
        showToast(`"${name}" odbijeno`);
      } else {
        showToast(`Greška: ${r.error ?? "?"}`);
      }
    });
  };

  const handleDeleteReview = (id: string) => {
    if (!window.confirm("Obrisati ovu recenziju? Korisnik može napisati novu.")) return;
    startTransition(async () => {
      const r = await adminDeleteReview(id);
      if (r.success) {
        setReviews((rs) => rs.filter((x) => x.id !== id));
        showToast("Recenzija obrisana");
      } else {
        showToast(`Greška: ${r.error ?? "?"}`);
      }
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toast — inverse-tone surface (mode-aware via foreground/background) */}
      {toast && (
        <div role="status" className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-soft-xl">
          {toast}
        </div>
      )}

      {/* Sub-tab switch */}
      <div className="flex rounded-chip border border-border overflow-hidden text-sm font-medium w-fit">
        <SubTabBtn active={tab === "places"}  onClick={() => setTab("places")}  icon={<ShieldAlert className="w-3.5 h-3.5" />}   label="Nova mjesta" count={tab === "places" ? places.length : undefined} />
        <div className="w-px bg-border" />
        <SubTabBtn active={tab === "reviews"} onClick={() => setTab("reviews")} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Recenzije" />
      </div>

      {isPending && (
        <p className="text-xs text-muted flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Sprema…
        </p>
      )}

      {/* Body */}
      {loading ? (
        <div className="rounded-card border border-border p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : tab === "places" ? (
        <PlacesList places={places} onApprove={handleApprove} onReject={handleReject} />
      ) : (
        <ReviewsList reviews={reviews} onDelete={handleDeleteReview} />
      )}
    </div>
  );
}

// ── SubTabBtn ────────────────────────────────────────────────────────────────
function SubTabBtn({
  active, onClick, icon, label, count,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 flex items-center gap-1.5 transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-zar-red/20 text-zar-red font-bold">{count}</span>
      )}
    </button>
  );
}

// ── Pending places list ──────────────────────────────────────────────────────
function PlacesList({
  places, onApprove, onReject,
}: { places: PendingPlace[]; onApprove: (id: string, name: string) => void; onReject: (id: string, name: string) => void }) {
  if (places.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-10 text-center">
        <Shield className="w-8 h-8 text-muted mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">
          {/* TODO(icons): swap 🎉 for brand <Sparkle> */}
          <span aria-hidden="true">🎉</span> Nema prijedloga na čekanju
        </p>
        <p className="text-xs text-muted mt-1">Svi user submissions su obrađeni.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {places.map((p) => (
        <div key={p.id} className="rounded-card border border-zar-red/25 bg-zar-red/5 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-foreground">
                  {p.name}
                </h3>
                {p.style && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-border/60 text-muted">
                    {p.style}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zar-red/15 text-zar-red font-semibold">
                  Na čekanju
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{p.city} · {p.address}</span>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-muted">
                {p.phone && (
                  <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 hover:text-primary">
                    <Globe className="w-3 h-3" /> Web
                  </a>
                )}
                {p.submittedByName && (
                  <span className="inline-flex items-center gap-1">by {p.submittedByName}</span>
                )}
                <span className="ml-auto">
                  {new Date(p.createdAt).toLocaleDateString("hr-HR", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>

              {p.tags?.[0] && (
                <p className="text-xs text-foreground mt-2 leading-relaxed whitespace-pre-wrap bg-surface/50 border border-border rounded-chip p-2">
                  {p.tags[0]}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onApprove(p.id, p.name)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-chip text-xs font-semibold border border-ember-green/40 bg-ember-green/10 text-ember-green hover:bg-ember-green/15 transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Odobri
              </button>
              <button
                onClick={() => onReject(p.id, p.name)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-chip text-xs font-semibold border border-border text-muted hover:border-zar-red/40 hover:text-zar-red hover:bg-zar-red/5 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Odbij
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reviews list ─────────────────────────────────────────────────────────────
function ReviewsList({
  reviews, onDelete,
}: { reviews: AdminReviewRow[]; onDelete: (id: string) => void }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2" />
        <p className="text-sm text-muted">Još nema recenzija u sistemu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reviews.map((r) => {
        const avg = (r.rating_meat + r.rating_bread) / 2;
        return (
          <div key={r.id} className="rounded-card border border-border p-3.5 bg-surface/30">
            <div className="flex items-start gap-3">
              {r.author_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.author_avatar_url} alt={r.author_name ?? "Gost"} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-border flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {r.author_name ?? "Anonimni gost"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-xp">
                    <Star className="w-3 h-3 fill-amber-xp text-amber-xp" />
                    {avg.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted">
                    {/* TODO(icons): swap 🥩 / 🫓 for brand <Rostilj> / <Somun> */}
                    <span aria-hidden="true">🥩</span> {r.rating_meat}/5 · <span aria-hidden="true">🫓</span> {r.rating_bread}/5
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  {r.place_name ? <span className="text-foreground">{r.place_name}</span> : <span className="font-mono">{r.place_id.slice(0, 12)}…</span>}
                  {" · "}
                  {new Date(r.created_at).toLocaleDateString("hr-HR", { year: "numeric", month: "short", day: "numeric" })}
                </p>
                {r.comment && (
                  <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap">{r.comment}</p>
                )}
                {r.photo_url && (
                  <a href={r.photo_url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[11px] text-primary mt-1 hover:underline">
                    <ImageIcon className="w-3 h-3" /> Fotografija
                  </a>
                )}
              </div>

              <button
                onClick={() => onDelete(r.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-chip text-xs border border-border text-muted hover:border-zar-red/40 hover:text-zar-red hover:bg-zar-red/5 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Obriši</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
