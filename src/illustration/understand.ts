import type { Accent, ArtSpec, Mood, Motif, Subject, TimeOfDay } from "../../shared/constants";
import { pick, seeded } from "../lib/rng";

/**
 * Reads an entry on the device, with no AI and nothing sent anywhere, to find
 * its mood and a picture for it. It looks for what the entry is about (a
 * person who mattered, a choice, rest, growing, loss) and turns that into a
 * visual metaphor, then lets concrete things in the text (rain, the sea, tea)
 * set the scene around it.
 */

type Lexicon = [Mood, RegExp][];

const MOOD_WORDS: Lexicon = [
  ["heavy", /\b(sad|sadness|cry|cried|crying|tears|grief|grieving|lost|loss|hurt|hurting|lonely|alone|heartbroken|depressed|angry|furious|awful|terrible|funeral|died|passed away|miss (her|him|them)|hard day|rough day)\b/gi],
  ["grateful", /\b(grateful|gratitude|thankful|thank(s| you)?|appreciat\w*|blessed|lucky|fortunate)\b/gi],
  ["tender", /\b(love|loved|loving|hug|hugged|held|gentle|sweet|kind|kindness|care|cared|cuddl\w*|dear|precious)\b/gi],
  ["joyful", /\b(happy|happiness|joy|joyful|laugh\w*|fun|great|amazing|wonderful|excited|delight\w*|celebrat\w*|beautiful day|best day)\b/gi],
  ["hopeful", /\b(hope|hopeful|hoping|looking forward|tomorrow|better|improv\w*|new start|fresh start|progress|getting there|ready|plan\w*)\b/gi],
  ["calm", /\b(calm|quiet|peace|peaceful|slow|slowly|still|stillness|relax\w*|easy|gentle morning|breathe|breathing)\b/gi],
  ["curious", /\b(wonder\w*|curious|learn\w*|question\w*|interesting|discover\w*|idea|ideas|read|reading|philosoph\w*|think(ing)? about)\b/gi],
  ["wistful", /\b(remember\w*|memor(y|ies)|nostalg\w*|used to|once|years ago|old photos?|childhood|miss(ed|ing)?)\b/gi],
  ["restless", /\b(anxious|anxiety|worr\w*|stress\w*|busy|rush\w*|overwhelm\w*|nervous|restless|deadline|can'?t sleep|panic\w*|pressure|chaos|scattered)\b/gi],
  ["tired", /\b(tired|exhausted|sleepy|drained|worn( out)?|long day|burn(ed|t) out|need(ed)? sleep|nap)\b/gi],
];

/** "not happy" shouldn't count as happy. */
function negated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 24), index).toLowerCase();
  return /\b(not|never|no|isn'?t|wasn'?t|don'?t|didn'?t|hardly)\s+(\w+\s+)?$/.test(before);
}

function score(text: string, re: RegExp, { mood = false } = {}): number {
  let n = 0;
  for (const m of text.matchAll(re)) if (!mood || !negated(text, m.index ?? 0)) n++;
  return n;
}

/** The mood of an entry, from its words. Calm when nothing stands out. */
export function moodFromText(text: string): Mood {
  let best: Mood = "calm";
  let top = 0;
  for (const [mood, re] of MOOD_WORDS) {
    const s = score(text, re, { mood: true });
    if (s > top) {
      best = mood;
      top = s;
    }
  }
  return best;
}

// ---- what the entry is about ------------------------------------------------------

type Theme = "connection" | "distance" | "loss" | "solitude" | "choice" | "journey" | "growth" | "rest" | "strain" | "home" | "thought" | "joy" | "gratitude" | "change" | "day";

const THEMES: [Theme, RegExp, number][] = [
  ["distance", /\b(texted|texts?|messag\w*|called|phone|facetime|video call|far away|long distance|abroad|miss(ed|ing)? (her|him|them|you)|letter|wrote to me)\b/gi, 2],
  ["connection", /\b(friends?|mom|mum|mother|dad|father|sister|brother|partner|wife|husband|girlfriend|boyfriend|family|grandm\w*|grandp\w*|son|daughter|kids?|together|with (her|him|them)|we |us\b|met|visited|dinner with|talked|conversation|hug\w*)\b/gi, 1],
  ["loss", /\b(died|death|passed away|funeral|grief|griev\w*|lost|losing|goodbye|miss(ing)? (her|him|them)|gone)\b/gi, 2],
  ["solitude", /\b(alone|lonely|by myself|on my own|solitude|nobody|isolat\w*)\b/gi, 2],
  ["choice", /\b(decid\w*|decision|choice|choose|chose|crossroads|torn|whether|options?|not sure (if|whether))\b/gi, 2],
  ["journey", /\b(trip|travel\w*|flight|flew|drove|drive|train|journey|moving|moved|road|walk\w*|hike\w*|commute)\b/gi, 1],
  ["growth", /\b(start\w*|began|begin\w*|new|first (time|day|class|step)|learn\w*|grow\w*|progress|practic\w*|trying|tried|improv\w*|healing)\b/gi, 2],
  ["rest", /\b(rest\w*|sleep\w*|nap|bed|lazy|slept|cozy|cosy|blanket|quiet night|day off)\b/gi, 1],
  ["strain", /\b(work|deadline|meeting|exam|busy|stress\w*|overwhelm\w*|pressure|juggl\w*|too much|balance)\b/gi, 1],
  ["home", /\b(home|house|apartment|kitchen|cook\w*|dinner|garden|room)\b/gi, 1],
  ["thought", /\b(read|reading|book|books|study|studied|class|lecture|idea|ideas|wrote|writing|think\w*|philosoph\w*|poem|poetry)\b/gi, 1],
  ["gratitude", /\b(grateful|thankful|thank\w*|appreciat\w*|blessed)\b/gi, 2],
  ["joy", /\b(happy|joy|laugh\w*|fun|celebrat\w*|party|danc\w*|sang|singing)\b/gi, 1],
  ["change", /\b(chang\w*|ending|ended|end of|autumn|fall|last day|letting go|let go)\b/gi, 1],
];

/** Each theme's pictures, as [subject, arrangement]. */
const PICTURES: Record<Theme, [Subject, ArtSpec["arrangement"]][]> = {
  distance: [["lantern", "reaching"], ["birds", "reaching"], ["paper boat", "reaching"], ["house", "reaching"], ["letter", "alone"]],
  connection: [["birds", "together"], ["tree", "together"], ["teacup", "together"], ["lantern", "together"], ["fox", "together"], ["umbrella", "together"]],
  loss: [["tree", "alone"], ["candle", "alone"], ["bench", "alone"], ["boat", "apart"], ["stones", "alone"]],
  solitude: [["moon", "alone"], ["lighthouse", "alone"], ["tree", "alone"], ["boat", "alone"], ["bench", "alone"]],
  choice: [["path", "apart"], ["door", "alone"], ["bridge", "alone"]],
  journey: [["path", "alone"], ["boat", "alone"], ["bridge", "alone"], ["mountain", "alone"], ["paper boat", "alone"]],
  growth: [["sapling", "alone"], ["flowers", "gathered"], ["nest", "gathered"], ["mountain", "alone"], ["sapling", "gathered"]],
  rest: [["fox", "alone"], ["moon", "alone"], ["candle", "alone"], ["teacup", "alone"], ["bench", "alone"]],
  strain: [["stones", "alone"], ["stones", "gathered"], ["kite", "alone"], ["lighthouse", "alone"]],
  home: [["house", "alone"], ["teacup", "alone"], ["lantern", "alone"], ["flowers", "gathered"]],
  thought: [["open book", "alone"], ["candle", "alone"], ["lantern", "alone"], ["letter", "alone"]],
  gratitude: [["flowers", "gathered"], ["lantern", "together"], ["tree", "alone"], ["nest", "gathered"]],
  joy: [["kite", "together"], ["flowers", "gathered"], ["birds", "gathered"], ["kite", "alone"]],
  change: [["tree", "alone"], ["door", "alone"], ["path", "alone"], ["bridge", "alone"]],
  day: [["tree", "alone"], ["bench", "alone"], ["birds", "together"], ["path", "alone"], ["flowers", "gathered"], ["house", "alone"]],
};

/** Concrete things in the text that set the scene. */
const SCENE_WORDS: [RegExp, Partial<ArtSpec>][] = [
  [/\b(rain\w*|drizzle|storm\w*|puddles?|umbrella)\b/i, { weather: "rain" }],
  [/\b(snow\w*|blizzard|frost\w*)\b/i, { weather: "snow" }],
  [/\b(fog\w*|mist\w*|haz\w*|grey|gray)\b/i, { weather: "mist" }],
  [/\b(wind|winds|windy|breez\w*|gust\w*)\b/i, { weather: "wind" }],
  [/\b(stars?|starry|night sky)\b/i, { weather: "stars" }],
  [/\b(sea|ocean|beach|waves?|coast|shore|harbou?r)\b/i, { setting: "shore" }],
  [/\b(lake|pond|river|canal|boat|sail\w*|swim\w*)\b/i, { setting: "water" }],
  [/\b(mountains?|hike\w*|summit|peak|climb\w*)\b/i, { setting: "mountains" }],
  [/\b(garden\w*|plant\w*|flowers?|backyard|yard)\b/i, { setting: "garden" }],
  [/\b(inside|indoors|window|room|desk|bed|couch|sofa|kitchen|caf[eé]|library|tea|coffee|mug)\b/i, { setting: "indoors" }],
  [/\b(hills?|countryside|fields?|park|meadow)\b/i, { setting: "hills" }],
];

const THING_SUBJECTS: [RegExp, Subject][] = [
  [/\b(tea|coffee|mug|cup)\b/i, "teacup"],
  [/\b(book|novel|reading|read)\b/i, "open book"],
  [/\b(candle\w*)\b/i, "candle"],
  [/\b(letter|postcard|card from)\b/i, "letter"],
  [/\b(kite)\b/i, "kite"],
  [/\b(lighthouse)\b/i, "lighthouse"],
  [/\b(birds?|sparrows?|robins?|crows?|pigeons?)\b/i, "birds"],
  [/\b(moon|moonlight)\b/i, "moon"],
  [/\b(fox|foxes)\b/i, "fox"],
  [/\b(umbrella)\b/i, "umbrella"],
];

const MOOD_ACCENTS: Record<Mood, Accent[]> = {
  calm: ["birds in flight", "tall grass"],
  joyful: ["butterflies", "flowers"],
  tender: ["petals", "flowers"],
  grateful: ["flowers", "fireflies"],
  hopeful: ["birds in flight", "butterflies"],
  curious: ["butterflies", "birds in flight"],
  wistful: ["falling leaves", "tall grass"],
  restless: ["falling leaves", "birds in flight"],
  tired: ["fireflies", "tall grass"],
  heavy: ["falling leaves"],
};

const MOOD_LIGHT: Record<Mood, ArtSpec["light"]> = {
  calm: "soft",
  joyful: "rays",
  tender: "glow",
  grateful: "glow",
  hopeful: "rays",
  curious: "soft",
  wistful: "soft",
  restless: "soft",
  tired: "dim",
  heavy: "dim",
};

const MOOD_WEATHER: Partial<Record<Mood, ArtSpec["weather"]>> = {
  heavy: "mist",
  restless: "wind",
  tired: "clouds",
  wistful: "clouds",
};

const NOT_A_PERSON = /^(I|God|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Christmas|Easter|Eid|Diwali|Google|Instagram|Netflix|Spotify|English|Spanish)$/;
const BEFORE_A_PLACE = /^(in|to|at|from|near|of|the|visit|visited|around|across|through|into|on|by)$/i;

/** A person's name in the middle of a sentence ("when Angana texted") hints at company. */
function mentionsSomeone(text: string): boolean {
  for (const m of text.matchAll(/\b([\w']+)[ ,]+([A-Z][a-z]{2,})\b/g)) {
    if (BEFORE_A_PLACE.test(m[1]) || NOT_A_PERSON.test(m[2])) continue;
    return true;
  }
  return false;
}

function themeOf(text: string, seed: () => number): Theme {
  const scores = new Map<Theme, number>();
  for (const [theme, re, weight] of THEMES) {
    const s = score(text, re) * weight;
    if (s) scores.set(theme, s);
  }
  if (mentionsSomeone(text)) scores.set("connection", (scores.get("connection") ?? 0) + 2);
  // Reaching across a distance is a kind of connection; it wins when both appear.
  if (scores.has("distance") && scores.has("connection")) scores.set("distance", (scores.get("distance") ?? 0) + (scores.get("connection") ?? 0));
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return "day";
  // Close calls are decided by the seed, so similar days still get different pictures.
  const close = ranked.filter(([, s]) => s >= ranked[0][1] - 0.5).map(([t]) => t);
  return pick(seed, close);
}

/** A picture for an entry, found on the device. The seed varies it for "Draw again". */
export function sceneFromText(text: string, opts: { seed: string; mood?: Mood | null; timeOfDay?: TimeOfDay | null }): ArtSpec {
  const r = seeded(opts.seed + ":scene");
  const mood = opts.mood ?? moodFromText(text);
  const theme = themeOf(text, r);
  let [subject, arrangement] = pick(r, PICTURES[theme]);

  // A thing named in the entry can be the subject, if it fits the theme's feeling.
  const things = THING_SUBJECTS.filter(([re]) => re.test(text)).map(([, s]) => s);
  if (things.length && (theme === "day" || theme === "rest" || theme === "thought" || theme === "home" || r() < 0.4)) {
    subject = pick(r, things);
    if (subject === "moon" || subject === "lighthouse") arrangement = "alone";
    else if (theme === "connection" || theme === "distance") arrangement = theme === "distance" ? "reaching" : "together";
  }

  const spec: ArtSpec = {
    subject,
    arrangement,
    setting: "meadow",
    weather: MOOD_WEATHER[mood] ?? pick(r, ["clear", "clear", "clouds"] as const),
    light: MOOD_LIGHT[mood],
    accents: [],
    focus: arrangement === "alone" ? pick(r, ["left", "center", "right"] as const) : "center",
  };
  const found = new Set<string>();
  for (const [re, patch] of SCENE_WORDS) {
    if (!re.test(text)) continue;
    for (const [key, value] of Object.entries(patch)) {
      if (found.has(key)) continue;
      found.add(key);
      Object.assign(spec, { [key]: value });
    }
  }
  if (!found.has("setting")) spec.setting = pick(r, ["meadow", "hills", "meadow", "garden"] as const);
  // Keep the subject at home in the scene the words describe.
  const WATERSIDE: Subject[] = ["boat", "paper boat", "stones", "lighthouse", "birds", "moon"];
  const INDOOR: Subject[] = ["teacup", "candle", "open book", "letter", "lantern", "flowers"];
  if ((spec.setting === "shore" || spec.setting === "water") && !WATERSIDE.includes(spec.subject)) {
    spec.subject = spec.arrangement === "alone" ? pick(r, ["stones", "boat", "lighthouse"] as const) : pick(r, ["boat", "birds", "paper boat"] as const);
  }
  if (spec.setting === "indoors" && !INDOOR.includes(spec.subject)) spec.subject = pick(r, INDOOR);
  if (spec.weather === "stars" && opts.timeOfDay !== "night" && opts.timeOfDay !== "evening") spec.weather = "clear";

  // After dark, things that fly by day give way to things that glow.
  const dark = opts.timeOfDay === "night";
  if (dark && (spec.subject === "kite" || (spec.subject === "birds" && spec.setting === "sky"))) spec.subject = "lantern";
  const daytimeOnly: Accent[] = ["butterflies", "birds in flight", "rainbow"];
  const pool = MOOD_ACCENTS[mood].filter((a) => !dark || !daytimeOnly.includes(a));
  if (!pool.length) pool.push("fireflies");
  if (opts.timeOfDay === "evening" || opts.timeOfDay === "night") pool.push("fireflies");
  spec.accents = [...new Set([pick(r, pool), r() < 0.45 ? pick(r, pool) : pool[0]])].slice(0, 2) as Accent[];
  if (spec.weather === "rain" || spec.weather === "snow") spec.accents = spec.accents.filter((a) => a !== "butterflies" && a !== "fireflies" && a !== "birds in flight");
  return spec;
}

/** Drawings made before scenes existed had only a motif. */
export function sceneFromMotif(motif: Motif): ArtSpec {
  const base: ArtSpec = { subject: "tree", arrangement: "alone", setting: "meadow", weather: "clear", light: "soft", accents: [], focus: "center" };
  const map: Record<Motif, Partial<ArtSpec>> = {
    "a single tree": { subject: "tree", accents: ["flowers"] },
    "falling leaves": { subject: "tree", accents: ["falling leaves"], weather: "wind" },
    "a path through tall grass": { subject: "path", accents: ["tall grass"] },
    "a small boat on still water": { subject: "boat", setting: "water" },
    "a lit window at dusk": { subject: "house", light: "glow" },
    "a seedling": { subject: "sapling", setting: "garden", light: "rays" },
    "a moon over a field": { subject: "moon", weather: "stars" },
    "rain on a pond": { subject: "umbrella", weather: "rain" },
    "two birds on a branch": { subject: "birds", arrangement: "together" },
    "a bench under a tree": { subject: "bench" },
    "a teacup by a window": { subject: "teacup", setting: "indoors" },
    "a bridge over a stream": { subject: "bridge" },
  };
  return { ...base, ...map[motif] };
}
