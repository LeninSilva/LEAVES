import type { Theme } from "../../shared/voices";

/**
 * What an entry is about, read on the device from its own words, so that the
 * quotation it receives can speak to it. A stem matches the start of a word;
 * a stem with a trailing space matches only that whole word.
 */
const LEXICON: Record<Theme, string[]> = {
  attention: ["notic", "attentive", "present moment", "mindful", "observ", "listen", "stillness", "paused", "looked closely"],
  change: ["chang", "transition", "moving ", "moved ", "new job", "ending", "beginning", "grew ", "growing", "different", "leaving", "turning point", "new chapter"],
  courage: ["brave", "courage", "afraid", "fear", "scared", "nervous", "risk", "dared", "speak up", "stood up", "anxious", "anxiety"],
  death: ["death", "died", "dying", "funeral", "passed away", "grave", "mortal", "hospice", "cemetery", "obituary"],
  family: ["mom ", "mother", "dad ", "father", "parent", "sister", "brother", "grandma", "grandpa", "grandmother", "grandfather", "daughter", "son ", "child", "kids", "family", "aunt", "uncle", "cousin", "baby"],
  freedom: ["freedom", "liberty", "independen", "escape", "trapped", "stuck", "free to", "no longer have to"],
  friendship: ["friend", "buddy", "texted", "hung out", "lunch with", "dinner with", "coffee with", "neighbor", "neighbour", "coworker", "company of"],
  gratitude: ["grate", "thank", "appreciat", "blessed", "lucky", "gift", "kindness", "generous"],
  grief: ["grief", "griev", "mourn", "miss ", "missing", "lost ", "loss", "cried", "crying", "tears", "heartbroken", "sorrow", "sad "],
  hope: ["hope", "someday", "looking forward", "promise", "future", "dream", "wish", "optimis", "better soon", "things will"],
  humility: ["humble", "apolog", "sorry", "my mistake", "i was wrong", "admit", "pride", "ego "],
  joy: ["joy", "happy", "happi", "laugh", "delight", "danc", "celebrat", "smil", "giggl", "played", "fun "],
  justice: ["justice", "unfair", "injustice", "rights", "protest", "march ", "vote", "voting", "election", "equal", "discriminat", "oppress", "poverty", "homeless", "racis", "sexis"],
  knowledge: ["learn", "study", "studied", "read ", "reading", "book", "class", "lecture", "understand", "idea", "wondered", "question", "curious", "research", "paper", "exam", "philosoph", "professor"],
  love: ["love", "kiss", "romanc", "partner", "husband", "wife", "boyfriend", "girlfriend", "crush", "affection", "tender", "in love"],
  nature: ["tree", "leaf", "leaves", "river", "sea ", "ocean", "lake", "mountain", "forest", "garden", "rain", "snow", "sunlight", "moon", "stars", "sky", "bird", "flower", "hike", "hiking", "park ", "wind", "autumn", "beach", "grass", "creek", "meadow", "trail"],
  peace: ["calm", "peace", "quiet", "rested", "relax", "gentle", "breath", "tea ", "silence", "settled", "unhurried", "slow morning"],
  self: ["myself", "i realized", "who i am", "identity", "therapy", "my habits", "my values", "i want to be", "my own"],
  solitude: ["alone", "lonely", "solitude", "by myself", "empty house", "no one", "isolat", "on my own"],
  struggle: ["hard ", "difficult", "struggl", "tired", "exhaust", "stress", "overwhelm", "burnout", "pain", "worry", "worried", "pressure", "tough", "heavy", "setback", "failed", "rough"],
  time: ["yesterday", "tomorrow", "years ago", "remember", "memory", "memories", "birthday", "anniversary", "childhood", "nostalg", "getting older", "aging", "used to"],
  virtue: ["kind ", "honest", "patient", "forgave", "forgiv", "respect", "integrity", "right thing", "volunteer", "helped", "generosity"],
  wonder: ["wonder", "amaz", "beautiful", "awe", "miracle", "magic", "sunset", "sunrise", "marvel", "stunning", "breathtaking"],
  work: ["work ", "worked", "working", "job", "boss", "office", "meeting", "project", "deadline", "shift", "career", "colleague", "client", "business", "interview", "email"],
};

const ORDER = Object.keys(LEXICON) as Theme[];

function fold(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Up to three themes the words touch on, strongest first. Empty when nothing stands out. */
export function themesFromText(text: string, max = 3): Theme[] {
  const hay = ` ${fold(text).replace(/[^\p{L}\p{N}']+/gu, " ")} `;
  const scored = ORDER.map((theme, order) => ({
    theme,
    order,
    score: LEXICON[theme].filter((stem) => hay.includes(` ${stem}`)).length,
  }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, max).map((t) => t.theme);
}
