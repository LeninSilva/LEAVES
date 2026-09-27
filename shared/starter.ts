/**
 * The starter library. Used for opening thoughts, entries kept from AI, and
 * fallbacks. These lines are fixed: do not add lines from memory.
 */
export interface StarterLine {
  quote: string;
  author: string;
  source: string;
  isParaphrase: boolean;
  religious: boolean;
}

export const STARTER_LIBRARY: readonly StarterLine[] = [
  {
    quote: "Men are disturbed not by things, but by the principles and notions which they form concerning things.",
    author: "Epictetus",
    source: "Enchiridion, trans. T. W. Higginson (1865)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul.",
    author: "Marcus Aurelius",
    source: "Meditations IV.3, trans. George Long (1862)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Nothing, Lucilius, is ours, except time.",
    author: "Seneca",
    source: "Letter 1, trans. Richard M. Gummere (1917)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "You cannot step twice into the same rivers; for fresh waters are ever flowing in upon you.",
    author: "Heraclitus",
    source: "trans. John Burnet (1892)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "He who knows other men is discerning; he who knows himself is intelligent.",
    author: "Laozi",
    source: "Tao Te Ching 33, trans. James Legge (1891)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "All that we are is the result of what we have thought.",
    author: "The Dhammapada",
    source: "verse 1, trans. F. Max Müller (1881)",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "The river and its waves are one surf: where is the difference between the river and its waves?",
    author: "Kabir",
    source: "Songs of Kabir, trans. Rabindranath Tagore (1915)",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "The butterfly counts not months but moments, and has time enough.",
    author: "Rabindranath Tagore",
    source: "Fireflies (1928)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "All shall be well, and all shall be well, and all manner of thing shall be well.",
    author: "Julian of Norwich",
    source: "Revelations of Divine Love, trans. Grace Warrack (1901)",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "To every thing there is a season, and a time to every purpose under the heaven.",
    author: "Ecclesiastes",
    source: "3:1, King James Version",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "If I am not for myself, who will be for me? If I am only for myself, what am I? If not now, when?",
    author: "Hillel",
    source: "Pirkei Avot 1:14",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "Indeed, with hardship comes ease.",
    author: "Qur'an",
    source: "94:6",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "The years teach much which the days never know.",
    author: "Ralph Waldo Emerson",
    source: "“Experience” (1844)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Heaven is under our feet as well as over our heads.",
    author: "Henry David Thoreau",
    source: "Walden (1854)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "I exist as I am, that is enough.",
    author: "Walt Whitman",
    source: "“Song of Myself,” Leaves of Grass",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Hope is the thing with feathers / That perches in the soul.",
    author: "Emily Dickinson",
    source: "Poems, Second Series (1891)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "I am certain of nothing but of the holiness of the Heart's affections and the truth of Imagination.",
    author: "John Keats",
    source: "letter to Benjamin Bailey (1817)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "What do we live for, if it is not to make life less difficult to each other?",
    author: "George Eliot",
    source: "Middlemarch (1872)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote:
      "The great revelation perhaps never did come. Instead there were little daily miracles, illuminations, matches struck unexpectedly in the dark.",
    author: "Virginia Woolf",
    source: "To the Lighthouse (1927)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Work is love made visible.",
    author: "Kahlil Gibran",
    source: "The Prophet (1923)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Life is understood backwards, but it must be lived forwards.",
    author: "Søren Kierkegaard",
    source: "journals (1843)",
    isParaphrase: true,
    religious: false,
  },
];

export interface StarterPickOptions {
  /** Indices already used in the current round. */
  used: number[];
  allowReligious: boolean;
  skippedVoices: string[];
}

/**
 * Picks the next starter line without repeating one until every eligible line
 * has been used. Returns the pick and the updated list of used indices.
 */
export function pickStarter(
  opts: StarterPickOptions,
  random: () => number = Math.random,
): { line: StarterLine; index: number; used: number[] } {
  const skipped = opts.skippedVoices.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const eligible = STARTER_LIBRARY.map((line, index) => ({ line, index })).filter(
    ({ line }) =>
      (opts.allowReligious || !line.religious) &&
      !skipped.some((s) => line.author.toLowerCase().includes(s)),
  );
  // If every voice is skipped, fall back to the whole library rather than nothing.
  const pool = eligible.length > 0 ? eligible : STARTER_LIBRARY.map((line, index) => ({ line, index }));
  let used = opts.used.filter((i) => pool.some((p) => p.index === i));
  let fresh = pool.filter((p) => !used.includes(p.index));
  if (fresh.length === 0) {
    used = [];
    fresh = pool;
  }
  const choice = fresh[Math.floor(random() * fresh.length)];
  return { line: choice.line, index: choice.index, used: [...used, choice.index] };
}
