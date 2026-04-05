export interface RecipeStep {
  step: number;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  difficulty: "easy" | "medium" | "hard";
  prepTime: string;
  cookTime: string;
  servings: number;
  style: string;
  desc: string;
  ingredients: { amount: string; item: string }[];
  steps: RecipeStep[];
  tips: string[];
  youtubeQuery: string; // search query for YouTube suggestions
  video_url?: string | null;
  category?:  string;   // "Glavno jelo" | "Prilog" | "Dodatak" — from DB
  is_pinned?: boolean;  // admin-pinned recipes float to the top with a badge
}

export const RECIPES: Recipe[] = [
  {
    id: "sarajevski-cevapi",
    title: "Sarajevski Ćevapi",
    emoji: "🕌",
    difficulty: "medium",
    prepTime: "20 min",
    cookTime: "15 min",
    servings: 4,
    style: "Sarajevski",
    desc: "Klasična mješavina govedine i janjetine s kiselom salamurom i lukom.",
    ingredients: [
      { amount: "500g", item: "mljevena junetina (85% meso)" },
      { amount: "300g", item: "mljevena janjetina" },
      { amount: "1 žlica", item: "sitno sjeckani luk" },
      { amount: "1 žličica", item: "sol" },
      { amount: "½ žličice", item: "crni papar" },
      { amount: "½ žličice", item: "bikarbonat sode" },
      { amount: "1 žlica", item: "kisela voda (gazirana)" },
      { amount: "za posluživanje", item: "somun, sirovi luk, kajmak, ajvar" },
    ],
    steps: [
      { step: 1, text: "Pomiješaj mljevenu junetinu i janjetinu. Dodaj sol, papar i bikarbonat sode." },
      { step: 2, text: "Dodaj sjeckani luk i kiselu vodu. Miješaj rukama 5 minuta dok smjesa ne postane glatka i ljepljiva." },
      { step: 3, text: "Poklopi i ostavi u hladnjaku minimalno 2 sata (idealno preko noći)." },
      { step: 4, text: "Oblikuj ćevape: valjčić dužine ~8-10 cm, promjera ~2 cm. Koristeći navlažene ruke." },
      { step: 5, text: "Peči na jako vrućem roštilju ili tavi od lijevanog željeza, 2-3 minute s svake strane." },
      { step: 6, text: "Posluži odmah u somunu s kiselim lukom i kajmakom." },
    ],
    tips: [
      "Ključ je u omjeru: 60% junetina, 40% janjetina.",
      "Bikarbonat sode daje mekoću — ne preskači!",
      "Roštilj mora biti VRUĆI da se ne lijepe.",
      "Nikada ne pritiskaj ćevap lopaticom — gubi sočnost.",
    ],
    youtubeQuery: "sarajevski cevapi recept",
  },
  {
    id: "domaci-somun",
    title: "Domaći Somun",
    emoji: "🥯",
    difficulty: "hard",
    prepTime: "30 min + 2h dizanje",
    cookTime: "20 min",
    servings: 6,
    style: "Opće",
    desc: "Mekani, pahuljasti somun koji se peče na kamenu.",
    ingredients: [
      { amount: "500g", item: "bijelo glatko brašno" },
      { amount: "300ml", item: "mlaka voda" },
      { amount: "7g", item: "suhi kvasac (1 vrećica)" },
      { amount: "1 žličica", item: "šećer" },
      { amount: "1 žličica", item: "sol" },
      { amount: "2 žlice", item: "maslinovo ulje" },
      { amount: "1", item: "jaje (za premaz)" },
      { amount: "po ukusu", item: "nigella sjemenke (crni sezam)" },
    ],
    steps: [
      { step: 1, text: "Otopi kvasac i šećer u mlakoj vodi. Čekaj 10 minuta dok se ne zapjeni." },
      { step: 2, text: "U veliku zdjelu prosij brašno, dodaj sol. Napravi udubinu u sredini." },
      { step: 3, text: "Ulij kvasac i ulje. Gnjeci tijesto 10 minuta dok nije glatko i elastično." },
      { step: 4, text: "Poklopi vlažnom krpom. Ostavi na toplom 1-1.5 sat dok ne udvostruči volumen." },
      { step: 5, text: "Podijeli na 6 jednakih kuglica. Oblikuj u diskove debljine 1.5 cm." },
      { step: 6, text: "Premazi jajetom. Pospi nigella sjemenkama. Ostavi 30 minuta." },
      { step: 7, text: "Peči na 230°C (predgrijana pećnica s kamenom) 15-20 minuta dok nije zlatno smeđ." },
    ],
    tips: [
      "Kamen za pečenje daje autentičnu koru — vrijedi investicija.",
      "Vodena para u pećnici čini somun mekanim iznutra.",
      "Somun je gotov kad zvuči šuplje kad kucneš po dnu.",
    ],
    youtubeQuery: "domaći bosanski somun recept",
  },
  {
    id: "kajmak",
    title: "Domaći Kajmak",
    emoji: "🧈",
    difficulty: "easy",
    prepTime: "10 min",
    cookTime: "0 min + odmaranje",
    servings: 8,
    style: "Prilog",
    desc: "Kremasti kajmak od svježeg sira i kiselog vrhnja.",
    ingredients: [
      { amount: "200g", item: "masni svježi sir (skuta)" },
      { amount: "100g", item: "kiselo vrhnje (20% masti)" },
      { amount: "50g", item: "mascarpone ili Philadelphia" },
      { amount: "½ žličice", item: "sol" },
      { amount: "po ukusu", item: "svježi vlasac (opcijalno)" },
    ],
    steps: [
      { step: 1, text: "Sve sastojke izvadi iz hladnjaka 30 min unaprijed — sobna temperatura je ključ." },
      { step: 2, text: "Miješaj svježi sir vilicom dok ne postane glatka pasta bez grudica." },
      { step: 3, text: "Dodaj kiselo vrhnje i mascarpone. Miješaj dok nije kremasto." },
      { step: 4, text: "Začini solju. Stavi u hladnjak minimalno 1 sat prije posluživanja." },
      { step: 5, text: "Posluži na sobnoj temperaturi uz somun i ćevape." },
    ],
    tips: [
      "Pravi kajmak se pravi od sirovog mlijeka — ovo je urbana verzija.",
      "Što masniiji sir, bolji kajmak.",
      "Ne preskači odmaranje u hladnjaku — okusi se spajaju.",
    ],
    youtubeQuery: "domaći kajmak recept sir",
  },
  {
    id: "ljuti-ajvar",
    title: "Domaći Ajvar",
    emoji: "🫑",
    difficulty: "medium",
    prepTime: "30 min",
    cookTime: "1.5h",
    servings: 10,
    style: "Prilog",
    desc: "Pečene paprike i patlidžan, sporo kuhani do savršenstva.",
    ingredients: [
      { amount: "1.5 kg", item: "crvene babure paprike" },
      { amount: "500g", item: "patlidžan" },
      { amount: "4 režnja", item: "češnjak" },
      { amount: "100ml", item: "suncokretovo ulje" },
      { amount: "2 žlice", item: "ocat (9%)" },
      { amount: "po ukusu", item: "sol i šećer" },
      { amount: "1", item: "ljuta papričica (opcijalno za ljuti)" },
    ],
    steps: [
      { step: 1, text: "Paprike i patlidžan peći na roštilju ili u pećnici (200°C) dok koža ne pocrkni." },
      { step: 2, text: "Stavi u vreću 15 minuta — para olakšava guljenje." },
      { step: 3, text: "Oguli kožu, ukloni sjemenke. Procediti da otiče višak tekućine (30 min)." },
      { step: 4, text: "Samljej paprike i patlidžan u pastu (ne previše glatko — tekstura je važna)." },
      { step: 5, text: "U loncu zagrij ulje, dodaj pastu. Kuha se na laganoj vatri 45-60 minuta, miješaj stalno." },
      { step: 6, text: "Dodaj češnjak, ocat, sol i šećer. Kuhaj još 15 minuta." },
      { step: 7, text: "Vruće stavi u steriliziranu staklenku. Čuva se do godinu dana." },
    ],
    tips: [
      "Što duže kuhanje, gušći ajvar — strpljivost se isplati.",
      "Drvena kuhača je obavezna — metal reagira s kiselinom.",
      "Pravi balkan ajvar nema ljutu papriku — to je osobna preferencija.",
    ],
    youtubeQuery: "domaći ajvar recept pečene paprike",
  },
];

// ── Supabase DB row type ───────────────────────────────────────────────────────
// Matches the actual production table schema (columns added gradually via migrations)
export interface DbRecipe {
  id: string;
  slug: string | null;
  // emoji column may be named image_emoji in production
  emoji: string | null;
  image_emoji: string | null;
  title_hr: string;
  title_en: string | null;
  description_hr: string;
  description_en: string | null;
  // difficulty may be English ("easy") or Croatian ("Lako") depending on how the row was created
  difficulty: string;
  category: string;
  prep_time: string | null;
  cook_time: string | null;
  cooking_time: number;
  servings: number;
  style: string | null;
  ingredients: { amount: string; item: string }[] | null;
  steps: RecipeStep[] | null;
  tips: string[] | null;
  youtube_query: string | null;
  video_url: string | null;
  sort_order: number | null;
}

const DIFFICULTY_MAP: Record<string, Recipe["difficulty"]> = {
  // English values (from migrations)
  easy: "easy", medium: "medium", hard: "hard",
  // Croatian values (manually created rows)
  "Lako": "easy", "Srednje": "medium", "Teško": "hard",
};

export function mapDbRecipe(row: DbRecipe, locale: string): Recipe {
  return {
    id: row.slug ?? row.id,
    title: locale === "en" && row.title_en ? row.title_en : row.title_hr,
    emoji: row.image_emoji ?? row.emoji ?? "🍽️",
    difficulty: DIFFICULTY_MAP[row.difficulty] ?? "medium",
    prepTime: row.prep_time ?? "—",
    cookTime: row.cook_time ?? "—",
    servings: row.servings,
    style: row.style ?? "",
    desc: locale === "en" && row.description_en ? row.description_en : row.description_hr,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    tips: row.tips ?? [],
    youtubeQuery: row.youtube_query ?? "",
    video_url: row.video_url ?? null,
    category:  row.category,
    is_pinned: (row as unknown as { is_pinned?: boolean }).is_pinned ?? false,
  };
}

export const YOUTUBE_VIDEOS: Record<string, { title: string; embedId: string; channel: string }[]> = {
  "Sarajevski": [
    { title: "Sarajevski ćevapi — originalni recept", embedId: "dQw4w9WgXcQ", channel: "Balkanska Kuhinja" },
    { title: "Somun — tajne pekarskog zanata", embedId: "dQw4w9WgXcQ", channel: "Domaće & Ukusno" },
    { title: "Kajmak od A do Ž", embedId: "dQw4w9WgXcQ", channel: "Gastro Balkan" },
  ],
  "Banjalučki": [
    { title: "Banjalučki ćevapi — deblji i sočniji", embedId: "dQw4w9WgXcQ", channel: "Banjaluka Kitchen" },
    { title: "Pečenje na roštilju od lijevanog željeza", embedId: "dQw4w9WgXcQ", channel: "Grill Master" },
    { title: "Somun iz krušne peći", embedId: "dQw4w9WgXcQ", channel: "Stara Škola" },
  ],
  default: [
    { title: "Grill masterclass — osnove roštilja", embedId: "dQw4w9WgXcQ", channel: "ChevApp Academy" },
    { title: "Ajvar recept — balkanski klasik", embedId: "dQw4w9WgXcQ", channel: "Domaće & Ukusno" },
    { title: "Meso — odabir i priprema", embedId: "dQw4w9WgXcQ", channel: "Mesar Savjeti" },
  ],
};
