import { STARTER_LIBRARY, type StarterLine } from "./starter.js";
import { TRADITIONS, VOICE_LIST, VOICES, traditionLabel, type Tradition, type Voice } from "./voices.js";

/** Reading the library: by voice, by tradition, or by search. */

export function quotesBy(voiceId: string): StarterLine[] {
  return STARTER_LIBRARY.filter((l) => l.voice === voiceId);
}

export function voiceCount(voiceId: string): number {
  return STARTER_LIBRARY.reduce((n, l) => n + (l.voice === voiceId ? 1 : 0), 0);
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Voices grouped by tradition, in a fixed order, each group alphabetical. */
export function voicesByTradition(): { id: Tradition; label: string; voices: Voice[] }[] {
  return TRADITIONS.map((t) => ({
    id: t.id,
    label: t.label,
    voices: VOICE_LIST.filter((v) => v.tradition === t.id).sort((a, b) => fold(a.name).localeCompare(fold(b.name))),
  })).filter((g) => g.voices.length > 0);
}

/** Every line whose words, author, source, themes or tradition match all the words of a search. */
export function searchLibrary(query: string): StarterLine[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return STARTER_LIBRARY.filter((l) => {
    const voice = VOICES[l.voice];
    const hay = fold([l.quote, l.author, l.source, l.themes.join(" "), voice ? traditionLabel(voice.tradition) : "", voice?.about ?? ""].join(" "));
    return words.every((w) => hay.includes(w));
  });
}
