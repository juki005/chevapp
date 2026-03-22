"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Newspaper, Calendar, Trash2 } from "lucide-react";

interface NewsPost {
  id:         string;
  title:      string;
  content:    string;
  image_url:  string | null;
  created_at: string;
  author_id:  string | null;
}

export function CommunityNews() {
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
    new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4" style={{ color: "rgb(var(--primary))" }} />
          <h3 className="font-bold text-base uppercase tracking-wide"
            style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
            NOVOSTI
          </h3>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: showForm ? "rgb(var(--border))" : "rgb(var(--primary))",
              color: showForm ? "rgb(var(--muted))" : "#fff",
            }}
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Zatvori" : "Dodaj novost"}
          </button>
        )}
      </div>

      {/* Admin form */}
      {showForm && isAdmin && (
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: "rgb(var(--surface)/0.6)", border: "1px solid rgb(var(--primary)/0.3)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgb(var(--primary))" }}>
            Nova objava
          </p>

          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Naslov *"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "rgb(var(--background))",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--foreground))",
            }}
          />

          <textarea
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            placeholder="Tekst objave *"
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              background: "rgb(var(--background))",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--foreground))",
            }}
          />

          <input
            type="url"
            value={formImage}
            onChange={(e) => setFormImage(e.target.value)}
            placeholder="URL slike (opcionalno)"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "rgb(var(--background))",
              border: "1px solid rgb(var(--border))",
              color: "rgb(var(--foreground))",
            }}
          />

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
              Odustani
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formTitle.trim() || !formBody.trim() || submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
              style={{
                background: formTitle.trim() && formBody.trim() ? "rgb(var(--primary))" : "rgb(var(--border))",
                color: formTitle.trim() && formBody.trim() ? "#fff" : "rgb(var(--muted))",
                cursor: formTitle.trim() && formBody.trim() ? "pointer" : "not-allowed",
              }}
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
          <span className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "rgb(var(--primary))", borderTopColor: "transparent" }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-10 text-center"
          style={{ borderColor: "rgb(var(--border))" }}>
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "rgb(var(--muted))" }} />
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>Nema novosti za sada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div key={post.id}
              className="rounded-2xl overflow-hidden transition-all hover:scale-[1.005] flex flex-col"
              style={{ background: "rgb(var(--surface)/0.5)", border: "1px solid rgb(var(--border))" }}>

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
                  <h4 className="font-bold text-base leading-snug"
                    style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}>
                    {post.title}
                  </h4>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: "rgb(var(--muted))" }}
                      title="Izbriši"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <Calendar className="w-3 h-3" style={{ color: "rgb(var(--muted))" }} />
                  <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {formatDate(post.created_at)}
                  </span>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--foreground)/0.85)" }}>
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
