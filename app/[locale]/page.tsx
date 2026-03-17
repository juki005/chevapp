import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  MapPin,
  ChefHat,
  Users,
  Music,
  ArrowRight,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";
import { MerakCorner } from "@/components/home/MerakCorner";

export default function LandingPage() {
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-screen bg-charcoal dark:bg-ugljen-bg text-cream">
      {/* ============================
          HERO SECTION
          ============================ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Background ember glow */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-ember-glow pointer-events-none" />

        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#D35400 1px, transparent 1px), linear-gradient(90deg, #D35400 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-burnt-orange-500/30 bg-burnt-orange-500/10 text-burnt-orange-400 text-sm font-medium mb-8">
              <Flame className="w-4 h-4 animate-ember-pulse" />
              <span>Tvoj digitalni kompas za savršen griz</span>
            </div>

            {/* Main heading */}
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-none tracking-tight mb-6"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              <span className="block text-cream">{t("heroTitle").split(" ").slice(0, -2).join(" ")}</span>
              <span className="block text-gradient-fire">{t("heroTitle").split(" ").slice(-2).join(" ")}</span>
            </h1>

            <p className="text-lg md:text-xl text-cream/60 mb-10 max-w-xl leading-relaxed">
              {t("heroSubtitle")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/finder" className="btn-primary text-base glow-orange">
                <MapPin className="w-5 h-5" />
                {t("ctaFinder")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <Link href="/kitchen" className="btn-secondary text-base">
                <ChefHat className="w-5 h-5" />
                {t("ctaKitchen")}
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-16 flex flex-wrap gap-8">
              {[
                { value: "120+", label: t("statsRestaurants"), icon: "🍖" },
                { value: "8.4k", label: t("statsUsers"), icon: "👥" },
                { value: "24", label: t("statsCities"), icon: "🏙️" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div
                      className="text-2xl font-bold text-burnt-orange-400"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-cream/40 tracking-wide uppercase">
                      {label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative right panel (desktop) */}
        <div className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[40%] items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80">
            <div className="absolute inset-0 rounded-full border border-burnt-orange-500/20 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-burnt-orange-500/10 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-16 rounded-full bg-burnt-orange-500/5 flex items-center justify-center">
              <span className="text-8xl animate-ember-pulse">🥩</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================
          FEATURES SECTION
          ============================ */}
      <section className="py-24 px-6 bg-charcoal-900 dark:bg-ugljen-surface/50">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4">{t("features")}</h2>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ćevap Finder — highlighted */}
            <FeatureCard
              href="/finder"
              icon={<MapPin className="w-7 h-7" />}
              title={t("finderTitle")}
              description={t("finderDesc")}
              badge="🥯🥯🥯🥯🥯"
              highlight
              cta={t("ctaFinder")}
            />

            {/* Master Kuhinja — highlighted */}
            <FeatureCard
              href="/kitchen"
              icon={<ChefHat className="w-7 h-7" />}
              title={t("kitchenTitle")}
              description={t("kitchenDesc")}
              badge="🔥 Recepti"
              highlight
              cta={t("ctaKitchen")}
            />

            {/* Community */}
            <FeatureCard
              href="/community"
              icon={<Users className="w-7 h-7" />}
              title={t("communityTitle")}
              description={t("communityDesc")}
              badge="👥 Zajednica"
            />

            {/* Jukebox */}
            <FeatureCard
              href="/jukebox"
              icon={<Music className="w-7 h-7" />}
              title={t("jukeboxTitle")}
              description={t("jukeboxDesc")}
              badge="🎵 3 playliste"
            />
          </div>
        </div>
      </section>

      {/* ============================
          HOW IT WORKS
          ============================ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4">Kako funkcionira?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "📍",
                title: "Pronađi",
                desc: "Otvori Ćevap Finder, filtriraj po stilu i gradu, pogledaj Lepinja ocjene.",
              },
              {
                step: "02",
                icon: "⭐",
                title: "Ocijeni",
                desc: "Ostavi brzopletnu recenziju s 🧅🔥🥯 emojijima i skupljaj XP bodove.",
              },
              {
                step: "03",
                icon: "🏆",
                title: "Osvoji",
                desc: "Penjaj se na Leaderboard, otključaj bedževe i postani Maestro Roštilja.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/40 group hover:border-burnt-orange-500/40 transition-colors"
              >
                <div className="text-5xl mb-4">{icon}</div>
                <div
                  className="text-burnt-orange-500/30 text-6xl font-bold absolute top-4 right-4 leading-none select-none"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {step}
                </div>
                <h3
                  className="text-xl font-semibold text-cream mb-2"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-cream/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================
          MERAK CORNER
          ============================ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4">Merak Rječnik</h2>
            <p className="text-cream/40 text-sm mt-2 max-w-md mx-auto">
              Svaki dan nova riječ iz duše balkanske kulture i kuhinje. Pređi kroz rječnik i otkrij zaboravljene pojmove.
            </p>
          </div>
          <MerakCorner />
        </div>
      </section>

      {/* ============================
          CTA BANNER
          ============================ */}
      <section className="py-20 px-6 bg-burnt-orange-500 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl font-bold text-cream uppercase mb-4"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Spreman si na Savršen Griz?
          </h2>
          <p className="text-cream/80 text-lg mb-8">
            Registriraj se besplatno i postani dio ChevApp zajednice.
          </p>
          <Link href="/community" className="btn-secondary border-cream/50 text-cream hover:border-cream text-base">
            {t("ctaSecondary")} <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* ============================
          FOOTER
          ============================ */}
      <footer className="bg-charcoal-900 dark:bg-ugljen-bg border-t border-charcoal-700 dark:border-ugljen-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-burnt-orange-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-cream" />
                </div>
                <span
                  className="text-lg font-bold text-cream tracking-widest uppercase"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  Chev<span className="text-burnt-orange-400">App</span>
                </span>
              </div>
              <p className="text-cream/40 text-sm leading-relaxed">
                {t("footerTagline")}
              </p>
            </div>

            {/* Nav links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <FooterColumn title={tNav("finder")} links={[
                { href: "/finder", label: "Ćevap Mapa" },
                { href: "/route-planner", label: "Gastro Ruta" },
              ]} />
              <FooterColumn title={tNav("kitchen")} links={[
                { href: "/kitchen", label: "Recepti" },
                { href: "/academy", label: "Akademija" },
                { href: "/academy#burnoff", label: "Burn-off Calc" },
              ]} />
              <FooterColumn title={t("footerLegal")} links={[
                { href: "#", label: t("footerPrivacy") },
                { href: "#", label: t("footerTerms") },
              ]} />
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-charcoal-700 dark:border-ugljen-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-cream/30 text-xs">
              © {new Date().getFullYear()} ChevApp. Sva prava pridržana.
            </p>
            <div className="flex items-center gap-1 text-cream/30 text-xs">
              <Star className="w-3 h-3 text-burnt-orange-500" />
              <TrendingUp className="w-3 h-3 text-burnt-orange-500" />
              <span>Made with 🔥 on the Balkan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---- Sub-components ----

function FeatureCard({
  href,
  icon,
  title,
  description,
  badge,
  highlight = false,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  highlight?: boolean;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-4 p-6 md:p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
        highlight
          ? "border-burnt-orange-500/40 bg-burnt-orange-500/5 hover:border-burnt-orange-500/70 hover:bg-burnt-orange-500/10"
          : "border-charcoal-700 dark:border-ugljen-border bg-charcoal-800/40 dark:bg-ugljen-surface/30 hover:border-charcoal-600"
      }`}
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            highlight
              ? "bg-burnt-orange-500/20 text-burnt-orange-400"
              : "bg-charcoal-700 dark:bg-ugljen-border text-cream/60"
          }`}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-cream/50 lepinja-badge">{badge}</span>
      </div>

      {/* Text */}
      <div>
        <h3
          className="text-2xl font-bold text-cream mb-2 group-hover:text-burnt-orange-400 transition-colors"
          style={{ fontFamily: "Oswald, sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-cream/50 text-sm leading-relaxed">{description}</p>
      </div>

      {/* CTA arrow */}
      {cta && (
        <div className="flex items-center gap-2 text-burnt-orange-400 text-sm font-semibold mt-auto">
          <span>{cta}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </Link>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-cream/70 font-semibold text-xs uppercase tracking-widest mb-3">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(({ href, label }, index) => (
          <li key={`${label}-${index}`}>
            <Link
              href={href}
              className="text-cream/40 hover:text-burnt-orange-400 transition-colors text-sm"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
