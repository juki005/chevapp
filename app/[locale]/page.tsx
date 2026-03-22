import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  MapPin, ChefHat, Users, Music, ArrowRight,
  Flame, Star, TrendingUp,
} from "lucide-react";
import { MerakCorner } from "@/components/home/MerakCorner";

export default function LandingPage() {
  const t    = useTranslations("landing");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">

      {/* ═══════════════════════════════════════════════════════════════
          HERO — intentionally always dark (brand identity)
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center bg-[#0d0d0d]">
        {/* Background layers */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-ember-glow pointer-events-none" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D35400]/30 bg-[#D35400]/10 text-[#ed7a30] text-sm font-medium mb-8">
              <Flame className="w-4 h-4 animate-ember-pulse" />
              <span>Tvoj digitalni kompas za savršen griz</span>
            </div>

            {/* Heading — always light text on dark hero */}
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-none tracking-tight mb-6"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              <span className="block text-[#F5F5DC]">
                {t("heroTitle").split(" ").slice(0, -2).join(" ")}
              </span>
              <span className="block text-gradient-fire">
                {t("heroTitle").split(" ").slice(-2).join(" ")}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#F5F5DC]/60 mb-10 max-w-xl leading-relaxed">
              {t("heroSubtitle")}
            </p>

            {/* CTA — hero always dark, so force light text on both buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/finder" className="btn-primary text-base glow-orange">
                <MapPin className="w-5 h-5" />
                {t("ctaFinder")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              {/* Secondary button — explicit light styling since hero is always dark */}
              <Link
                href="/kitchen"
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 text-base"
                style={{
                  border: "1px solid rgba(245,245,220,0.25)",
                  color: "rgba(245,245,220,0.8)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,245,220,0.6)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#F5F5DC";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,245,220,0.25)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(245,245,220,0.8)";
                }}
              >
                <ChefHat className="w-5 h-5" />
                {t("ctaKitchen")}
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 flex flex-wrap gap-8">
              {[
                { value: "120+", label: t("statsRestaurants"), icon: "🍖" },
                { value: "8.4k", label: t("statsUsers"),       icon: "👥" },
                { value: "24",   label: t("statsCities"),      icon: "🏙️" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div
                      className="text-2xl font-bold text-[#ed7a30]"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-[#F5F5DC]/40 tracking-wide uppercase">
                      {label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative spinning ring */}
        <div className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[40%] items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80">
            <div className="absolute inset-0 rounded-full border border-[#D35400]/20 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-[#D35400]/10 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-16 rounded-full bg-[#D35400]/5 flex items-center justify-center">
              <span className="text-8xl animate-ember-pulse">🥩</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[rgb(var(--surface)/0.5)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4" style={{ color: "rgb(var(--foreground))" }}>
              {t("features")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard href="/finder"    icon={<MapPin   className="w-7 h-7" />} title={t("finderTitle")}    description={t("finderDesc")}    badge="🥯🥯🥯🥯🥯"       highlight cta={t("ctaFinder")} />
            <FeatureCard href="/kitchen"   icon={<ChefHat  className="w-7 h-7" />} title={t("kitchenTitle")}   description={t("kitchenDesc")}   badge="🔥 Recepti"        highlight cta={t("ctaKitchen")} />
            <FeatureCard href="/community" icon={<Users    className="w-7 h-7" />} title={t("communityTitle")} description={t("communityDesc")} badge="👥 Zajednica" />
            <FeatureCard href="/jukebox"   icon={<Music    className="w-7 h-7" />} title={t("jukeboxTitle")}   description={t("jukeboxDesc")}   badge="🎵 3 playliste" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[rgb(var(--background))]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4" style={{ color: "rgb(var(--foreground))" }}>
              Kako funkcionira?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: "📍", title: "Pronađi", desc: "Otvori Ćevap Finder, filtriraj po stilu i gradu, pogledaj Lepinja ocjene." },
              { step: "02", icon: "⭐", title: "Ocijeni",  desc: "Ostavi brzopletnu recenziju s 🧅🔥🥯 emojijima i skupljaj XP bodove." },
              { step: "03", icon: "🏆", title: "Osvoji",   desc: "Penjaj se na Leaderboard, otključaj bedževe i postani Maestro Roštilja." },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl border transition-colors group"
                style={{
                  borderColor: "rgb(var(--border))",
                  background:  "rgb(var(--surface) / 0.4)",
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "rgb(var(--primary) / 0.4)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "rgb(var(--border))"}
              >
                <div className="text-5xl mb-4">{icon}</div>
                <div
                  className="absolute top-4 right-4 text-6xl font-bold leading-none select-none"
                  style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--primary) / 0.2)" }}
                >
                  {step}
                </div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MERAK RJEČNIK — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[rgb(var(--surface)/0.3)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4" style={{ color: "rgb(var(--foreground))" }}>
              Merak Rječnik
            </h2>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "rgb(var(--muted))" }}>
              Svaki dan nova riječ iz duše balkanske kulture i kuhinje. Pređi kroz rječnik i otkrij zaboravljene pojmove.
            </p>
          </div>
          <MerakCorner />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA BANNER — orange, works in both modes
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-[#D35400] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl font-bold text-[#F5F5DC] uppercase mb-4"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Spreman si na Savršen Griz?
          </h2>
          <p className="text-[#F5F5DC]/80 text-lg mb-8">
            Registriraj se besplatno i postani dio ChevApp zajednice.
          </p>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 text-base"
            style={{ border: "1px solid rgba(245,245,220,0.5)", color: "#F5F5DC" }}
          >
            {t("ctaSecondary")} <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="border-t py-12 px-6"
        style={{
          borderColor:     "rgb(var(--border))",
          backgroundColor: "rgb(var(--surface) / 0.6)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8">

            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#D35400] flex items-center justify-center">
                  <Flame className="w-4 h-4 text-[#F5F5DC]" />
                </div>
                <span
                  className="text-lg font-bold tracking-widest uppercase"
                  style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}
                >
                  Chev<span style={{ color: "rgb(var(--primary))" }}>App</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
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
                { href: "/kitchen",          label: "Recepti"      },
                { href: "/academy",          label: "Akademija"    },
                { href: "/academy#burnoff",  label: "Burn-off Calc" },
              ]} />
              <FooterColumn title={t("footerLegal")} links={[
                { href: "#", label: t("footerPrivacy") },
                { href: "#", label: t("footerTerms")   },
              ]} />
            </div>
          </div>

          <div
            className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3"
            style={{ borderColor: "rgb(var(--border))" }}
          >
            <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              © {new Date().getFullYear()} ChevApp. Sva prava pridržana.
            </p>
            <div className="flex items-center gap-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              <Star className="w-3 h-3" style={{ color: "rgb(var(--primary))" }} />
              <TrendingUp className="w-3 h-3" style={{ color: "rgb(var(--primary))" }} />
              <span>Made with 🔥 on the Balkan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({
  href, icon, title, description, badge, highlight = false, cta,
}: {
  href:        string;
  icon:        React.ReactNode;
  title:       string;
  description: string;
  badge:       string;
  highlight?:  boolean;
  cta?:        string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 p-6 md:p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
      style={{
        borderColor: highlight ? "rgba(211,84,0,0.4)" : "rgb(var(--border))",
        background:  highlight ? "rgba(211,84,0,0.05)" : "rgb(var(--surface) / 0.4)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          highlight ? "rgba(211,84,0,0.7)" : "rgb(var(--primary) / 0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          highlight ? "rgba(211,84,0,0.4)" : "rgb(var(--border))";
      }}
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: highlight ? "rgba(211,84,0,0.15)" : "rgb(var(--border) / 0.5)",
            color:      highlight ? "rgb(var(--primary))" : "rgb(var(--muted))",
          }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium lepinja-badge">{badge}</span>
      </div>

      {/* Text */}
      <div>
        <h3
          className="text-2xl font-bold mb-2 transition-colors"
          style={{ fontFamily: "Oswald, sans-serif", color: "rgb(var(--foreground))" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
          {description}
        </p>
      </div>

      {/* CTA */}
      {cta && (
        <div
          className="flex items-center gap-2 text-sm font-semibold mt-auto"
          style={{ color: "rgb(var(--primary))" }}
        >
          <span>{cta}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4
        className="font-semibold text-xs uppercase tracking-widest mb-3"
        style={{ color: "rgb(var(--muted))" }}
      >
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(({ href, label }, i) => (
          <li key={`${label}-${i}`}>
            <Link
              href={href}
              className="text-sm transition-colors hover:text-[rgb(var(--primary))]"
              style={{ color: "rgb(var(--muted))" }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
