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
        border: "rgb(var(--border) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",

        // --- Ugljen Dark Mode Palette ---
        ugljen: {
          bg: "#0D0D0D",
          surface: "#1A1A1A",
          border: "#2a2a2a",
          text: "#B0B0B0",
          "text-strong": "#D4D4D4",
          accent: "#A04000",
          "accent-hover": "#C04800",
        },

        // --- Somun & Wood Light Mode Palette ---
        somun: {
          bg: "#F9F7F2",
          surface: "#E5E1D8",
          border: "#D6D0C7",
          text: "#1C1917",
          "text-muted": "#78716C",
          accent: "#D97706",
          "accent-hover": "#B45309",
          "accent-light": "#FEF3C7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Oswald", "Impact", "sans-serif"],
      },
      backgroundImage: {
        "hero-pattern":
          "radial-gradient(ellipse at top, #1A1A1A 0%, #0D0D0D 100%)",
        "ember-glow":
          "radial-gradient(circle at 50% 80%, rgba(211,84,0,0.15) 0%, transparent 60%)",
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
