"use client";

// ── LandingPage · / (Sprint 26c · DS-migrated) ───────────────────────────────
// Top-level /[locale] landing page. The hero is intentionally locked to the
// ugljen (dark) palette — it's a brand moment, not a theme-aware surface.
// Everything below the hero respects mode switching via semantic tokens.
//
// Sprint 26c changes:
//   - rgb(var(--...)) inline styles → semantic Tailwind aliases
//     (bg-background, bg-surface, text-foreground, text-muted, border-border,
//     bg-primary / text-primary / border-primary).
//   - style={{fontFamily:"Oswald"}} → font-display class.
//   - onMouseEnter/Leave border flips → hover: / group-hover: classes.
//   - Raw hex dropped: #0d0d0d → bg-ugljen-bg, #F5F5DC → text-cream /
//     cream-fg opacity variants, #D35400 → bg-primary / border-primary / vatra,
//     #ed7a30 → text-vatra-hover (the hero-accent token per tailwind config
//     §vatra.hover comment — "hover, glows, hero").
//   - FeatureCard highlight styling collapsed into className branches.
//   - Step cards, Merak section, CTA banner, footer all tokenized.
//   - rounded-2xl / rounded-xl → rounded-card / rounded-chip.
//   - Emoji in hero stats, step cards, and feature-card badges kept as
//     placeholders with TODO(icons) comments for Sprint 27 brand-icon swap.
// ────────────────────────────────────────────────────────────────────────────────

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  MapPin, ChefHat, Users, Music, ArrowRight,
  Flame, Star, TrendingUp,
} from "lucide-react";
import { MerakCorner } from "@/components/home/MerakCorner";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const t    = useTranslations("landing");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ═══════════════════════════════════════════════════════════════
          HERO — intentionally always dark (brand identity).
          Uses ugljen-bg + cream tokens rather than mode-aware aliases;
          this surface should look identical in both themes.
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center bg-ugljen-bg">
        {/* Background layers */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-ember-glow pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            // Decorative vatra grid — --primary is locked to vatra in both
            // modes, so this stays visually identical.
            backgroundImage:
              "linear-gradient(rgb(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill border border-vatra/30 bg-vatra/10 text-vatra-hover text-sm font-medium mb-8">
              <Flame className="w-4 h-4 animate-ember-pulse" />
              <span>Tvoj digitalni kompas za savršen griz</span>
            </div>

            {/* Heading — always cream on dark hero */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-none tracking-tight mb-6">
              <span className="block text-cream">
                {t("heroTitle").split(" ").slice(0, -2).join(" ")}
              </span>
              <span className="block text-gradient-fire">
                {t("heroTitle").split(" ").slice(-2).join(" ")}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-cream/60 mb-10 max-w-xl leading-relaxed">
              {t("heroSubtitle")}
            </p>

            {/* CTA — hero always dark, so both buttons keep cream-on-dark styling */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/finder" className="btn-primary text-base glow-orange">
                <MapPin className="w-5 h-5" />
                {t("ctaFinder")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              {/* Secondary — pure hover-state classes, no JS mouse handlers. */}
              <Link
                href="/kitchen"
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-chip transition-all duration-200 text-base",
                  "border border-cream/25 text-cream/80 bg-transparent",
                  "hover:border-cream/60 hover:text-cream",
                )}
              >
                <ChefHat className="w-5 h-5" />
                {t("ctaKitchen")}
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 flex flex-wrap gap-8">
              {[
                // TODO(icons): swap 🍖 👥 🏙️ for brand <Cevapi> <Zajednica> <Finder>
                { value: "120+", label: t("statsRestaurants"), icon: "🍖" },
                { value: "8.4k", label: t("statsUsers"),       icon: "👥" },
                { value: "24",   label: t("statsCities"),      icon: "🏙️" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{icon}</span>
                  <div>
                    <div className="font-display text-2xl font-bold text-vatra-hover">
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

        {/* Decorative spinning ring */}
        <div className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[40%] items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80">
            <div className="absolute inset-0 rounded-full border border-vatra/20 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-vatra/10 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute inset-16 rounded-full bg-vatra/5 flex items-center justify-center">
              {/* TODO(icons): swap 🥩 for brand <Rostilj> */}
              <span className="text-8xl animate-ember-pulse" aria-hidden="true">🥩</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-surface/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4 text-foreground">
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
      <section className="py-24 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4 text-foreground">
              Kako funkcionira?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              // TODO(icons): swap emoji for brand <Finder> <Ocjena> <XP> when Sprint 27 lands
              { step: "01", icon: "📍", title: "Pronađi", desc: "Otvori Ćevap Finder, filtriraj po stilu i gradu, pogledaj Lepinja ocjene." },
              { step: "02", icon: "⭐", title: "Ocijeni",  desc: "Ostavi brzopletnu recenziju s 🧅🔥🥯 emojijima i skupljaj XP bodove." },
              { step: "03", icon: "🏆", title: "Osvoji",   desc: "Penjaj se na Leaderboard, otključaj bedževe i postani Maestro Roštilja." },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className={cn(
                  "relative flex flex-col items-center text-center p-6 rounded-card border transition-colors",
                  "border-border bg-surface/40 hover:border-primary/40",
                )}
              >
                <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
                <div className="font-display absolute top-4 right-4 text-6xl font-bold leading-none select-none text-primary/20">
                  {step}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
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
      <section className="py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="ember-divider mx-auto" />
            <h2 className="section-title mt-4 text-foreground">
              Merak Rječnik
            </h2>
            <p className="text-sm mt-2 max-w-md mx-auto text-muted">
              Svaki dan nova riječ iz duše balkanske kulture i kuhinje. Pređi kroz rječnik i otkrij zaboravljene pojmove.
            </p>
          </div>
          <MerakCorner />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA BANNER — vatra, works in both modes (primary brand moment)
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-primary relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-cream uppercase mb-4">
            Spreman si na Savršen Griz?
          </h2>
          <p className="text-cream/80 text-lg mb-8">
            Registriraj se besplatno i postani dio ChevApp zajednice.
          </p>
          <Link
            href="/community"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-chip transition-all duration-200 text-base",
              "border border-cream/50 text-cream",
              "hover:border-cream hover:bg-cream/10",
            )}
          >
            {t("ctaSecondary")} <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER — theme-aware
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-surface/60 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8">

            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-chip bg-primary flex items-center justify-center">
                  <Flame className="w-4 h-4 text-primary-fg" />
                </div>
                <span className="font-display text-lg font-bold tracking-widest uppercase text-foreground">
                  Chev<span className="text-primary">App</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
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

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} ChevApp. Sva prava pridržana.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted">
              <Star className="w-3 h-3 text-primary" />
              <TrendingUp className="w-3 h-3 text-primary" />
              {/* TODO(icons): emoji 🔥 stays — it's editorial copy, not UI chrome */}
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
      className={cn(
        "group relative flex flex-col gap-4 p-6 md:p-8 rounded-card border transition-all duration-300 hover:scale-[1.01]",
        highlight
          ? "border-primary/40 bg-primary/5 hover:border-primary/70"
          : "border-border bg-surface/40 hover:border-primary/30",
      )}
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-12 h-12 rounded-chip flex items-center justify-center",
            highlight ? "bg-primary/15 text-primary" : "bg-border/50 text-muted",
          )}
        >
          {icon}
        </div>
        {/* TODO(icons): feature-card badges use emoji placeholders until Sprint 27 */}
        <span className="text-sm font-medium lepinja-badge" aria-hidden="true">{badge}</span>
      </div>

      {/* Text */}
      <div>
        <h3 className="font-display text-2xl font-bold mb-2 transition-colors text-foreground">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          {description}
        </p>
      </div>

      {/* CTA */}
      {cta && (
        <div className="flex items-center gap-2 text-sm font-semibold mt-auto text-primary">
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
      <h4 className="font-semibold text-xs uppercase tracking-widest mb-3 text-muted">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(({ href, label }, i) => (
          <li key={`${label}-${i}`}>
            <Link
              href={href}
              className="text-sm text-muted transition-colors hover:text-primary"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
