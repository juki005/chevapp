/** Calories per item (approximate) */
export const CALORIE_DATA = {
  cevap:   65,   // per piece (beef/lamb mix, ~30 g)
  lepinja: 220,  // one lepinja / somun
  onion:   15,   // raw onion serving
  kaymak:  120,  // 2 tbsp serving
  ajvar:   35,   // 2 tbsp serving
} as const;

/**
 * Balkan Workout activities — kcal/h values are calibrated for an 80 kg person.
 * At runtime they are scaled linearly with the user's actual body weight.
 */
export const BALKAN_WORKOUTS = [
  {
    key:         "woodChopping",
    name:        "Cijepanje drva",
    emoji:       "🪓",
    kcalPerHour: 480,
    funFact:     "Drvo se ne sječe samo jednom — mora se složiti za zimu!",
  },
  {
    key:         "mowing",
    name:        "Košnja trave",
    emoji:       "🌿",
    kcalPerHour: 420,
    funFact:     "Ručna kosica je prava kardio vježba.",
  },
  {
    key:         "dancing",
    name:        "Kolo",
    emoji:       "💃",
    kcalPerHour: 550,
    funFact:     "Kolo na svadbi može trajati i 3 sata non-stop!",
  },
  {
    key:         "gardening",
    name:        "Kopanje vrta",
    emoji:       "⛏️",
    kcalPerHour: 400,
    funFact:     "Odlično za ramena i leđa.",
  },
  {
    key:         "concreting",
    name:        "Betoniranje",
    emoji:       "🧱",
    kcalPerHour: 600,
    funFact:     "Temelj kuće, temelj zdravlja — ali s ovim ćevapima neće ići brzo.",
  },
] as const;

export type BalkanWorkout = typeof BALKAN_WORKOUTS[number];

/**
 * Total calories for the configured ćevap meal.
 */
export function calculateMealCalories(
  cevapCount: number,
  extras: { lepinja: boolean; onion: boolean; kaymak: boolean; ajvar: boolean },
): number {
  let total = cevapCount * CALORIE_DATA.cevap;
  if (extras.lepinja) total += CALORIE_DATA.lepinja;
  if (extras.onion)   total += CALORIE_DATA.onion;
  if (extras.kaymak)  total += CALORIE_DATA.kaymak;
  if (extras.ajvar)   total += CALORIE_DATA.ajvar;
  return total;
}

/**
 * Minutes needed to burn `calories` at `kcalPerHour`.
 * The base rate is for 80 kg; scales linearly with actual weight.
 */
export function calculateBurnoffMinutes(
  calories:    number,
  kcalPerHour: number,
  weightKg:    number,
): number {
  if (weightKg <= 0 || kcalPerHour <= 0) return 0;
  const adjustedRate = kcalPerHour * (weightKg / 80);
  return Math.round((calories / adjustedRate) * 60);
}
