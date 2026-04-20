import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═════════════════════════════════════════════════════════════════════
        //  ChevApp Design System — Sprint 20 (canonical tokens)
        //  See DESIGN_SYSTEM.md for usage rules. Each token has ONE job.
        // ═════════════════════════════════════════════════════════════════════

        // ── VATRA · Primary CTA ──────────────────────────────────────────────
        // Main buttons, icons, active nav, Finder, the-thing-users-MUST-do.
        // Always #D35400 across BOTH modes (per spec). Never white, never gray.
        vatra: {
          DEFAULT: "#D35400",   // burnt-orange-500 — primary / icons / CTAs
          hover:   "#FF6B00",   // brand-orange    — hover, glows, hero
          pressed: "#A04000",   // burnt-orange-600 — pressed, deep accents
        },

        // ── AMBER · XP / Gamification ONLY — never on buttons ────────────────
        "amber-xp": "#D97706",

        // ── EMBER · Success / Confirmed ──────────────────────────────────────
        // Review submitted, route saved, XP earned animation, completed states
        "ember-green": "#16A34A",

        // ── ŽAR · Alert / Error / Destructive ────────────────────────────────
        // Validation errors, sign out, destructive actions, failed states
        "zar-red": "#E63946",

        // ── SOMUN PURPLE · Passive status badges ONLY — never interactive ───
        // "Objavljeno", "Novo", "Trending"
        "somun-purple": "#987FE8",

        // ── UGLJEN · Dark mode surfaces ──────────────────────────────────────
        ugljen: {
          bg:      "#0D0D0D",   // app background
          surface: "#1A1A1A",   // card surface
          border:  "#2A2A2A",   // dividers, borders
          text:    "#B0B0B0",   // body text on dark
          "text-strong": "#D4D4D4",
          // kept for back-compat
          accent: "#A04000",
          "accent-hover": "#C04800",
        },

        // ── SOMUN · Light mode surfaces ──────────────────────────────────────
        somun: {
          bg:      "#F9F7F2",   // app background (warm cream)
          surface: "#FFFFFF",   // card surface
          border:  "#D6D0C7",   // dividers, borders
          text:    "#1C1917",   // body text on light
          "text-muted": "#78716C",
          cream:   "#F5F5DC",   // hero text on dark
          // kept for back-compat
          accent: "#D97706",
          "accent-hover": "#B45309",
          "accent-light": "#FEF3C7",
        },

        // ── Legacy aliases (keep so older components don't break) ───────────
        "brand-orange": "#FF6B00",
        "brand-red":    "#E63946",
        "brand-dark":   "#121212",
        "app-bg":       "#F9FAFB",

        // --- Industrial & Traditional Palette ---
        charcoal: {
          DEFAULT: "#1A1A1A",
          50: "#f5f5f5",
          100: "#e8e8e8",
          200: "#c5c5c5",
          300: "#a0a0a0",
          400: "#737373",
          500: "#525252",
          600: "#3d3d3d",
          700: "#2e2e2e",
          800: "#1A1A1A",
          900: "#0d0d0d",
        },
        "burnt-orange": {
          DEFAULT: "#D35400",
          50: "#fdf3ec",
          100: "#fce4cc",
          200: "#f8c498",
          300: "#f39e5e",
          400: "#ed7a30",
          500: "#D35400",
          600: "#b84a00",
          700: "#963c00",
          800: "#732e00",
          900: "#4f1f00",
        },
        cream: {
          DEFAULT: "#F5F5DC",
          50: "#fefef8",
          100: "#fdfdf0",
          200: "#fafade",
          300: "#f5f5dc",
          400: "#eeeebc",
          500: "#e2e27a",
          600: "#cccc3a",
          700: "#999920",
          800: "#666615",
          900: "#33330a",
        },
        // --- Semantic CSS-variable tokens (matches :root / .dark vars) ---
        // Usage: bg-background, text-foreground, bg-surface, border-border,
        //        text-muted, bg-primary, text-primary, text-primary-fg
        primary:    "rgb(var(--primary)    / <alpha-value>)",
        "primary-fg": "rgb(var(--primary-foreground) / <alpha-value>)",
        border:     "rgb(var(--border)     / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted:      "rgb(var(--muted)      / <alpha-value>)",
        surface:    "rgb(var(--surface)    / <alpha-value>)",

        // Note: `ugljen.*` and `somun.*` mode-specific scales are defined
        // above in the Design System block — don't duplicate here.
      },
      borderRadius: {
        // ── Design-system canonical radius ───────────────────────────────────
        // card = 20px (never < 16px for card-like surfaces)
        card:  "20px",
        pill:  "9999px",
        chip:  "12px",
        // back-compat
        "extra-rounded": "20px",
      },
      boxShadow: {
        // ── Two levels only — never mix ──────────────────────────────────────
        // soft-md → cards, chips, inline surfaces
        // soft-xl → modals, popovers, drawers
        "soft-md": "0 4px 16px -2px rgba(0,0,0,0.07), 0 2px 6px -2px rgba(0,0,0,0.04)",
        "soft-xl": "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)",
        "brand":   "0 4px 14px 0 rgba(255,107,0,0.30)",
      },
      fontFamily: {
        // Inter — body, labels, captions (ONLY). Never for h1/h2/h3.
        sans:    ["Inter",  "system-ui", "sans-serif"],
        // Oswald — h1/h2/h3/card titles (ONLY). Never for body.
        display: ["Oswald", "Impact",    "sans-serif"],
      },
      fontSize: {
        // ── Design-system type scale — jumps must be dramatic ────────────────
        //   hero    80px · Oswald 700 · -1px tracking       (min 72px)
        //   section 48px · Oswald 600 · 1px tracking · UPPER
        //   card    32px · Oswald 600 · 0.5px tracking      (min 28px)
        //   subsec  18px · Inter 600
        //   body    15px · Inter 400 · 1.7 line-height
        //   label   11px · Inter 600 · 1.5px tracking · UPPER
        hero:    ["80px",  { lineHeight: "0.95", letterSpacing: "-0.0125em", fontWeight: "700" }],
        section: ["48px",  { lineHeight: "1.05", letterSpacing: "0.02em",    fontWeight: "600" }],
        "card-title": ["32px", { lineHeight: "1.1",  letterSpacing: "0.005em", fontWeight: "600" }],
        subsec:  ["18px",  { lineHeight: "1.4",  letterSpacing: "0",        fontWeight: "600" }],
        body:    ["15px",  { lineHeight: "1.7",  letterSpacing: "0",        fontWeight: "400" }],
        label:   ["11px",  { lineHeight: "1.4",  letterSpacing: "0.136em",  fontWeight: "600" }],
      },
      backgroundImage: {
        "hero-pattern":
          "radial-gradient(ellipse at top, #1A1A1A 0%, #0D0D0D 100%)",
        "ember-glow":
          "radial-gradient(circle at 50% 80%, rgba(211,84,0,0.15) 0%, transparent 60%)",
      },
      // Extended z-index scale (Tailwind's default stops at 50)
      zIndex: {
        "60":  "60",
        "70":  "70",
        "80":  "80",
        "90":  "90",
        "100": "100",
      },
      // Minimum touch-target height (WCAG 2.5.5 / Apple HIG recommend 44–48px)
      minHeight: {
        touch: "48px",
        "touch-sm": "44px",
      },
      // Safe-area spacing tokens — use pb-safe, pt-safe, etc.
      spacing: {
        safe: "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      animation: {
        "ember-pulse": "ember-pulse 3s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
      keyframes: {
        "ember-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
