import type { CevapStyle } from "@/types";

/**
 * Maps CevapStyle display values → their i18n JSON keys.
 * NEVER use .toLowerCase() — special characters (ć, č, š) break the lookup.
 */
export const STYLE_TO_I18N_KEY: Record<CevapStyle, string> = {
  "Sarajevski":  "sarajevski",
  "Banjalučki":  "banjalucki",
  "Travnički":   "travnicki",
  "Leskovački":  "leskovacki",
  "Ostalo":      "ostalo",
};

export interface StyleInfo {
  value: CevapStyle;
  emoji: string;
  color: string; // Tailwind class
  description: string; // Croatian
}

export const CEVAP_STYLES: StyleInfo[] = [
  {
    value: "Sarajevski",
    emoji: "🕌",
    color: "bg-burnt-orange-500",
    description: "Tanje, od mješavine govedine i janjetine. Poslužuju se u somunu sa sirovim lukom i kajmakom.",
  },
  {
    value: "Banjalučki",
    emoji: "🌊",
    color: "bg-blue-600",
    description: "Deblji, sočniji — karakteristična mješavina s više loja. Somun je bitan koliko i meso.",
  },
  {
    value: "Travnički",
    emoji: "⛰️",
    color: "bg-green-700",
    description: "Janjeći ćevapi s posebnom aromom travničkog sira. Tradicija iz Lašve.",
  },
  {
    value: "Leskovački",
    emoji: "🌶️",
    color: "bg-red-600",
    description: "Pikantni pljeskavice i ćevapi iz srca srpskog roštilja. Pravi karakter.",
  },
  {
    value: "Ostalo",
    emoji: "🔥",
    color: "bg-charcoal-600",
    description: "Regionalni stilovi koji ne spadaju u klasičnih četiri.",
  },
];

export const PORTION_OPTIONS = [
  { value: 5, label: "5 kom" },
  { value: 10, label: "10 kom" },
  { value: 15, label: "15 kom" },
];
