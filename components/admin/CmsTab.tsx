"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Newspaper, Calendar, Plus, Trash2, Eye, EyeOff, Loader2,
} from "lucide-react";
import {
  getAdminNewsPosts, createNewsPost, deleteNewsPost,
  getAdminEvents, createEvent, toggleEventActive, deleteEvent,
  type AdminNewsPost, type AdminEvent,
} from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "short", year: "numeric" });
}

// ── News Section ──────────────────────────────────────────────────────────────
function NewsSection() {
  const [posts,    setPosts]    = useState<AdminNewsPost[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getAdminNewsPosts().then((d) => { setPosts(d); setLoading(false); });
  }, []);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    startTransition(async () => {
      const ok = await createNewsPost(title, content, imageUrl || undefined);
      if (ok) {
        setPosts((prev) => [{ id: crypto.randomUUID(), title, content, imageUrl: imageUrl || null, createdAt: new Date().toISOString() }, ...prev]);
        setTitle(""); setContent(""); setImageUrl(""); setShowForm(false);
      }
    });
  };

  const handleDelete = (id: string, t: string) => {
    if (!window.confirm(`Obriši "${t}"?`)) return;
    startTransition(async () => {
      const ok = await deleteNewsPost(id);
      if (ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[rgb(var(--primary))]" />
          <h3 className="font-bold text-base uppercase tracking-wide text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
            Novosti ({posts.length})
          </h3>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
            showForm ? "bg-[rgb(var(--border))] text-[rgb(var(--muted))]" : "bg-[rgb(var(--primary))] text-white")}
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? "Odustani" : "Nova objava"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.04)] p-4 space-y-3">
          <input
            type="text" placeholder="Naslov *" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
          />
          <textarea
            placeholder="Tekst objave *" value={content} onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none"
          />
          <input
            type="url" placeholder="URL slike (opcionalno)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
          />
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !content.trim() || isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Objavi
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[rgb(var(--border))] p-4 animate-pulse">
              <div className="h-3 bg-[rgb(var(--border)/0.5)] rounded w-40 mb-2" />
              <div className="h-2.5 bg-[rgb(var(--border)/0.4)] rounded w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center text-sm text-[rgb(var(--muted))]">
          Nema novosti. Dodaj prvu objavu!
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[rgb(var(--foreground))] truncate">{p.title}</div>
                <div className="text-xs text-[rgb(var(--muted))] mt-0.5 mb-1">{fmtDate(p.createdAt)}</div>
                <p className="text-xs text-[rgb(var(--foreground)/0.7)] line-clamp-2">{p.content}</p>
              </div>
              <button
                onClick={() => handleDelete(p.id, p.title)}
                disabled={isPending}
                className="flex-shrink-0 p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Events Section ────────────────────────────────────────────────────────────
const TAG_COLORS = [
  { label: "Crvena (Festival)", value: "text-red-400 bg-red-400/10 border-red-400/30" },
  { label: "Narančasta (Gastro)", value: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  { label: "Plava (Meetup)", value: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  { label: "Zelena (Natjecanje)", value: "text-green-400 bg-green-400/10 border-green-400/30" },
  { label: "Ljubičasta (Ostalo)", value: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
];

function EventsSection() {
  const [events,   setEvents]   = useState<AdminEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [fTitle,    setFTitle]    = useState("");
  const [fDate,     setFDate]     = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fEmoji,    setFEmoji]    = useState("🔥");
  const [fDesc,     setFDesc]     = useState("");
  const [fTag,      setFTag]      = useState("Festival");
  const [fTagColor, setFTagColor] = useState(TAG_COLORS[0].value);

  useEffect(() => {
    getAdminEvents().then((d) => { setEvents(d); setLoading(false); });
  }, []);

  const handleCreate = () => {
    if (!fTitle.trim() || !fDate.trim() || !fLocation.trim()) return;
    startTransition(async () => {
      const ok = await createEvent({
        title: fTitle, dateLabel: fDate, location: fLocation,
        emoji: fEmoji, description: fDesc, tag: fTag,
        tagColor: fTagColor, sortOrder: events.length,
      });
      if (ok) {
        const newEvent: AdminEvent = {
          id: crypto.randomUUID(), title: fTitle, dateLabel: fDate,
          location: fLocation, emoji: fEmoji, description: fDesc,
          tag: fTag, tagColor: fTagColor, isActive: true, sortOrder: events.length,
        };
        setEvents((prev) => [...prev, newEvent]);
        setFTitle(""); setFDate(""); setFLocation(""); setFEmoji("🔥"); setFDesc(""); setFTag("Festival");
        setShowForm(false);
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const ok = await toggleEventActive(id, !isActive);
      if (ok) setEvents((prev) => prev.map((e) => e.id === id ? { ...e, isActive: !isActive } : e));
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Obriši "${title}"?`)) return;
    startTransition(async () => {
      const ok = await deleteEvent(id);
      if (ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[rgb(var(--primary))]" />
          <h3 className="font-bold text-base uppercase tracking-wide text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
            Događaji ({events.length})
          </h3>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
            showForm ? "bg-[rgb(var(--border))] text-[rgb(var(--muted))]" : "bg-[rgb(var(--primary))] text-white")}
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? "Odustani" : "Novi događaj"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.04)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Naslov *" value={fTitle} onChange={(e) => setFTitle(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors" />
            <div className="flex gap-2">
              <input type="text" placeholder="Emoji" value={fEmoji} onChange={(e) => setFEmoji(e.target.value)} maxLength={4}
                className="w-20 px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-lg text-center outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors" />
              <input type="text" placeholder="Datum (npr. 15. kolovoza 2025.) *" value={fDate} onChange={(e) => setFDate(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Lokacija *" value={fLocation} onChange={(e) => setFLocation(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors" />
            <div className="flex gap-2">
              <input type="text" placeholder="Tag (npr. Festival)" value={fTag} onChange={(e) => setFTag(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors" />
              <select value={fTagColor} onChange={(e) => setFTagColor(e.target.value)}
                className="px-2 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-xs outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors">
                {TAG_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <textarea placeholder="Opis" value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none" />
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!fTitle.trim() || !fDate.trim() || !fLocation.trim() || isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Dodaj događaj
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[rgb(var(--border))] p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center text-sm text-[rgb(var(--muted))]">
          Nema događaja. Dodaj prvi!
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id}
              className={cn("flex items-center gap-3 rounded-xl border p-4 transition-colors",
                ev.isActive ? "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)]" : "border-[rgb(var(--border)/0.4)] bg-[rgb(var(--surface)/0.2)] opacity-60")}
            >
              <span className="text-2xl flex-shrink-0">{ev.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[rgb(var(--foreground))] truncate">{ev.title}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold", ev.tagColor)}>{ev.tag}</span>
                  {!ev.isActive && <span className="text-[10px] text-[rgb(var(--muted))]">(neaktivan)</span>}
                </div>
                <div className="text-xs text-[rgb(var(--muted))] mt-0.5">{ev.dateLabel} · {ev.location}</div>
              </div>
              <button
                onClick={() => handleToggle(ev.id, ev.isActive)}
                disabled={isPending}
                title={ev.isActive ? "Deaktiviraj" : "Aktiviraj"}
                className="flex-shrink-0 p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
              >
                {ev.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(ev.id, ev.title)}
                disabled={isPending}
                className="flex-shrink-0 p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Combined CMS Tab ──────────────────────────────────────────────────────────
export function CmsTab() {
  return (
    <div className="space-y-8">
      <NewsSection />
      <div className="border-t border-[rgb(var(--border))]" />
      <EventsSection />
    </div>
  );
}
