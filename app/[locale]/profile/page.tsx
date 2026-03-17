// DEPLOYMENT_VERSION: 3.0_NUCLEAR_REFRESH_NO_CACHE
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  User, BookOpen, Map as MapIcon, Edit3, Plus, Star, Trash2, MapPin,
  Calendar, ChefHat, Flame, Zap, CheckCircle, Trophy, Music2, Award,
  Lock, ExternalLink,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import {
  getUserStats, getWordOfDay, getRank, getNextRank,
  rankProgress, isTodayClaimed, type UserStats, type WordOfDay,
} from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { GastroCityList, type CityVisit } from "@/components/profile/GastroCityList";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import type { CevapStyle } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────
type ProfileTab = "journal" | "gastro" | "taste" | "badges" | "music";

interface JournalEntry {
  id:         string;
  restaurant: string;
  city:       string;
  style:      string;
  rating:     number;
  note:       string;
  date:       string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INITIAL_ENTRIES: JournalEntry[] = [
  { id: "demo-1", restaurant: "Željo 1",  city: "Sarajevo",  style: "Sarajevski",  rating: 5, note: "Klasika nad klasikama. Čekanje 30min, ali vrijedi.", date: "2025-06-10" },
  { id: "demo-2", restaurant: "Kod Muje", city: "Banja Luka", style: "Banjalučki", rating: 4, note: "Deblji i sočniji od sarajevskih. Dobra alternativa.",  date: "2025-05-22" },
];

const STYLE_OPTIONS  = ["Sarajevski", "Banjalučki", "Travnički", "Leskovački", "Ostalo"];
const RATING_EMOJIS  = ["", "😕", "😐", "🙂", "😋", "🔥"];
const FLAME_FILLED   = "🔥";
const FLAME_EMPTY    = "🩶";

function flameRating(n: number, total = 5) {
  return FLAME_FILLED.repeat(n) + FLAME_EMPTY.repeat(total - n);
}

function buildTasteData(entries: JournalEntry[]) {
  const scores: Record<string, { total: number; count: number }> = {};
  STYLE_OPTIONS.forEach((s) => { scores[s] = { total: 0, count: 0 }; });
  entries.forEach((e) => {
    if (scores[e.style]) { scores[e.style].total += e.rating; scores[e.style].count++; }
  });
  return STYLE_OPTIONS.map((style) => ({
    style,
    score: scores[style].count > 0
      ? Math.round((scores[style].total / scores[style].count) * 20)
      : 0,
  }));
}

// ── Spotify helpers ───────────────────────────────────────────────────────────
const SPOTIFY_LS_KEY = "chevapp:grilling_song_url";

function parseSpotifyEmbed(url: string): string | null {
  const m1 = url.match(/spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (m1) return `https://open.spotify.com/embed/${m1[1]}/${m1[2]}?utm_source=generator&theme=0`;
  const m2 = url.match(/spotify:(track|album|playlist|episode):([A-Za-z0-9]+)/);
  if (m2) return `https://open.spotify.com/embed/${m2[1]}/${m2[2]}?utm_source=generator&theme=0`;
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const t       = useTranslations("profile");
  const supabase = createClient();

  // ── Auth & gamification ──────────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState("Grill Majstor");
  const [avatarEmoji,    setAvatarEmoji]    = useState<string | null>(null);
  const [favoriteStyleDB, setFavoriteStyleDB] = useState<CevapStyle | null>(null);
  const [bioDB,          setBioDb]          = useState<string | null>(null);
  const [genderDB,       setGenderDb]       = useState<string | null>(null);
  const [weightKgDB,     setWeightKgDb]     = useState<number | null>(null);
  const [heightCmDB,     setHeightCmDb]     = useState<number | null>(null);
  const [joinDate,       setJoinDate]       = useState<string | null>(null);
  const [userStats,      setUserStats]      = useState<UserStats | null>(null);
  const [wordOfDay,      setWordOfDay]      = useState<WordOfDay | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [editModalOpen,  setEditModalOpen]  = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        setUserId(user.id);
        setJoinDate(user.created_at ?? null);
        const [stats, word, profileRes] = await Promise.all([
          getUserStats(user.id, supabase),
          getWordOfDay(supabase),
          supabase.from("profiles").select("username, avatar_url, favorite_style, bio, gender, weight_kg, height_cm").eq("id", user.id).single(),
        ]);
        if (!cancelled) {
          setUserStats(stats);
          setWordOfDay(word);
          const p = profileRes.data as { username: string | null; avatar_url: string | null; favorite_style: string | null; bio: string | null; gender: string | null; weight_kg: number | null; height_cm: number | null } | null;
          setDisplayName(
            p?.username ??
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split("@")[0] ??
            "Grill Majstor"
          );
          setAvatarEmoji(p?.avatar_url ?? null);
          setFavoriteStyleDB((p?.favorite_style as CevapStyle | null) ?? null);
          setBioDb(p?.bio ?? null);
          setGenderDb(p?.gender ?? null);
          setWeightKgDb(p?.weight_kg ?? null);
          setHeightCmDb(p?.height_cm ?? null);
        }
      } else {
        const word = await getWordOfDay(supabase);
        if (!cancelled) setWordOfDay(word);
      }
      if (!cancelled) setStatsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Keep stats in sync when Academy or games award XP
  useEffect(() => {
    if (!userId) return;
    const handler = (e: Event) => {
      const newStats = (e as CustomEvent<{ newStats?: UserStats }>).detail?.newStats;
      if (newStats) {
        setUserStats(newStats);
      } else {
        getUserStats(userId, supabase).then((s) => { if (s) setUserStats(s); });
      }
    };
    window.addEventListener("chevapp:stats_updated", handler);
    return () => window.removeEventListener("chevapp:stats_updated", handler);
  }, [userId, supabase]);

  // ── Journal state ────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<ProfileTab>("journal");
  const [entries,        setEntries]        = useState<JournalEntry[]>(INITIAL_ENTRIES);
  const [showForm,       setShowForm]       = useState(false);
  const [formRestaurant, setFormRestaurant] = useState("");
  const [formCity,       setFormCity]       = useState("");
  const [formStyle,      setFormStyle]      = useState(STYLE_OPTIONS[0]);
  const [formRating,     setFormRating]     = useState(5);
  const [formNote,       setFormNote]       = useState("");

  const handleAddEntry = () => {
    if (!formRestaurant.trim() || !formCity.trim()) return;
    setEntries((prev) => [{
      id: Date.now().toString(),
      restaurant: formRestaurant.trim(),
      city:       formCity.trim(),
      style:      formStyle,
      rating:     formRating,
      note:       formNote.trim(),
      date:       new Date().toISOString().split("T")[0],
    }, ...prev]);
    setFormRestaurant(""); setFormCity(""); setFormStyle(STYLE_OPTIONS[0]);
    setFormRating(5); setFormNote(""); setShowForm(false);
  };
  const deleteEntry = (id: string) => setEntries((p) => p.filter((e) => e.id !== id));

  // ── City totals (for progress bar denominator in GastroCityList) ────────
  const [statsByCity, setStatsByCity] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from("restaurants").select("city").then(({ data: rawVisitHistory }) => {
      if (!rawVisitHistory) return;
      const counts = (rawVisitHistory as { city: string }[]).reduce<Record<string, number>>(
        (acc, row) => { acc[row.city] = (acc[row.city] ?? 0) + 1; return acc; },
        {}
      );
      setStatsByCity(counts);
    });
  }, []);

  // ── Gastro Ruta: city visits from DB reviews ──────────────────────────
  const [dbCityVisits, setDbCityVisits] = useState<CityVisit[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("reviews")
      .select("restaurant_id, restaurants(city)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data as { restaurant_id: string; restaurants: { city: string } | null }[]) {
          const city = row.restaurants?.city;
          if (city) counts[city] = (counts[city] ?? 0) + 1;
        }
        setDbCityVisits(
          Object.entries(counts)
            .map(([city, visitedCount]) => ({
              city,
              visitedCount,
              totalCount: statsByCity[city] ?? Math.max(visitedCount * 2, 5),
            }))
            .sort((a, b) => b.visitedCount - a.visitedCount)
        );
      });
  }, [userId, cityTotals]);

  // ── Music state ──────────────────────────────────────────────────────────
  const [songUrl,      setSongUrl]      = useState("");
  const [songInput,    setSongInput]    = useState("");
  const [embedUrl,     setEmbedUrl]     = useState<string | null>(null);
  const [songError,    setSongError]    = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SPOTIFY_LS_KEY) ?? "";
    setSongUrl(saved);
    setSongInput(saved);
    if (saved) setEmbedUrl(parseSpotifyEmbed(saved));
  }, []);

  const handleSaveSong = () => {
    const trimmed = songInput.trim();
    const parsed  = trimmed ? parseSpotifyEmbed(trimmed) : null;
    if (trimmed && !parsed) { setSongError(true); return; }
    setSongError(false);
    setSongUrl(trimmed);
    setEmbedUrl(parsed);
    localStorage.setItem(SPOTIFY_LS_KEY, trimmed);
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const tasteData    = buildTasteData(entries);
  const totalVisits  = entries.length;
  const xp           = userStats?.xp_points ?? userStats?.xp_total ?? entries.reduce((s, e) => s + e.rating * 10, 0);
  const streak       = userStats?.current_streak ?? 0;
  const rank         = getRank(xp);
  const nextRank     = getNextRank(xp);
  const progress     = rankProgress(xp);
  const todayClaimed = isTodayClaimed(userStats);

  const favoriteStyle = favoriteStyleDB ?? (() => {
    if (!entries.length) return "—";
    const counts: Record<string, number> = {};
    entries.forEach((e) => { counts[e.style] = (counts[e.style] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  })();

  // Best entry per city — used in the recently-visited list
  const visitedCities = Array.from(
    entries.reduce((map, e) => {
      const ex = map.get(e.city);
      if (!ex || e.rating > ex.rating) map.set(e.city, e);
      return map;
    }, new Map<string, JournalEntry>()).values()
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // City visit counts — for GastroCityList progress bars
  const cityVisits: CityVisit[] = (() => {
    const counts = entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.city] = (acc[e.city] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([city, visitedCount]) => ({
        city,
        visitedCount,
        // Use DB total if available; otherwise a reasonable bar target
        totalCount: statsByCity[city] ?? Math.max(visitedCount * 2, 5),
      }))
      .sort((a, b) => b.visitedCount - a.visitedCount);
  })();

  // ── Badges definition ────────────────────────────────────────────────────
  const BADGES = [
    { id: "first",   Icon: MapPin,      label: "Prvijenac",        desc: "Prva posjeta",         earned: totalVisits >= 1,              color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/30" },
    { id: "exp",     Icon: MapIcon,     label: "Istraživač",       desc: "3 različita grada",    earned: cityVisits.length >= 3,     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-500/30" },
    { id: "regular", Icon: Star,        label: "Redoviti Gost",    desc: "5 posjeta",             earned: totalVisits >= 5,              color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-500/30" },
    { id: "addict",  Icon: Flame,       label: "Ćevap Addict",     desc: "10 posjeta",            earned: totalVisits >= 10,             color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-500/30" },
    { id: "gurman",  Icon: Zap,         label: "Gurman",           desc: "500 XP",                earned: xp >= 500,                    color: "text-[rgb(var(--primary))]", bg: "bg-[rgb(var(--primary)/0.1)]", border: "border-[rgb(var(--primary)/0.3)]" },
    { id: "sef",     Icon: ChefHat,     label: "Šef Kuhinje",      desc: "2 000 XP",             earned: xp >= 2000,                   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-500/30" },
    { id: "maestro", Icon: Trophy,      label: "Maestro",          desc: "4 000 XP",             earned: xp >= 4000,                   color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-500/30" },
    { id: "streak",  Icon: Flame,       label: "Na Vatri",         desc: "3 dana serije",        earned: streak >= 3,                  color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-500/30" },
    { id: "daily",   Icon: CheckCircle, label: "Disciplinirani",   desc: "Dnevni izazov",        earned: todayClaimed,                 color: "text-green-400",   bg: "bg-green-400/10",   border: "border-green-500/30" },
    { id: "conq",    Icon: Award,       label: "Osvajač",          desc: "5 gradova",            earned: cityVisits.length >= 5,    color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-500/30" },
  ];

  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <User className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold uppercase tracking-wide text-[rgb(var(--foreground))]"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              {t("title")}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Profile card ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-[rgb(var(--border)/0.5)] flex items-center justify-center text-5xl border-2 border-[rgb(var(--primary)/0.3)]">
                {avatarEmoji ?? "🧑‍🍳"}
              </div>
              <button
                onClick={() => setEditModalOpen(true)}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-[rgb(var(--primary))] flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                title="Uredi profil"
              >
                <Edit3 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h2
                  className="text-2xl font-bold text-[rgb(var(--foreground))] truncate"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {displayName}
                </h2>
                <span className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full font-semibold border border-current/30",
                  rank.bg, rank.color
                )}>
                  {rank.emoji} {rank.title}
                </span>
              </div>
              {joinDate && (
                <p className="text-xs text-[rgb(var(--muted))] mb-3">
                  Član od {new Date(joinDate).toLocaleDateString("hr-HR", { year: "numeric", month: "long" })}
                </p>
              )}
              <div className="flex flex-wrap gap-5">
                {[
                  { label: t("totalVisits"),  value: totalVisits.toString(), icon: "📍" },
                  { label: "XP Bodova",        value: xp.toLocaleString(),    icon: "⭐" },
                  { label: "Serija dana",       value: `${streak}🔥`,          icon: "" },
                  { label: t("favoriteStyle"), value: favoriteStyle,          icon: "🥩" },
                ].map(({ label, value, icon }) => (
                  <div key={label}>
                    <div
                      className="flex items-center gap-1 text-lg font-bold text-[rgb(var(--primary))]"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {icon && <span>{icon}</span>} {value}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted))] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors self-start flex-shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              {t("editProfile")}
            </button>
          </div>
        </div>

        {/* ── XP progress ────────────────────────────────────────────────── */}
        {!statsLoading && (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] px-5 py-4">
            <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))] mb-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[rgb(var(--primary))]" />
                <span className="font-medium text-[rgb(var(--foreground))]">{rank.emoji} {rank.title}</span>
              </span>
              {nextRank
                ? <span>{nextRank.emoji} {nextRank.title} — još {(nextRank.minXP - xp).toLocaleString()} XP</span>
                : <span className="text-[rgb(var(--primary))] font-medium">🏆 Maksimalni rang!</span>
              }
            </div>
            <div className="h-2.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-[rgb(var(--muted))]">{xp.toLocaleString()} XP ukupno</span>
              <span className="text-xs text-[rgb(var(--muted))]">{progress}%</span>
            </div>
          </div>
        )}

        {/* ── Daily challenge + Word of Day strip ────────────────────────── */}
        {!statsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={cn(
              "rounded-2xl border p-4 flex items-center gap-3",
              todayClaimed
                ? "border-green-500/30 bg-green-500/5"
                : "border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.05)]"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                todayClaimed ? "bg-green-500/15" : "bg-[rgb(var(--primary)/0.15)]"
              )}>
                {todayClaimed
                  ? <CheckCircle className="w-5 h-5 text-green-400" />
                  : <Zap className="w-5 h-5 text-[rgb(var(--primary))]" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                  Dnevni izazov
                </p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  {todayClaimed ? "✓ Završen danas · +30 XP" : "Nije preuzet — idi u Akademiju"}
                </p>
              </div>
            </div>

            {wordOfDay && (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.1)] flex items-center justify-center flex-shrink-0 text-lg">📖</div>
                <div className="min-w-0">
                  <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">Riječ dana</p>
                  <p className="text-sm font-bold text-[rgb(var(--foreground))] truncate">{wordOfDay.word}</p>
                  <p className="text-xs text-[rgb(var(--muted))] line-clamp-1">{wordOfDay.definition}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab switcher ───────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "journal" as ProfileTab, icon: <BookOpen  className="w-4 h-4" />, label: t("journal") },
            { key: "gastro"  as ProfileTab, icon: <MapPin    className="w-4 h-4" />, label: "Gastro Ruta" },
            { key: "taste"   as ProfileTab, icon: <Star      className="w-4 h-4" />, label: t("tasteProfile") },
            { key: "badges"  as ProfileTab, icon: <Award     className="w-4 h-4" />, label: `Bedževi (${earnedCount}/${BADGES.length})` },
            { key: "music"   as ProfileTab, icon: <Music2    className="w-4 h-4" />, label: "Soundtrack" },
          ]).map(({ key, icon, label }) => (
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── JOURNAL TAB ─────────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "journal" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[rgb(var(--muted))]">{entries.length} unosa u dnevniku</p>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-xs font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addEntry")}
              </button>
            </div>

            {showForm && (
              <div className="rounded-2xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface)/0.5)] p-5 mb-5">
                <h3 className="font-bold text-[rgb(var(--foreground))] mb-4 text-sm uppercase tracking-wide"
                    style={{ fontFamily: "Oswald, sans-serif" }}>
                  Novi unos u dnevnik
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {[
                    { label: "Restoran *", value: formRestaurant, setter: setFormRestaurant, placeholder: "npr. Željo 1" },
                    { label: "Grad *",     value: formCity,       setter: setFormCity,       placeholder: "npr. Sarajevo" },
                  ].map(({ label, value, setter, placeholder }) => (
                    <div key={label}>
                      <label className="text-xs text-[rgb(var(--muted))] mb-1 block">{label}</label>
                      <input
                        type="text" value={value}
                        onChange={(e) => setter(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Stil</label>
                    <select
                      value={formStyle}
                      onChange={(e) => setFormStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] text-sm outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors"
                    >
                      {STYLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Ocjena</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setFormRating(n)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm border transition-all",
                            formRating >= n
                              ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
                              : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <span className="text-lg">{RATING_EMOJIS[formRating]}</span>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Bilješka</label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Što si probao/la? Kako je bilo?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.5)] transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted))] text-sm hover:text-[rgb(var(--foreground))] transition-colors">
                    Odustani
                  </button>
                  <button
                    onClick={handleAddEntry}
                    disabled={!formRestaurant.trim() || !formCity.trim()}
                    className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors disabled:opacity-40"
                  >
                    Spremi unos
                  </button>
                </div>
              </div>
            )}

            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                <BookOpen className="w-10 h-10 text-[rgb(var(--muted))] mx-auto mb-3 opacity-30" />
                <p className="text-[rgb(var(--muted))] text-sm">Dnevnik je prazan. Dodaj prvi unos!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                            {entry.restaurant}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]">
                            {entry.style}
                          </span>
                          <span className="text-xs text-[rgb(var(--primary))] font-semibold ml-auto">+{entry.rating * 10} XP</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[rgb(var(--muted))] mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.city}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{entry.date}</span>
                        </div>
                        <p className="text-xs text-[rgb(var(--primary))]">{flameRating(entry.rating)}</p>
                        {entry.note && <p className="text-sm text-[rgb(var(--muted))] leading-relaxed mt-1">{entry.note}</p>}
                      </div>
                      <button onClick={() => deleteEntry(entry.id)}
                        className="p-1.5 rounded-lg text-[rgb(var(--muted))] hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── GASTRO RUTA TAB ─────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "gastro" && (
          <div className="space-y-5">
            {/* Gastro Passport — city progress bars (DB reviews take precedence) */}
            <GastroCityList cities={dbCityVisits.length > 0 ? dbCityVisits : cityVisits} />

            {/* Recently visited list */}
            {cityVisits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                <MapPin className="w-10 h-10 text-[rgb(var(--muted))] mx-auto mb-3 opacity-30" />
                <p className="text-[rgb(var(--muted))] text-sm">
                  Dodaj restorane u dnevnik da se pojave ovdje i na karti.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[rgb(var(--muted))]">
                    {cityVisits.length} {cityVisits.length === 1 ? "posjećeni grad" : "posjećenih gradova"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Gradova",   value: cityVisits.length },
                      { label: "Restorana", value: entries.length },
                      { label: "Ukupno XP", value: xp },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)] px-3 py-2 text-center">
                        <div className="text-lg font-bold text-[rgb(var(--primary))]" style={{ fontFamily: "Oswald, sans-serif" }}>{value}</div>
                        <div className="text-[10px] text-[rgb(var(--muted))]">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {[...entries]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.1)] flex items-center justify-center text-lg flex-shrink-0">
                          📍
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
                              {entry.restaurant}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]">
                              {entry.style}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[rgb(var(--muted))] mt-0.5">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.city}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{entry.date}</span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-[rgb(var(--muted))] mt-1 line-clamp-1">{entry.note}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm">{flameRating(entry.rating)}</p>
                          <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{entry.rating}/5</p>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── TASTE PROFILE TAB ───────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "taste" && (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-6">
            <h3 className="font-bold text-[rgb(var(--foreground))] mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
              Tvoj Okusni Profil
            </h3>
            <p className="text-xs text-[rgb(var(--muted))] mb-6">
              Generirano iz {entries.length} unosa. Dodaj više za precizniji profil.
            </p>
            {entries.length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="w-10 h-10 text-[rgb(var(--muted))] mx-auto mb-3 opacity-30" />
                <p className="text-[rgb(var(--muted))] text-sm">Dodaj unose u dnevnik da vidiš okusni profil.</p>
              </div>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={tasteData}>
                      <PolarGrid stroke="rgb(var(--border))" />
                      <PolarAngleAxis dataKey="style" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} />
                      <Radar name="Okus" dataKey="score"
                        stroke="rgb(var(--primary))" fill="rgb(var(--primary))"
                        fillOpacity={0.25} strokeWidth={2}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}/100`, "Intenzitet"]}
                        contentStyle={{
                          backgroundColor: "rgb(var(--surface))",
                          border: "1px solid rgb(var(--border))",
                          borderRadius: "8px",
                          color: "rgb(var(--foreground))",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-2">
                  {tasteData.filter((d) => d.score > 0).sort((a, b) => b.score - a.score).map(({ style, score }) => (
                    <div key={style} className="flex items-center gap-3">
                      <span className="text-xs text-[rgb(var(--muted))] w-24 flex-shrink-0">{style}</span>
                      <div className="flex-1 h-2 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                        <div className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-700" style={{ width: `${score}%` }} />
                      </div>
                      <span className="text-xs text-[rgb(var(--primary))] font-semibold w-10 text-right">{score}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── BADGES TAB ──────────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "badges" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[rgb(var(--muted))]">
                {earnedCount} od {BADGES.length} bedževa zarađeno
              </p>
              <div className="h-2 w-32 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-700"
                  style={{ width: `${(earnedCount / BADGES.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {BADGES.map(({ id, Icon, label, desc, earned, color, bg, border }) => (
                <div
                  key={id}
                  className={cn(
                    "rounded-2xl border p-4 flex flex-col items-center gap-2 text-center transition-all",
                    earned
                      ? `${bg} ${border}`
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    earned ? `${bg}` : "bg-[rgb(var(--border)/0.4)]"
                  )}>
                    {earned ? (
                      <Icon className={cn("w-6 h-6", color)} />
                    ) : (
                      <Lock className="w-5 h-5 text-[rgb(var(--muted))] opacity-40" />
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs font-bold leading-tight",
                      earned ? "text-[rgb(var(--foreground))]" : "text-[rgb(var(--muted))]"
                    )} style={{ fontFamily: "Oswald, sans-serif" }}>
                      {label}
                    </p>
                    <p className="text-[10px] text-[rgb(var(--muted))] mt-0.5 leading-tight">{desc}</p>
                  </div>
                  {earned && (
                    <span className="text-[10px] text-green-400 font-semibold">✓ Zarađeno</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── MUSIC / SOUNDTRACK TAB ──────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "music" && (
          <div className="space-y-4">
            {/* Input */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.4)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Music2 className="w-4 h-4 text-[rgb(var(--primary))]" />
                <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
                  Tvoj Grilling Soundtrack
                </p>
              </div>
              <p className="text-sm text-[rgb(var(--muted))] mb-4 leading-relaxed">
                Zalijepi Spotify link tvoje omiljene grilling himne — track, album ili playlist.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={songInput}
                  onChange={(e) => { setSongInput(e.target.value); setSongError(false); }}
                  placeholder="https://open.spotify.com/track/..."
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none transition-colors",
                    songError
                      ? "border-red-500/50 focus:border-red-500/80"
                      : "border-[rgb(var(--border))] focus:border-[rgb(var(--primary)/0.5)]"
                  )}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveSong()}
                />
                <button
                  onClick={handleSaveSong}
                  className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:bg-[rgb(var(--primary)/0.85)] transition-colors flex-shrink-0"
                >
                  Spremi
                </button>
              </div>
              {songError && (
                <p className="text-xs text-red-400 mt-2">
                  Neispravan Spotify link. Primjer: <code className="opacity-70">https://open.spotify.com/track/...</code>
                </p>
              )}
              {songUrl && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-green-400">✓ Spravljeno</span>
                  <button
                    onClick={() => { setSongUrl(""); setSongInput(""); setEmbedUrl(null); localStorage.removeItem(SPOTIFY_LS_KEY); }}
                    className="text-xs text-[rgb(var(--muted))] hover:text-red-400 transition-colors ml-2"
                  >
                    Ukloni
                  </button>
                </div>
              )}
            </div>

            {/* Spotify embed or placeholder */}
            {embedUrl ? (
              <div className="rounded-2xl overflow-hidden border border-[rgb(var(--border))]">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block"
                  title="Spotify player"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--surface)/0.5)] border border-[rgb(var(--border))] flex items-center justify-center mx-auto mb-4">
                  <Music2 className="w-7 h-7 text-[rgb(var(--muted))] opacity-40" />
                </div>
                <p className="text-[rgb(var(--foreground))] font-semibold text-sm mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>
                  Koji zvuk prati tvoj roštilj?
                </p>
                <p className="text-[rgb(var(--muted))] text-xs max-w-xs mx-auto leading-relaxed">
                  Zalijepi Spotify link iznad da ovdje prikaže tvoj mini player.
                </p>
                <a
                  href="https://open.spotify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-xs text-[rgb(var(--primary))] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Otvori Spotify
                </a>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Edit Profile Modal ───────────────────────────────────────────────── */}
      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentName={displayName}
        currentAvatar={avatarEmoji}
        currentStyle={favoriteStyleDB}
        currentXP={xp}
        currentBio={bioDB}
        currentGender={genderDB}
        currentWeight={weightKgDB}
        currentHeight={heightCmDB}
        onSaved={({ username, avatar_url, favorite_style }) => {
          setDisplayName(username);
          setAvatarEmoji(avatar_url);
          setFavoriteStyleDB(favorite_style);
          // Notify Navbar/community leaderboard
          window.dispatchEvent(new CustomEvent("chevapp:profile_updated", {
            detail: { username, avatar_url, favorite_style },
          }));
        }}
      />
    </div>
  );
}
