import { useTranslations } from "next-intl";
import { Shield, Users, UtensilsCrossed, FileText, Plus, Database } from "lucide-react";

// In a real implementation, this page would check the user's role via Supabase Auth.
// For now it renders the admin shell UI.

const MOCK_STATS = [
  { label: "Restorani", value: "6", icon: "🍖", trend: "+2 ovaj tjedan" },
  { label: "Korisnici", value: "12", icon: "👥", trend: "+5 ovaj tjedan" },
  { label: "Objave", value: "3", icon: "📝", trend: "+3 ovaj tjedan" },
  { label: "Recenzije", value: "0", icon: "⭐", trend: "Čeka prvu recenziju" },
];

export default function AdminPage() {
  const t = useTranslations("admin");

  return (
    <div className="min-h-screen bg-charcoal dark:bg-ugljen-bg text-cream">
      {/* Header */}
      <div className="border-b border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/50 dark:bg-ugljen-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-cream uppercase tracking-wide" style={{ fontFamily: "Oswald, sans-serif" }}>
                {t("title")}
              </h1>
              <p className="text-cream/40 text-xs mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Role warning */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300/80 text-sm">
            <strong>Role check:</strong> Ova stranica treba provjeru uloge korisnika (admin/moderator) putem Supabase Auth. Za produkciju, dodaj middleware provjeru.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_STATS.map(({ label, value, icon, trend }) => (
            <div
              key={label}
              className="rounded-xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30 p-5"
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-3xl font-bold text-cream mb-0.5" style={{ fontFamily: "Oswald, sans-serif" }}>
                {value}
              </div>
              <div className="text-sm text-cream/60 font-medium">{label}</div>
              <div className="text-xs text-burnt-orange-400/70 mt-1">{trend}</div>
            </div>
          ))}
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restaurants panel */}
          <AdminPanel
            icon={<UtensilsCrossed className="w-5 h-5 text-burnt-orange-400" />}
            title={t("restaurants")}
            action={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-burnt-orange-500/20 text-burnt-orange-400 hover:bg-burnt-orange-500/30 transition-colors text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" />
                {t("addRestaurant")}
              </button>
            }
          >
            <p className="text-cream/40 text-sm">6 restorana u bazi · 6 verificiranih</p>
            <div className="mt-3">
              <SeedButton />
            </div>
          </AdminPanel>

          {/* Users panel */}
          <AdminPanel
            icon={<Users className="w-5 h-5 text-blue-400" />}
            title={t("users")}
            action={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-semibold">
                {t("manageRoles")}
              </button>
            }
          >
            <div className="space-y-2 mt-1">
              {[
                { name: "Admin", role: "admin", emoji: "👑" },
                { name: "Moderator_1", role: "moderator", emoji: "🛡️" },
                { name: "User_1", role: "user", emoji: "👤" },
              ].map(({ name, role, emoji }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-charcoal-700/50 dark:border-ugljen-border/50 last:border-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{emoji}</span>
                    <span className="text-cream/70">{name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    role === "admin" ? "bg-red-500/20 text-red-400" :
                    role === "moderator" ? "bg-blue-500/20 text-blue-400" :
                    "bg-charcoal-700 text-cream/40"
                  }`}>
                    {role}
                  </span>
                </div>
              ))}
            </div>
          </AdminPanel>

          {/* Posts panel */}
          <AdminPanel
            icon={<FileText className="w-5 h-5 text-green-400" />}
            title={t("posts")}
          >
            <p className="text-cream/40 text-sm">Nema objava za pregled.</p>
          </AdminPanel>

          {/* DB panel */}
          <AdminPanel
            icon={<Database className="w-5 h-5 text-purple-400" />}
            title="Baza podataka"
          >
            <p className="text-cream/40 text-sm mb-3">Upravljanje tabelama i podacima.</p>
            <SeedButton />
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-cream" style={{ fontFamily: "Oswald, sans-serif" }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SeedButton() {
  return (
    <form action="/api/seed" method="POST" target="_blank">
      <button
        type="submit"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-burnt-orange-500/30 bg-burnt-orange-500/10 text-burnt-orange-400 hover:bg-burnt-orange-500/20 transition-colors text-xs font-semibold"
      >
        <Database className="w-3.5 h-3.5" />
        Seed 6 legendarnih restorana
      </button>
    </form>
  );
}
