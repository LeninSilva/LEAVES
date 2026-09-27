import type { Mood, Motif, Season, TimeOfDay } from "../../shared/constants";

/** A reference to a blob in local storage, written as "idb:<key>". */
export type BlobRef = string;

export interface Photo {
  url: BlobRef;
  thumbUrl: BlobRef;
  alt: string;
  /** True once the person has changed the suggested alt text. */
  altEdited?: boolean;
}

export interface Illustration {
  url: BlobRef;
  thumbUrl: BlobRef;
  alt: string;
  kind: "generated" | "drawn";
}

export interface Reflection {
  quote: string | null;
  author: string | null;
  source: string | null;
  isParaphrase: boolean;
  bridge: string;
  /** Where it came from, for "How AI is used" and debugging. */
  origin: "ai" | "starter";
  receivedAt: string;
}

export type StepState = "pending" | "working" | "done" | "failed" | "skipped";

export interface Entry {
  id: string;
  status: "draft" | "finished";
  text: string;
  photo: Photo | null;
  place: { name: string } | null;
  /** UTC ISO string of the first keystroke or photo. */
  startedAt: string | null;
  finishedAt: string | null;
  /** IANA zone where the entry was finished (or begun, for drafts). */
  timeZone: string;
  /** IANA zone where the entry was begun, if different. */
  startTimeZone?: string;
  editedAt: string | null;
  keptFromAI: boolean;
  title: string | null;
  themes: string[];
  mood: Mood | null;
  motif: Motif | null;
  season: Season | null;
  timeOfDay: TimeOfDay | null;
  scene: string | null;
  /** The model's description of the drawing it asked for, used as alt text. */
  illustrationAlt?: string | null;
  illustration: Illustration | null;
  reflection: Reflection | null;
  crisis: boolean;
  share: { linkToken: string | null; published: boolean };
  /** Background work after Finish. */
  steps: { reflection: StepState; illustration: StepState };
  /** Local bookkeeping (ms since epoch). */
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export type ThemeSetting = "automatic" | "daylight" | "lamplight";
export type PlaceMode = "off" | "ask" | "auto";
export type TextSize = "small" | "default" | "large" | "larger";
export type WritingFont = "literata" | "atkinson";

export interface Settings {
  theme: ThemeSetting;
  warmEvenings: boolean;
  /** "HH:MM", 24 hour. */
  warmEveningsFrom: string;
  warmEveningsTo: string;
  textSize: TextSize;
  writingFont: WritingFont;
  reduceMotion: boolean;
  openingThought: boolean;
  questions: boolean;
  reflections: boolean;
  illustrations: boolean;
  allowReligious: boolean;
  lovedVoices: string[];
  skippedVoices: string[];
  placeMode: PlaceMode;
  sharePlace: boolean;
  /** "HH:MM" or null when the reminder is off. */
  reminderTime: string | null;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "automatic",
  warmEvenings: true,
  warmEveningsFrom: "20:00",
  warmEveningsTo: "06:00",
  textSize: "default",
  writingFont: "literata",
  reduceMotion: false,
  openingThought: true,
  questions: true,
  reflections: true,
  illustrations: true,
  allowReligious: true,
  lovedVoices: [],
  skippedVoices: [],
  placeMode: "ask",
  sharePlace: false,
  reminderTime: null,
  updatedAt: 0,
};

export interface OpeningThoughtLine {
  quote: string;
  author: string;
  source: string | null;
  isParaphrase: boolean;
}

/** Small values kept beside the entries. */
export interface Meta {
  welcomed: boolean;
  currentDraftId: string | null;
  recentVoices: string[];
  nextOpeningThought: OpeningThoughtLine | null;
  recentOpeningVoices: string[];
  starterUsed: number[];
  questionIndex: number;
  seenLeafCount: number;
  signInNudgeShown: boolean;
  lastPullAt: string | null;
  locationAsked: boolean;
}

export const DEFAULT_META: Meta = {
  welcomed: false,
  currentDraftId: null,
  recentVoices: [],
  nextOpeningThought: null,
  recentOpeningVoices: [],
  starterUsed: [],
  questionIndex: 0,
  seenLeafCount: 0,
  signInNudgeShown: false,
  lastPullAt: null,
  locationAsked: false,
};
