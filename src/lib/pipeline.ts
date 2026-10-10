import { pickStarter } from "../../shared/starter";
import type { Theme } from "../../shared/voices";
import type { ReflectionResult } from "../../shared/constants";
import { OfflineError, requestIllustration, requestReflection, aiConfig } from "./ai";
import { finishedEntries, getBlob, getEntry, getMeta, getSettings, putBlob, saveMeta, updateEntry, deleteBlob } from "./db";
import { describeWhen, naturalMoment } from "./dates";
import { drawIllustration, drawnAlt, motifForArt } from "../illustration/drawn";
import { moodFromText, sceneFromText } from "../illustration/understand";
import { localTitle, wordsOf } from "./entries";
import { base64ToBlob, smallCopyBase64 } from "./photo";
import { themesFromText } from "./themes";
import type { Entry, Reflection } from "./types";

/**
 * After Finish: the reflection, then the illustration. Runs in the background,
 * survives leaving the screen, waits while offline, and always ends with the
 * entry saved. Fallbacks: the starter library and the hand-drawn vignette.
 */

const inFlight = new Set<string>();

function starterReflection(
  used: number[],
  settings: { allowReligious: boolean; skippedVoices: string[]; lovedVoices: string[] },
  themes: Theme[],
) {
  const pick = pickStarter({ used, allowReligious: settings.allowReligious, skippedVoices: settings.skippedVoices, lovedVoices: settings.lovedVoices, themes });
  const r: Reflection = {
    quote: pick.line.quote,
    author: pick.line.author,
    source: pick.line.source,
    isParaphrase: pick.line.isParaphrase,
    bridge: "",
    origin: "starter",
    receivedAt: new Date().toISOString(),
  };
  return { reflection: r, used: pick.used };
}

async function rememberVoice(author: string | null) {
  if (!author) return;
  const meta = await getMeta();
  const recent = [author, ...meta.recentVoices.filter((v) => v !== author)].slice(0, 20);
  await saveMeta({ recentVoices: recent });
}

async function useStarter(id: string, keepTitle: boolean) {
  const [settings, meta] = await Promise.all([getSettings(), getMeta()]);
  const entry = await getEntry(id);
  const { reflection, used } = starterReflection(meta.starterUsed, settings, entry ? themesFromText(wordsOf(entry)) : []);
  await saveMeta({ starterUsed: used });
  await rememberVoice(reflection.author);
  await updateEntry(id, (e) => ({
    ...e,
    title: keepTitle && e.title ? e.title : localTitle(e),
    // Read on the device: a mood for the tree and a picture for the page.
    ...localPicture(e),
    reflection: settings.reflections ? reflection : null,
    steps: { ...e.steps, reflection: "done" },
  }));
}

/** Mood and scene from the entry's own words, worked out on the device. */
function localPicture(e: Entry): Pick<Entry, "mood" | "art" | "motif"> {
  const mood = e.mood ?? moodFromText(wordsOf(e));
  const moment = naturalMoment(e.finishedAt ?? new Date().toISOString(), e.timeZone);
  const art = e.art ?? sceneFromText(wordsOf(e), { seed: e.id, mood, timeOfDay: e.timeOfDay ?? moment.timeOfDay });
  return { mood, art, motif: e.motif ?? motifForArt(art) };
}

async function applyAIReflection(id: string, r: ReflectionResult, onlyReflection: boolean) {
  const settings = await getSettings();
  await rememberVoice(r.author);
  await updateEntry(id, (e) => ({
    ...e,
    ...(onlyReflection
      ? {}
      : {
          title: r.title,
          themes: r.themes,
          mood: r.mood,
          motif: r.motif,
          season: r.season,
          timeOfDay: r.timeOfDay,
          scene: r.scene,
          art: r.art ?? e.art ?? null,
          // The model saw the first photo, so its suggested description belongs to that one.
          photos: e.photos.map((p, i) => (i === 0 && !p.altEdited && r.photoAlt ? { ...p, alt: r.photoAlt } : p)),
        }),
    reflection: settings.reflections || r.crisis
      ? {
          quote: r.crisis ? null : r.quote,
          author: r.crisis ? null : r.author,
          source: r.crisis ? null : r.source,
          isParaphrase: r.isParaphrase,
          bridge: r.bridge,
          origin: "ai",
          receivedAt: new Date().toISOString(),
        }
      : null,
    crisis: r.crisis,
    illustrationAlt: onlyReflection ? e.illustrationAlt : r.illustrationAlt,
    steps: { ...e.steps, reflection: "done" },
  }));
}

async function runReflection(entry: Entry, onlyReflection: boolean): Promise<"done" | "waiting"> {
  const settings = await getSettings();
  if (entry.keptFromAI) {
    await useStarter(entry.id, onlyReflection);
    return "done";
  }
  let config;
  try {
    config = await aiConfig();
  } catch (err) {
    if (err instanceof OfflineError) return "waiting";
    throw err;
  }
  if (!config?.reflections) {
    await useStarter(entry.id, onlyReflection);
    return "done";
  }
  await updateEntry(entry.id, (e) => ({ ...e, steps: { ...e.steps, reflection: "working" } }));
  const meta = await getMeta();
  let photo: string | null = null;
  const first = entry.photos[0];
  if (first) {
    const blob = await getBlob(first.url);
    if (blob) photo = await smallCopyBase64(blob).catch(() => null);
  }
  try {
    const result = await requestReflection({
      text: wordsOf(entry),
      photo,
      when: describeWhen(entry.finishedAt ?? new Date().toISOString(), entry.timeZone),
      recentVoices: meta.recentVoices.slice(0, 20),
      lovedVoices: settings.lovedVoices,
      skippedVoices: settings.skippedVoices,
      allowReligious: settings.allowReligious,
    });
    await applyAIReflection(entry.id, result, onlyReflection);
    return "done";
  } catch (err) {
    if (err instanceof OfflineError) {
      await updateEntry(entry.id, (e) => ({ ...e, steps: { ...e.steps, reflection: "pending" } }));
      return "waiting";
    }
    // The server already retried once. The starter library keeps the promise.
    await useStarter(entry.id, onlyReflection);
    return "done";
  }
}

async function drawFallback(entry: Entry, state: "done" | "failed") {
  const moment = naturalMoment(entry.finishedAt ?? new Date().toISOString(), entry.timeZone);
  const timeOfDay = entry.timeOfDay ?? moment.timeOfDay;
  // The first drawing is seeded by the entry; "Draw again" asks for a fresh one.
  const again = !!entry.illustration;
  const seed = again ? `${entry.id}:${Date.now()}` : entry.id;
  const mood = entry.mood ?? moodFromText(wordsOf(entry));
  // A scene from the AI keeps its meaning and varies its details; one read on the
  // device may find a different picture for the same words.
  const art = entry.art && !(again && !entry.scene) ? entry.art : sceneFromText(wordsOf(entry), { seed, mood, timeOfDay });
  const svg = drawIllustration({ seed, art, mood, season: entry.season ?? moment.season, timeOfDay });
  const key = `ill-${entry.id}-${Date.now().toString(36)}`;
  const url = await putBlob(key, new Blob([svg], { type: "image/svg+xml" }));
  const old = entry.illustration;
  await updateEntry(entry.id, (e) => ({
    ...e,
    mood: e.mood ?? mood,
    art,
    illustration: { url, thumbUrl: url, alt: drawnAlt({ art, timeOfDay }), kind: "drawn" },
    steps: { ...e.steps, illustration: state },
  }));
  if (old) await removeIllustrationBlobs(old.url, old.thumbUrl);
}

async function removeIllustrationBlobs(url: string, thumbUrl: string) {
  await deleteBlob(url);
  if (thumbUrl !== url) await deleteBlob(thumbUrl);
}

async function runIllustration(entry: Entry): Promise<"done" | "waiting"> {
  const settings = await getSettings();
  // Quiet and Storybook pictures ship with the app, so only "Drawn for each entry" asks for a picture to be made.
  if (entry.keptFromAI || !settings.illustrations || !entry.scene || settings.illustrationStyle !== "drawn") {
    await drawFallback(entry, "done");
    return "done";
  }
  let config;
  try {
    config = await aiConfig();
  } catch (err) {
    if (err instanceof OfflineError) return "waiting";
    throw err;
  }
  if (!config?.illustrations) {
    await drawFallback(entry, "done");
    return "done";
  }
  await updateEntry(entry.id, (e) => ({ ...e, steps: { ...e.steps, illustration: "working" } }));
  try {
    const res = await requestIllustration({
      scene: entry.scene,
      season: entry.season ?? "summer",
      timeOfDay: entry.timeOfDay ?? "afternoon",
      mood: entry.mood ?? "calm",
    });
    const stamp = Date.now().toString(36);
    const url = await putBlob(`ill-${entry.id}-${stamp}`, base64ToBlob(res.image, "image/webp"));
    const thumbUrl = await putBlob(`ill-${entry.id}-${stamp}-thumb`, base64ToBlob(res.thumb, "image/webp"));
    const old = entry.illustration;
    await updateEntry(entry.id, (e) => ({
      ...e,
      illustration: { url, thumbUrl, alt: e.illustrationAlt ?? drawnAlt({ art: e.art, motif: e.motif, timeOfDay: e.timeOfDay }), kind: "generated" },
      steps: { ...e.steps, illustration: "done" },
    }));
    if (old) await removeIllustrationBlobs(old.url, old.thumbUrl);
    return "done";
  } catch (err) {
    if (err instanceof OfflineError) {
      await updateEntry(entry.id, (e) => ({ ...e, steps: { ...e.steps, illustration: "pending" } }));
      return "waiting";
    }
    // Show the drawn fallback with a quiet Try again.
    await drawFallback(entry, "failed");
    return "done";
  }
}

/** Runs whatever is still owed to an entry. Safe to call many times. */
export async function processEntry(id: string, opts: { onlyReflection?: boolean } = {}): Promise<void> {
  if (inFlight.has(id)) return;
  inFlight.add(id);
  try {
    let entry = await getEntry(id);
    if (!entry || entry.status !== "finished") return;
    if (entry.steps.reflection !== "done" && entry.steps.reflection !== "skipped") {
      if ((await runReflection(entry, !!opts.onlyReflection)) === "waiting") return;
    }
    entry = await getEntry(id);
    if (!entry) return;
    if (entry.steps.illustration !== "done" && entry.steps.illustration !== "skipped" && entry.steps.illustration !== "failed") {
      await runIllustration(entry);
    }
  } catch (err) {
    console.warn("Background step paused", (err as Error).message);
  } finally {
    inFlight.delete(id);
  }
}

export async function drawAgain(id: string) {
  await updateEntry(id, (e) => ({ ...e, steps: { ...e.steps, illustration: "pending" } }));
  await processEntry(id);
}

export async function newReflection(id: string) {
  await updateEntry(id, (e) => ({ ...e, steps: { ...e.steps, reflection: "pending" } }));
  await processEntry(id, { onlyReflection: true });
}

/** Picks up anything left waiting: after a reload, or when the connection returns. */
export async function resumePending() {
  const list = await finishedEntries();
  for (const e of list) {
    const owed = (s: string) => s === "pending" || s === "working";
    if (owed(e.steps.reflection) || owed(e.steps.illustration)) await processEntry(e.id);
  }
}
