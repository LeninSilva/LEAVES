/** Shared lists and plain types, free of runtime dependencies so the app bundle stays small. */

export const MOODS = [
  "calm",
  "joyful",
  "tender",
  "grateful",
  "hopeful",
  "curious",
  "wistful",
  "restless",
  "tired",
  "heavy",
] as const;
export type Mood = (typeof MOODS)[number];

export const MOTIFS = [
  "a single tree",
  "falling leaves",
  "a path through tall grass",
  "a small boat on still water",
  "a lit window at dusk",
  "a seedling",
  "a moon over a field",
  "rain on a pond",
  "two birds on a branch",
  "a bench under a tree",
  "a teacup by a window",
  "a bridge over a stream",
] as const;
export type Motif = (typeof MOTIFS)[number];

/**
 * The vocabulary for an entry's drawing. The subject is the one clear image at
 * the center; how many there are and how they stand to each other carries the
 * meaning (two birds together for company, a fork in the path for a choice).
 */
export const SUBJECTS = [
  "tree",
  "sapling",
  "flowers",
  "birds",
  "nest",
  "fox",
  "boat",
  "paper boat",
  "lighthouse",
  "bridge",
  "path",
  "mountain",
  "moon",
  "kite",
  "stones",
  "house",
  "door",
  "bench",
  "lantern",
  "candle",
  "teacup",
  "open book",
  "letter",
  "umbrella",
] as const;
export type Subject = (typeof SUBJECTS)[number];

/** alone is one; together, reaching and apart are two; gathered is three. */
export const ARRANGEMENTS = ["alone", "together", "reaching", "apart", "gathered"] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export const SETTINGS_ = ["meadow", "hills", "water", "shore", "mountains", "garden", "indoors", "sky"] as const;
export type ArtSetting = (typeof SETTINGS_)[number];

export const WEATHERS = ["clear", "clouds", "rain", "snow", "mist", "wind", "stars"] as const;
export type Weather = (typeof WEATHERS)[number];

export const LIGHTS = ["soft", "glow", "rays", "dim"] as const;
export type Light = (typeof LIGHTS)[number];

export const ACCENTS = [
  "flowers",
  "falling leaves",
  "petals",
  "fireflies",
  "birds in flight",
  "butterflies",
  "rainbow",
  "tall grass",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const FOCUSES = ["left", "center", "right"] as const;
export type Focus = (typeof FOCUSES)[number];

export interface ArtSpec {
  subject: Subject;
  arrangement: Arrangement;
  setting: ArtSetting;
  weather: Weather;
  light: Light;
  accents: Accent[];
  focus: Focus;
}

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const TIMES_OF_DAY = ["dawn", "morning", "afternoon", "evening", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export interface ReflectionResult {
  title: string;
  themes: string[];
  mood: Mood;
  motif: Motif;
  season: Season;
  timeOfDay: TimeOfDay;
  scene: string;
  /** How to compose the entry's drawing; null from older servers. */
  art: ArtSpec | null;
  illustrationAlt: string;
  photoAlt: string | null;
  quote: string | null;
  author: string | null;
  source: string | null;
  isParaphrase: boolean;
  bridge: string;
  crisis: boolean;
}

export interface ReflectRequest {
  text: string;
  photo: string | null;
  when: string;
  recentVoices: string[];
  lovedVoices: string[];
  skippedVoices: string[];
  allowReligious: boolean;
}

export interface OpeningThought {
  quote: string;
  author: string;
  source: string | null;
  isParaphrase: boolean;
}

export interface OpeningThoughtRequest {
  recentVoices: string[];
  lovedVoices: string[];
  skippedVoices: string[];
  allowReligious: boolean;
}

export interface IllustrateRequest {
  scene: string;
  season: Season;
  timeOfDay: TimeOfDay;
  mood: Mood;
}

export interface IllustrateResponse {
  /** 1024px WebP, base64. */
  image: string;
  /** 256px WebP, base64. */
  thumb: string;
}

export interface PlaceResponse {
  name: string | null;
}

export interface ServerConfig {
  reflections: boolean;
  illustrations: boolean;
  vapidPublicKey: string | null;
  /** AI features answer only signed-in accounts. Guests get the starter library and drawings. */
  aiNeedsAccount: boolean;
}
