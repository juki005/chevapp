"use client";

// ── CommunityNews · community (Sprint 26x · DS-migrated) ──────────────────────
// News feed on the community page — admin-authored posts with an optional
// inline create form (admin-only). Loads up to 20 most recent.
//
// Sprint 26x changes:
//   - Comprehensive style={{ background: "rgb(var(--token))", ... }} →
//     Tailwind className tokens. This file used inline-CSS objects throughout
//     instead of Tailwind utilities (~25 separate style props), each one a
//     scattered rgb(var(--token)) call. Now pure className with semantic
//     aliases (bg-surface, bg-surface/X, bg-background, border-border,
//     text-foreground, text-muted, text-primary).
//   - 2× style={{fontFamily:"Oswald"}} on h3/h4 titles → font-display.
//   - "Dodaj novost" + "Objavi" CTAs: ad-hoc primary/border-style toggle →
//     standard primary CTA (bg-primary + text-primary-fg + hover:bg-vatra-
//     hover) with disabled-state opacity. Also rationalised: the inline
//     style.color "#fff" → text-primary-fg semantic.
//   - Trash button hover hover:bg-red-500/10 → hover:bg-zar-red/10
//     hover:text-zar-red (DS alert).
//   - Loading spinner: borderColor: "rgb(var(--primary))" inline →
//     border-primary border-t-transparent classes.
//   - rounded-2xl → rounded-card; rounded-xl → rounded-chip;
//     rounded-lg → rounded-chip.
//   - A11y: aria-label on the Trash delete button.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Newspaper, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsPost {
  id:         string;
  title:      string;
  content:    string;
  image_url:  string | null;
  created_at: string;
  author_id:  string | null;
}

// Shared input className — DRY across the 3 form fields
const fieldCls = "w-full px-4 py-3 rounded-chip text-sm outline-none bg-background border border-border text-foreground focus:border-primary/50 transition-colors";

export function CommunityNews() {
  const locale    = useLocale();
  const supabase  = createClient();
  const [posts,   setPosts]   = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // New post form
  const [showForm,   setShowForm]   = useState(false);
  const [formTitle,  setFormTitle]  = useState("");
  const [formBody,   setFormBody]   = useState("");
  const [formImage,  setFormImage]  = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load posts + check admin on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [postsRes, userRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("news_posts") as any)
          .select("id, title, content, image_url, created_at, author_id")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      setPosts((postsRes.data ?? []) as NewsPost[]);

      const user = userRes.data.user;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        if (!cancelled) {
          setIsAdmin((profile as { is_admin?: boolean } | null)?.is_admin ?? false);
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formBody.trim()) return;
    setSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    const authorId = userData.user?.id ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("news_posts") as any).insert({
      title:     formTitle.trim(),
      content:   formBody.trim(),
      image_url: formImage.trim() || null,
      author_id: authorId,
    }).select().single();

    if (!error && data) {
      setPosts((prev) => [data as NewsPost, ...prev]);
      setFormTitle(""); setFormBody(""); setFormImage("");
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("news_posts") as any).delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  const canSubmit = formTitle.trim() && formBody.trim();

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-base uppercase tracking-wide text-foreground">
            NOVOSTI
          </h3>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-chip text-xs font-semibold transition-all",
              showForm
                ? "bg-border text-muted"
                : "bg-primary text-primary-fg hover:bg-vatra-hover",
            )}
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Zatvori" : "Dodaj novost"}
          </button>
        )}
      </div>

      {/* Admin form */}
      {showForm && isAdmin && (
        <div className="rounded-card p-5 space-y-3 bg-surface/60 border border-primary/30">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Nova objava
          </p>

          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Naslov *"
            className={fieldCls}
          />

          <textarea
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            placeholder="Tekst objave *"
            rows={4}
            className={`${fieldCls} resize-none`}
          />

          <input
            type="url"
            value={formImage}
            onChange={(e) => setFormImage(e.target.value)}
            placeholder="URL slike (opcionalno)"
            className={fieldCls}
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-chip text-sm font-medium bg-border text-muted hover:text-foreground transition-colors"
            >
              Odustani
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={cn(
                "px-4 py-2 rounded-chip text-sm font-semibold flex items-center gap-1.5 transition-all",
                canSubmit
                  ? "bg-primary text-primary-fg hover:bg-vatra-hover cursor-pointer"
                  : "bg-border text-muted cursor-not-allowed",
              )}
            >
              {submitting ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : <Plus className="w-3.5 h-3.5" />}
              Objavi
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-card border border-dashed border-border py-10 text-center">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-20 text-muted" />
          <p className="text-sm text-muted">Nema novosti za sada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-card overflow-hidden transition-all hover:scale-[1.005] flex flex-col bg-surface/50 border border-border"
            >

              {/* Image */}
              {post.image_url && (
                <div className="w-full h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-display font-bold text-base leading-snug text-foreground">
                    {post.title}
                  </h4>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex-shrink-0 p-1.5 rounded-chip text-muted hover:text-zar-red hover:bg-zar-red/10 transition-colors"
                      title="Izbriši"
                      aria-label={`Izbriši ${post.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <Calendar className="w-3 h-3 text-muted" />
                  <span className="text-xs text-muted">
                    {formatDate(post.created_at)}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-foreground/85">
                  {post.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
