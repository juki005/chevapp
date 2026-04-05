"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Rss, Lightbulb, Calendar, Trophy,
  X, MapPin, Bell, Heart, MessageCircle, Share2, Filter, Flame,
  Landmark, Star, ExternalLink, Search, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunityNews } from "@/components/community/CommunityNews";
import { createClient } from "@/lib/supabase/client";
import {
  getLeaderboard, getActivityFeed,
  type LeaderboardEntry, type FeedPost,
} from "@/lib/actions/community";
import {
  getLandmarksForCity, getCityFromCoords, getCoordsFromCity,
  type Landmark as LandmarkType,
} from "@/lib/actions/discovery";
import { getTripAdvisorUrl } from "@/lib/tripadvisor";
import dynamic from "next/dynamic";
import type { MapRestaurant } from "@/components/finder/RestaurantMap";

const RestaurantMap = dynamic(
  () => import("@/components/finder/RestaurantMap").then(m => ({ default: m.RestaurantMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[380px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]">
        <Loader2 className="w-7 h-7 animate-spin text-[rgb(var(--primary))]" />
      </div>
    ),
  },
);

// ── Types ─────────────────────────────────────────────────────────────────────
type CommunityTab = "feed" | "tips" | "events" | "explore";

// ── Mock fallback posts (shown when DB feed is empty) ─────────────────────────
const MOCK_POSTS: FeedPost[] = [
  {
    id: "mock-1",
    userName: "MarkoM", userAvatar: "🧑‍🍳", userXP: 2400,
    content: "Upravo bio u Željу 1 — redovi kao obično, ali vrijedi svakih 45 minuta čekanja. Meso danas posebno sočno! 🔥",
    restaurantName: "Željo 1", restaurantCity: "Sarajevo",
    likesCount: 47, isInsiderTip: false, createdAt: "",
  },
  {
    id: "mock-2",
    userName: "SaraK", userAvatar: "👩‍🍳", userXP: 1850,
    content: "BISER IZ MAHALE 💎 — Mali kiosk kod stare pivare u Travniku, nema natpisa. Pitajte Hasana za ćevape od domaće janjetine. Jedinstven okus!",
    restaurantName: null, restaurantCity: null,
    likesCount: 123, isInsiderTip: true, createdAt: "",
  },
  {
    id: "mock-3",
    userName: "Grill_Luka", userAvatar: "🧑‍🔧", userXP: 4100,
    content: "Leskovački grill festival za 2 tjedna! Ko ide, javite se da organiziramo grupu. Prošle godine nismo žalili.",
    restaurantName: null, restaurantCity: "Leskovac",
    likesCount: 89, isInsiderTip: false, createdAt: "",
  },
];

const GASTRO_TIPS = [
  { id: "t1", city: "Sarajevo",   emoji: "🕌", tip: "Kod Žarkovića u Baščaršiji — naruči bez luka, ali zatraži dvostruki kajmak. Ne piše na meniju.", author: "SaraK",     votes: 88  },
  { id: "t2", city: "Banja Luka", emoji: "🏔️", tip: "Kod Muje ima poseban sto za stalne goste — uvijek slobodan oko 11:30 prije ručka navale.",        author: "ZoranB",    votes: 64  },
  { id: "t3", city: "Mostar",     emoji: "🌉", tip: "Ćevabdžinica ispod Starog mosta — sjedi na terasi, naruči domaći sok od šipka uz porciju.",        author: "TinaV",     votes: 42  },
  { id: "t4", city: "Zagreb",     emoji: "🏙️", tip: "Kantun Paulina — dođi u 11:00 kad otvaraju. Sve porcije svježe, nema stajanja. Do 13h rasprodano.", author: "Grill_Luka", votes: 37  },
  { id: "t5", city: "Beograd",    emoji: "🌆", tip: "Skadarlija — ne idi u restoran s najviše turista. Traži onaj s pikado tablom unutra.",               author: "MarkoM",    votes: 55  },
  { id: "t6", city: "Travnik",    emoji: "🏰", tip: "Mali kiosk kod stare pivare, nema natpisa. Pitajte Hasana — jedinstven okus domaće janjetine.",      author: "SaraK",     votes: 123 },
];

const FALLBACK_EVENTS = [
  { id: "e1", title: "Leskovački Grill Festival 2025",    date: "15. – 18. kolovoza 2025.",  location: "Leskovac, Srbija",       emoji: "🔥", desc: "Najveći balkanski festival grilanja s više od 50 natjecatelja.",                          tag: "Festival", tagColor: "text-red-400 bg-red-400/10 border-red-400/30"   },
  { id: "e2", title: "Sarajevo Gastro Dani",              date: "22. – 24. rujna 2025.",      location: "Baščaršija, Sarajevo",   emoji: "🕌", desc: "Proljetni gastro događaj u srcu Baščaršije. Radionice kuhanja i degustacije.",            tag: "Gastro",   tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/30"},
  { id: "e3", title: "ChevApp Zajednica: Roštilj Meetup", date: "12. srpnja 2025.",           location: "Split, Hrvatska",        emoji: "🌊", desc: "Neformalni meetup zajednice — grilanje uz more. Svaki donosi po nešto. Kapacitet 40.",   tag: "Meetup",   tagColor: "text-blue-400 bg-blue-400/10 border-blue-400/30"  },
];

interface EventItem { id: string; title: string; date: string; location: string; emoji: string; desc: string; tag: string; tagColor: string; }

const ALL_TIP_CITIES = ["Sve", ...Array.from(new Set(GASTRO_TIPS.map((t) => t.city)))];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "upravo";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ src, name, size = "md" }: { src: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-7 h-7 text-sm" : size === "lg" ? "w-12 h-12 text-2xl" : "w-9 h-9 text-base";
  const isUrl = src && (src.startsWith("http://") || src.startsWith("https://"));
  return (
    <div className={cn(dim, "rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-[rgb(var(--primary)/0.15)]")}>
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name} className="w-full h-full object-cover" />
      ) : src ? (
        <span className="leading-none">{src}</span>
      ) : (
        <span className="font-bold text-[rgb(var(--primary))] leading-none">{name[0]?.toUpperCase() ?? "K"}</span>
      )}
    </div>
  );
}

// ── Medal config ──────────────────────────────────────────────────────────────
const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_BG = [
  "bg-yellow-400/8 border-yellow-400/20",
  "bg-slate-400/8 border-slate-400/20",
  "bg-orange-600/8 border-orange-600/20",
];
const MEDAL_RANK_COLOR = ["text-yellow-400", "text-slate-300", "text-orange-500"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const t = useTranslations("community");
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");

  // Leaderboard
  const [leaderboard,        setLeaderboard]        = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((data) => {
      setLeaderboard(data);
      setLeaderboardLoading(false);
    });
  }, []);

  // Activity feed
  const [feed,        setFeed]        = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [likes,       setLikes]       = useState<Record<string, number>>({});
  const [likedPosts,  setLikedPosts]  = useState<Set<string>>(new Set());

  useEffect(() => {
    getActivityFeed().then((data) => {
      const posts = data.length > 0 ? data : MOCK_POSTS;
      setFeed(posts);
      setLikes(Object.fromEntries(posts.map((p) => [p.id, p.likesCount])));
      setFeedLoading(false);
    });
  }, []);

  // Events
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("events")
      .select("id, title, description, location, date_label, emoji, tag, tag_color, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: unknown }) => {
        const rows = data as Array<{ id: string; title: string; description: string; location: string; date_label: string; emoji: string; tag: string; tag_color: string }> | null;
        if (rows && rows.length > 0) {
          setEvents(rows.map((r) => ({ id: r.id, title: r.title, date: r.date_label, location: r.location, emoji: r.emoji, desc: r.description, tag: r.tag, tagColor: r.tag_color })));
        }
      });
  }, []);

  // Tips
  const [tipVotes,   setTipVotes]   = useState<Record<string, number>>(Object.fromEntries(GASTRO_TIPS.map((t) => [t.id, t.votes])));
  const [votedTips,  setVotedTips]  = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState("Sve");

  // Events modals
  const [notifiedEvents, setNotifiedEvents] = useState<Set<string>>(new Set());
  const [selectedEvent,  setSelectedEvent]  = useState<EventItem | null>(null);

  const filteredTips = cityFilter === "Sve" ? GASTRO_TIPS : GASTRO_TIPS.filter((tip) => tip.city === cityFilter);

  // ── Discovery ("Istraži grad") ──────────────────────────────────────────────
  const [discoveryCityName,  setDiscoveryCityName]  = useState<string>("");
  const [discoveryLandmarks, setDiscoveryLandmarks] = useState<LandmarkType[]>([]);
  const [discoveryLoading,   setDiscoveryLoading]   = useState(true);
  const [cityCenter,         setCityCenter]         = useState<{ lat: number; lng: number }>({ lat: 44.1, lng: 17.9 });
  const [cityInput,          setCityInput]          = useState<string>("");
  const [citySearching,      setCitySearching]      = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Load city data (landmarks + coords) for a given city name
  const loadCityData = async (cityName: string, showLoadingSpinner = false) => {
    if (showLoadingSpinner) setCitySearching(true);
    setDiscoveryCityName(cityName);
    setCityInput(cityName);
    const [landmarks, coords] = await Promise.all([
      getLandmarksForCity(cityName, 3),
      getCoordsFromCity(cityName),
    ]);
    setDiscoveryLandmarks(landmarks);
    if (coords) setCityCenter(coords);
    setDiscoveryLoading(false);
    setCitySearching(false);
  };

  useEffect(() => {
    // 1. Try last known city from localStorage (set by Finder on city change)
    const cached = typeof window !== "undefined" ? localStorage.getItem("chevapp_last_city") : null;
    if (cached) { loadCityData(cached); return; }

    // 2. Try geolocation → reverse geocode
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const city = await getCityFromCoords(pos.coords.latitude, pos.coords.longitude);
          if (city) localStorage.setItem("chevapp_last_city", city);
          loadCityData(city);
        },
        () => loadCityData("Sarajevo"),
        { timeout: 5000 },
      );
    } else {
      loadCityData("Sarajevo");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCitySearch = async () => {
    const city = cityInput.trim();
    if (!city || city === discoveryCityName) return;
    localStorage.setItem("chevapp_last_city", city);
    await loadCityData(city, true);
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); setLikes((l) => ({ ...l, [postId]: (l[postId] ?? 0) - 1 })); }
      else                  { next.add(postId);    setLikes((l) => ({ ...l, [postId]: (l[postId] ?? 0) + 1 })); }
      return next;
    });
  };

  const tabs: { key: CommunityTab; icon: React.ReactNode; label: string }[] = [
    { key: "feed",    icon: <Rss       className="w-4 h-4" />, label: t("feed")        },
    { key: "tips",    icon: <Lightbulb className="w-4 h-4" />, label: t("insiderTips") },
    { key: "events",  icon: <Calendar  className="w-4 h-4" />, label: t("events")      },
    { key: "explore", icon: <Landmark  className="w-4 h-4" />, label: discoveryCityName ? `Istraži ${discoveryCityName}` : "Istraži grad" },
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

        {/* ═══════════════ MAIN AREA ═══════════════ */}
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
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]",
                  key === "explore" && activeTab !== key && "border-indigo-500/20 text-indigo-400/70 hover:text-indigo-300",
                )}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{key === "explore" ? "Istraži" : label}</span>
              </button>
            ))}
          </div>

          {/* ──────────── FEED TAB ──────────── */}
          {activeTab === "feed" && (
            <div className="space-y-4">
              {feedLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)] p-5 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-[rgb(var(--border)/0.5)] flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[rgb(var(--border)/0.5)] rounded w-32" />
                        <div className="h-3 bg-[rgb(var(--border)/0.4)] rounded w-full" />
                        <div className="h-3 bg-[rgb(var(--border)/0.4)] rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                feed.map((post) => (
                  <div
                    key={post.id}
                    className={cn(
                      "rounded-2xl border p-5 transition-colors",
                      post.isInsiderTip
                        ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.04)]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]"
                    )}
                  >
                    {post.isInsiderTip && (
                      <div className="flex items-center gap-2 text-[rgb(var(--primary))] text-xs font-semibold mb-3">
                        <Lightbulb className="w-3.5 h-3.5" />
                        {t("hiddenGem")} 💎
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Avatar src={post.userAvatar} name={post.userName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-[rgb(var(--foreground))] text-sm">{post.userName}</span>
                          {post.userXP > 0 && (
                            <span className="text-xs text-[rgb(var(--primary))] font-medium">{post.userXP.toLocaleString()} XP</span>
                          )}
                          {post.createdAt && (
                            <span className="text-xs text-[rgb(var(--muted))] ml-auto">{timeAgo(post.createdAt)}</span>
                          )}
                        </div>
                        {(post.restaurantName ?? post.restaurantCity) && (
                          <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] mb-2">
                            <MapPin className="w-3 h-3" />
                            {[post.restaurantName, post.restaurantCity].filter(Boolean).join(", ")}
                          </div>
                        )}
                        <p className="text-[rgb(var(--foreground)/0.85)] text-sm leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={cn(
                              "flex items-center gap-1 text-xs transition-colors",
                              likedPosts.has(post.id) ? "text-red-400" : "text-[rgb(var(--muted))] hover:text-red-400"
                            )}
                          >
                            <Heart className={cn("w-3.5 h-3.5", likedPosts.has(post.id) && "fill-current")} />
                            {likes[post.id] ?? 0}
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
                ))
              )}
            </div>
          )}

          {/* ──────────── TIPS TAB ──────────── */}
          {activeTab === "tips" && (
            <div>
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
                <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mr-1">Grad:</span>
                {ALL_TIP_CITIES.map((city) => (
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
                {filteredTips.length} insider dojava{cityFilter !== "Sve" ? ` za ${cityFilter}` : ""}
              </p>
              <div className="space-y-3">
                {filteredTips.map((tip) => (
                  <div key={tip.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-[rgb(var(--primary))]">{tip.city}</span>
                          <span className="text-xs text-[rgb(var(--muted))]">· {tip.author}</span>
                        </div>
                        <p className="text-sm text-[rgb(var(--foreground)/0.85)] leading-relaxed">{tip.tip}</p>
                        <button
                          onClick={() => setVotedTips((prev) => {
                            const next = new Set(prev);
                            if (next.has(tip.id)) { next.delete(tip.id); setTipVotes((v) => ({ ...v, [tip.id]: (v[tip.id] ?? 0) - 1 })); }
                            else                  { next.add(tip.id);    setTipVotes((v) => ({ ...v, [tip.id]: (v[tip.id] ?? 0) + 1 })); }
                            return next;
                          })}
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
            </div>
          )}

          {/* ──────────── EVENTS TAB ──────────── */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl flex-shrink-0">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-[rgb(var(--foreground))] text-base leading-snug" style={{ fontFamily: "Oswald, sans-serif" }}>{event.title}</h3>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0", event.tagColor)}>{event.tag}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-[rgb(var(--muted))]"><Calendar className="w-3 h-3" />{event.date}</span>
                        <span className="flex items-center gap-1 text-xs text-[rgb(var(--muted))]"><MapPin className="w-3 h-3" />{event.location}</span>
                      </div>
                      <p className="text-sm text-[rgb(var(--muted))] leading-relaxed mb-3">{event.desc}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedEvent(event)} className="px-3 py-1.5 rounded-lg text-xs border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.3)] transition-colors">
                          Više informacija →
                        </button>
                        <button
                          onClick={() => setNotifiedEvents((prev) => { const n = new Set(prev); n.has(event.id) ? n.delete(event.id) : n.add(event.id); return n; })}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border font-medium transition-all",
                            notifiedEvents.has(event.id)
                              ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                              : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]")}
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

          {/* ──────────── ISTRAŽI GRAD TAB ──────────── */}
          {activeTab === "explore" && (
            <div className="space-y-5">

              {/* City search input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
                    placeholder="Upiši grad (npr. Mostar, Beograd…)"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-sm placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>
                <button
                  onClick={handleCitySearch}
                  disabled={citySearching || !cityInput.trim() || cityInput.trim() === discoveryCityName}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {citySearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="hidden sm:inline">Istraži</span>
                </button>
              </div>

              {/* Top landmarks list */}
              {(discoveryLoading || discoveryLandmarks.length > 0) && (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[rgb(var(--border))] flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-[rgb(var(--foreground))]">
                      Top atrakcije{discoveryCityName ? ` — ${discoveryCityName}` : ""}
                    </span>
                    <span className="text-xs text-[rgb(var(--muted))] ml-auto">Google Places · 500+ ocjena</span>
                  </div>
                  <div className="px-5 py-3 space-y-3">
                    {discoveryLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                          <div className="w-7 h-7 rounded-full bg-[rgb(var(--border)/0.5)] flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-[rgb(var(--border)/0.5)] rounded w-44" />
                            <div className="h-2.5 bg-[rgb(var(--border)/0.3)] rounded w-28" />
                          </div>
                        </div>
                      ))
                    ) : (
                      discoveryLandmarks.map((lm, i) => {
                        const typeLabel = lm.types.includes("museum") ? "Muzej"
                          : lm.types.includes("church") ? "Crkva / džamija"
                          : lm.types.includes("park")   ? "Park"
                          : "Turistička atrakcija";
                        const emoji = lm.types.includes("museum") ? "🏛"
                          : lm.types.includes("church") ? "⛪"
                          : lm.types.includes("park")   ? "🌳" : "📍";
                        return (
                          <div key={lm.id} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-base">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-[rgb(var(--foreground))] truncate block">{emoji} {lm.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[rgb(var(--muted))]">{typeLabel}</span>
                                {lm.rating !== null && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    {lm.rating.toFixed(1)}
                                    <span className="text-[rgb(var(--muted))] font-normal">
                                      ({lm.userRatingCount >= 1000
                                        ? `${(lm.userRatingCount / 1000).toFixed(1)}k`
                                        : lm.userRatingCount})
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Landmark map — key forces remount when city changes so map recenters */}
              <div>
                <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Karta atrakcija · klikni 🏛️ za aktivaciju
                </p>
                <RestaurantMap
                  key={discoveryCityName}
                  restaurants={[] as MapRestaurant[]}
                  height="380px"
                  defaultCenter={cityCenter}
                  initialDiscoveryMode={true}
                />
              </div>

              {/* TripAdvisor CTA */}
              {discoveryCityName && (
                <a
                  href={getTripAdvisorUrl(discoveryCityName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/15 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Istraži puni vodič za {discoveryCityName} na TripAdvisor-u
                </a>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════ SIDEBAR ═══════════════ */}
        <div className="space-y-5">

          {/* ── Leaderboard ── */}
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
                    <div className="w-6 h-6 rounded-full bg-[rgb(var(--border)/0.5)]" />
                    <div className="w-9 h-9 rounded-full bg-[rgb(var(--border)/0.5)]" />
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
              <div className="space-y-2">
                {leaderboard.map(({ rank, name, avatarUrl, xp, badge, streak }) => (
                  <div
                    key={rank}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl border transition-colors",
                      rank === 1 ? MEDAL_BG[0] :
                      rank === 2 ? MEDAL_BG[1] :
                      rank === 3 ? MEDAL_BG[2] :
                      "border-transparent"
                    )}
                  >
                    <span className={cn("w-6 text-center text-sm font-bold flex-shrink-0", rank <= 3 ? "text-lg" : MEDAL_RANK_COLOR[rank - 1] ?? "text-[rgb(var(--muted))]")}>
                      {rank <= 3 ? MEDALS[rank - 1] : rank}
                    </span>
                    <Avatar src={avatarUrl} name={name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[rgb(var(--foreground))] truncate">{name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[rgb(var(--muted))]">{badge}</span>
                        {streak > 1 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-medium">
                            <Flame className="w-2.5 h-2.5" />{streak}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn("text-xs font-bold tabular-nums flex-shrink-0",
                      rank === 1 ? "text-yellow-400" :
                      rank === 2 ? "text-slate-300" :
                      rank === 3 ? "text-orange-500" :
                      "text-[rgb(var(--primary))]"
                    )}>
                      {xp.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Admin Announcements / News ── */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5">
            <CommunityNews />
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
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium mb-3 inline-block", selectedEvent.tagColor)}>{selectedEvent.tag}</span>
            <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2" style={{ fontFamily: "Oswald, sans-serif" }}>{selectedEvent.title}</h2>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]"><Calendar className="w-4 h-4" />{selectedEvent.date}</span>
              <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--muted))]"><MapPin className="w-4 h-4" />{selectedEvent.location}</span>
            </div>
            <p className="text-sm text-[rgb(var(--muted))] leading-relaxed mb-5">{selectedEvent.desc}</p>
            <button
              onClick={() => { setNotifiedEvents((prev) => { const n = new Set(prev); n.has(selectedEvent.id) ? n.delete(selectedEvent.id) : n.add(selectedEvent.id); return n; }); setSelectedEvent(null); }}
              className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all",
                notifiedEvents.has(selectedEvent.id)
                  ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                  : "bg-[rgb(var(--primary))] border-transparent text-white hover:opacity-90")}
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
