"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getRank } from "@/lib/gamification";
import { Users, Rss, Lightbulb, Calendar, Trophy, Plus, X, MapPin, Bell, Heart, MessageCircle, Share2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type CommunityTab = "feed" | "tips" | "events";

const MOCK_POSTS = [
  {
    id: "1",
    user: { name: "MarkoM", avatar: "🧑‍🍳", xp: 2400 },
    content: "Upravo bio u Željу 1 — redovi kao obično, ali vrijedi svakih 45 minuta čekanja. Meso danas posebno sočno! 🔥",
    restaurant: "Željo 1, Sarajevo",
    likes: 47,
    liked: false,
    time: "2h",
    isInsider: false,
  },
  {
    id: "2",
    user: { name: "SaraK", avatar: "👩‍🍳", xp: 1850 },
    content: "BISER IZ MAHALE 💎 — Mali kiosk kod stare pivare u Travniku, nema natpisa. Pitajte Hasana za ćevape od domaće janjetine. Jedinstven okus!",
    restaurant: null,
    likes: 123,
    liked: false,
    time: "5h",
    isInsider: true,
  },
  {
    id: "3",
    user: { name: "Grill_Luka", avatar: "🧑‍🔧", xp: 4100 },
    content: "Leskovački grill festival za 2 tjedna! Ko ide, javite se da organiziramo grupu. Prošle godine nismo žalili.",
    restaurant: "Leskovac",
    likes: 89,
    liked: false,
    time: "1d",
    isInsider: false,
  },
];

const GASTRO_TIPS = [
  {
    id: "t1",
    city: "Sarajevo",
    emoji: "🕌",
    tip: "Kod Žarkovića u Baščaršiji — naruči bez luka, ali zatraži dvostruki kajmak. Ne piše na meniju.",
    author: "SaraK",
    votes: 88,
  },
  {
    id: "t2",
    city: "Banja Luka",
    emoji: "🏔️",
    tip: "Kod Muje ima poseban sto za stalne goste — uvijek slobodan oko 11:30 prije ručka navale.",
    author: "ZoranB",
    votes: 64,
  },
  {
    id: "t3",
    city: "Mostar",
    emoji: "🌉",
    tip: "Ćevabdžinica ispod Starog mosta — sjedi na terasi, naruči domaći sok od šipka uz porciju.",
    author: "TinaV",
    votes: 42,
  },
  {
    id: "t4",
    city: "Zagreb",
    emoji: "🏙️",
    tip: "Kantun Paulina — dođi u 11:00 kad otvaraju. Sve porcije svježe, nema stajanja. Do 13h rasprodano.",
    author: "Grill_Luka",
    votes: 37,
  },
  {
    id: "t5",
    city: "Beograd",
    emoji: "🌆",
    tip: "Skadarlija — ne idi u restoran s najviše turista. Traži onaj s pikado tablom unutra.",
    author: "MarkoM",
    votes: 55,
  },
  {
    id: "t6",
    city: "Travnik",
    emoji: "🏰",
    tip: "Mali kiosk kod stare pivare, nema natpisa. Pitajte Hasana — jedinstven okus domaće janjetine.",
    author: "SaraK",
    votes: 123,
  },
];

const EVENTS = [
  {
    id: "e1",
    title: "Leskovački Grill Festival 2025",
    date: "15. – 18. kolovoza 2025.",
    location: "Leskovac, Srbija",
    emoji: "🔥",
    desc: "Najveći balkanski festival grilanja s više od 50 natjecatelja. Ćevapi, roštilj, glazba i folklore.",
    tag: "Festival",
    tagColor: "text-red-400 bg-red-400/10 border-red-400/30",
    notified: false,
  },
  {
    id: "e2",
    title: "Sarajevo Gastro Dana",
    date: "22. – 24. rujna 2025.",
    location: "Baščaršija, Sarajevo",
    emoji: "🕌",
    desc: "Proljetni gastro događaj u srcu Baščaršije. Radionice kuhanja, degustacije kajmaka i somuna.",
    tag: "Gastro",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    notified: false,
  },
  {
    id: "e3",
    title: "ChevApp Zajednica: Roštilj Meetup",
    date: "12. srpnja 2025.",
    location: "Split, Hrvatska",
    emoji: "🌊",
    desc: "Neformalni meetup zajednice — grilanje uz more. Svaki donosi po nešto. Kapacitet 40 osoba.",
    tag: "Meetup",
    tagColor: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    notified: false,
  },
];

// Raw row shape returned by Supabase — explicit so TypeScript doesn't infer `never`
interface Profile {
  id:         string;
  username:   string | null;
  full_name:  string | null;
  avatar_url: string | null;
  xp_points:  number | null;
}

// Transformed display shape stored in component state
interface LeaderboardEntry {
  rank:    number;
  name:    string;
  initial: string;
  xp:      number;
  badge:   string;
}

const ALL_CITIES = ["Sve", ...Array.from(new Set(GASTRO_TIPS.map((t) => t.city)))];

export default function CommunityPage() {
  const t = useTranslations("community");
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");

  // Leaderboard
  const [leaderboard,        setLeaderboard]        = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, username, full_name, xp_points")
      .order("xp_points", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const profiles = (data ?? []) as Profile[];
        if (profiles.length > 0) {
          setLeaderboard(
            profiles.map((p, i) => {
              const name    = p.username ?? p.full_name ?? "Korisnik";
              const rank    = getRank(p.xp_points ?? 0);
              return {
                rank:    i + 1,
                name,
                initial: name[0]?.toUpperCase() ?? "K",
                xp:      p.xp_points ?? 0,
                badge:   `${rank.emoji} ${rank.title}`,
              };
            })
          );
        }
        setLeaderboardLoading(false);
      });
  }, []);

  const [likes, setLikes] = useState<Record<string, number>>(
    Object.fromEntries(MOCK_POSTS.map((p) => [p.id, p.likes]))
  );
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [tipVotes, setTipVotes] = useState<Record<string, number>>(
    Object.fromEntries(GASTRO_TIPS.map((t) => [t.id, t.votes]))
  );
  const [votedTips, setVotedTips] = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState("Sve");
  const [notifiedEvents, setNotifiedEvents] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS[0] | null>(null);
  const [newPostText, setNewPostText] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        setLikes((l) => ({ ...l, [postId]: (l[postId] ?? 0) - 1 }));
      } else {
        next.add(postId);
        setLikes((l) => ({ ...l, [postId]: (l[postId] ?? 0) + 1 }));
      }
      return next;
    });
  };

  const toggleTipVote = (tipId: string) => {
    setVotedTips((prev) => {
      const next = new Set(prev);
      if (next.has(tipId)) {
        next.delete(tipId);
        setTipVotes((v) => ({ ...v, [tipId]: (v[tipId] ?? 0) - 1 }));
      } else {
        next.add(tipId);
        setTipVotes((v) => ({ ...v, [tipId]: (v[tipId] ?? 0) + 1 }));
      }
      return next;
    });
  };

  const toggleNotify = (eventId: string) => {
    setNotifiedEvents((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  };

  const filteredTips = cityFilter === "Sve"
    ? GASTRO_TIPS
    : GASTRO_TIPS.filter((tip) => tip.city === cityFilter);

  const tabs: { key: CommunityTab; icon: React.ReactNode; label: string }[] = [
    { key: "feed", icon: <Rss className="w-4 h-4" />, label: t("feed") },
    { key: "tips", icon: <Lightbulb className="w-4 h-4" />, label: t("insiderTips") },
    { key: "events", icon: <Calendar className="w-4 h-4" />, label: t("events") },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <Users className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {t("title")}
              </h1>
              <p className="text-[rgb(var(--muted))] text-sm mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2">
          {/* Tab bar */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  activeTab === key
                    ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* =================== FEED TAB =================== */}
          {activeTab === "feed" && (
            <div>
              {/* New post form */}
              {showPostForm ? (
                <div className="rounded-2xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface)/0.5)] p-4 mb-6">
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Podijeli svoje gastro iskustvo..."
                    rows={3}
                    className="w-full bg-transparent text-sm text-[rgb(var(--foreground))] placeholder-[rgb(var(--muted))] resize-none outline-none mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--muted))]">{newPostText.length}/280</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowPostForm(false); setNewPostText(""); }}
                        className="px-3 py-1.5 rounded-lg text-xs border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
                      >
                        Odustani
                      </button>
                      <button
                        onClick={() => { setShowPostForm(false); setNewPostText(""); }}
                        disabled={newPostText.trim().length === 0}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[rgb(var(--primary))] text-white font-medium hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-40"
                      >
                        Objavi
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPostForm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.3)] transition-colors mb-6 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("newPost")} — dijeli svoja iskustva...
                </button>
              )}

              {/* Posts */}
              <div className="space-y-4">
                {MOCK_POSTS.map((post) => (
                  <div
                    key={post.id}
                    className={cn(
                      "rounded-2xl border p-5 transition-colors",
                      post.isInsider
                        ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.04)]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]"
                    )}
                  >
                    {post.isInsider && (
                      <div className="flex items-center gap-2 text-[rgb(var(--primary))] text-xs font-semibold mb-3">
                        <Lightbulb className="w-3.5 h-3.5" />
                        {t("hiddenGem")} 💎
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[rgb(var(--border)/0.5)] flex items-center justify-center text-xl flex-shrink-0">
                        {post.user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[rgb(var(--foreground))] text-sm">{post.user.name}</span>
                          <span className="text-xs text-[rgb(var(--primary))] font-medium">{post.user.xp} XP</span>
                          <span className="text-xs text-[rgb(var(--muted))] ml-auto">{post.time}</span>
                        </div>
                        {post.restaurant && (
                          <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] mb-2">
                            <MapPin className="w-3 h-3" />
                            {post.restaurant}
                          </div>
                        )}
                        <p className="text-[rgb(var(--foreground)/0.8)] text-sm leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={cn(
                              "flex items-center gap-1 text-xs transition-colors",
                              likedPosts.has(post.id) ? "text-red-400" : "text-[rgb(var(--muted))] hover:text-red-400"
                            )}
                          >
                            <Heart className={cn("w-3.5 h-3.5", likedPosts.has(post.id) && "fill-current")} />
                            {likes[post.id]}
                          </button>
                          <button className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t("comment")}
                          </button>
                          <button className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                            {t("share")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================== TIPS TAB (Drawer-style) =================== */}
          {activeTab === "tips" && (
            <div>
              {/* City filter */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
                <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mr-1">Grad:</span>
                {ALL_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setCityFilter(city)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      cityFilter === city
                        ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                        : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>

              <p className="text-xs text-[rgb(var(--muted))] mb-4">
                {filteredTips.length} insider dojava {cityFilter !== "Sve" ? `za ${cityFilter}` : ""}
              </p>

              <div className="space-y-3">
                {filteredTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-[rgb(var(--primary))]">{tip.city}</span>
                          <span className="text-xs text-[rgb(var(--muted))]">· {tip.author}</span>
                        </div>
                        <p className="text-sm text-[rgb(var(--foreground)/0.85)] leading-relaxed">{tip.tip}</p>
                        <button
                          onClick={() => toggleTipVote(tip.id)}
                          className={cn(
                            "mt-2.5 flex items-center gap-1 text-xs transition-colors px-2.5 py-1 rounded-full border",
                            votedTips.has(tip.id)
                              ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                              : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                          )}
                        >
                          🔥 {tipVotes[tip.id]} korisno
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTips.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[rgb(var(--muted))] text-sm">Nema dojava za ovaj grad.</p>
                </div>
              )}
            </div>
          )}

          {/* =================== EVENTS TAB =================== */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {EVENTS.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl flex-shrink-0">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-[rgb(var(--foreground))] text-base leading-snug" style={{ fontFamily: "Oswald, sans-serif" }}>
                          {event.title}
                        </h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0", event.tagColor)}>
                          {event.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-[rgb(var(--muted))]">
                          <Calendar className="w-3 h-3" />
                          {event.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[rgb(var(--muted))]">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      </div>
                      <p className="text-sm text-[rgb(var(--muted))] leading-relaxed mb-3">{event.desc}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="px-3 py-1.5 rounded-lg text-xs border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.3)] transition-colors"
                        >
                          Više informacija →
                        </button>
                        <button
                          onClick={() => toggleNotify(event.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border font-medium transition-all",
                            notifiedEvents.has(event.id)
                              ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                              : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                          )}
                        >
                          <Bell className={cn("w-3 h-3", notifiedEvents.has(event.id) && "fill-current")} />
                          {notifiedEvents.has(event.id) ? "Obavještenje aktivno" : "Obavijesti me"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — Leaderboard */}
        <div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-5 h-5 text-[rgb(var(--primary))]" />
              <h2 className="text-lg font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                {t("leaderboard")}
              </h2>
            </div>
            {leaderboardLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-5 h-4 rounded bg-[rgb(var(--border)/0.5)]" />
                    <div className="w-8 h-8 rounded-full bg-[rgb(var(--border)/0.5)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded bg-[rgb(var(--border)/0.5)] w-24" />
                      <div className="h-2.5 rounded bg-[rgb(var(--border)/0.4)] w-16" />
                    </div>
                    <div className="w-10 h-3 rounded bg-[rgb(var(--border)/0.5)]" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-xs text-[rgb(var(--muted))] text-center py-6">Još nema korisnika.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map(({ rank, name, initial, xp, badge }) => (
                  <div
                    key={rank}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      rank <= 3 && "bg-[rgb(var(--primary)/0.04)]"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-bold w-5 text-center",
                      rank === 1 ? "text-yellow-400" :
                      rank === 2 ? "text-slate-300" :
                      rank === 3 ? "text-orange-500" :
                      "text-[rgb(var(--muted))]"
                    )}>
                      {rank}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[rgb(var(--primary)/0.2)] flex items-center justify-center text-sm font-bold text-[rgb(var(--primary))] flex-shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[rgb(var(--foreground))] truncate">{name}</div>
                      <div className="text-xs text-[rgb(var(--muted))]">{badge}</div>
                    </div>
                    <div className="text-xs font-bold text-[rgb(var(--primary))]">{xp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl p-6">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="text-5xl mb-4">{selectedEvent.emoji}</div>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium mb-3 inline-block", selectedEvent.tagColor)}>
              {selectedEvent.tag}
            </span>
            <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2" style={{ fontFamily: "Oswald, sans-serif" }}>
              {selectedEvent.title}
            </h2>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                <Calendar className="w-4 h-4" />
                {selectedEvent.date}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                <MapPin className="w-4 h-4" />
                {selectedEvent.location}
              </span>
            </div>
            <p className="text-sm text-[rgb(var(--muted))] leading-relaxed mb-5">{selectedEvent.desc}</p>
            <button
              onClick={() => {
                toggleNotify(selectedEvent.id);
                setSelectedEvent(null);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all",
                notifiedEvents.has(selectedEvent.id)
                  ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                  : "bg-[rgb(var(--primary))] border-transparent text-white hover:bg-[rgb(var(--primary)/0.85)]"
              )}
            >
              <Bell className="w-4 h-4" />
              {notifiedEvents.has(selectedEvent.id) ? "✓ Obavještenje aktivirano" : "🔔 Obavijesti me o ovom događaju"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
