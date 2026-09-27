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
}
