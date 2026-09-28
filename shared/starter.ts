/**
 * The starter library. Used for opening thoughts, entries kept from AI, and
 * fallbacks. The first 21 lines are the original set; the rest widen it across
 * eras and places, from Ptahhotep to Darwish. A line is quoted exactly only
 * where its wording and translation are certain; otherwise it is a plain
 * paraphrase, shown as "after" its author. Lines are only ever added at the
 * end, because entries remember lines by position.
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
  // ---- Ancient Egypt and Greece ----
  {
    quote: "Do not be proud of what you know. Ask the unlearned as well as the wise; no one has reached the limits of their craft.",
    author: "Ptahhotep",
    source: "The Maxims of Ptahhotep (c. 2400 BCE)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "Follow your heart as long as you live, and do not cut short the time for joy.",
    author: "Ptahhotep",
    source: "The Maxims of Ptahhotep (c. 2400 BCE)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "The unexamined life is not worth living.",
    author: "Socrates",
    source: "in Plato's Apology 38a, trans. Benjamin Jowett (1871)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "For one swallow does not make a summer, nor does one day.",
    author: "Aristotle",
    source: "Nicomachean Ethics I.7, trans. W. D. Ross (1908)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Of all that wisdom gives us for a happy life, by far the greatest is friendship.",
    author: "Epicurus",
    source: "Principal Doctrines 27",
    isParaphrase: true,
    religious: false,
  },
  // ---- China and Japan ----
  {
    quote: "Is it not delightful to have friends coming from distant quarters?",
    author: "Confucius",
    source: "Analects I.1, trans. James Legge (1861)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "The great man is he who does not lose his child's-heart.",
    author: "Mencius",
    source: "IV.2.12, trans. James Legge (1895)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "The journey of a thousand li commenced with a single step.",
    author: "Laozi",
    source: "Tao Te Ching 64, trans. James Legge (1891)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Once upon a time, I, Chuang Tzŭ, dreamt I was a butterfly, fluttering hither and thither, to all intents and purposes a butterfly.",
    author: "Zhuangzi",
    source: "trans. Herbert A. Giles (1889)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "I pick chrysanthemums by the eastern hedge, and far off, unhurried, the southern hills come into view.",
    author: "Tao Yuanming",
    source: "“Drinking Wine,” poem 5 (c. 400)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "I lift my head and look at the bright moon; I lower it and think of home.",
    author: "Li Bai",
    source: "“Quiet Night Thought” (c. 726)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "The flowing river never stops, and yet its water is never the same.",
    author: "Kamo no Chōmei",
    source: "Hōjōki, An Account of My Hut (1212)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "The most precious thing in life is its uncertainty.",
    author: "Yoshida Kenkō",
    source: "Essays in Idleness (c. 1330)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "An old pond. A frog jumps in. The sound of water.",
    author: "Matsuo Bashō",
    source: "haiku (1686)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "This world of dew is a world of dew, and yet, and yet.",
    author: "Kobayashi Issa",
    source: "haiku (1819)",
    isParaphrase: true,
    religious: false,
  },
  // ---- India and Nepal ----
  {
    quote: "If you shed tears when you miss the sun, you also miss the stars.",
    author: "Rabindranath Tagore",
    source: "Stray Birds 6 (1916)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "To speak harsh words when kind ones are at hand is to eat unripe fruit when ripe fruit is there.",
    author: "Thiruvalluvar",
    source: "Tirukkural 100",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "You have a right to your work, but never to its fruits.",
    author: "The Bhagavad Gita",
    source: "2.47",
    isParaphrase: true,
    religious: true,
  },
  {
    quote: "Hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.",
    author: "The Dhammapada",
    source: "verse 5, trans. F. Max Müller (1881)",
    isParaphrase: false,
    religious: true,
  },
  {
    quote: "I could never find leather enough to cover the whole earth, but leather on the soles of my feet is enough.",
    author: "Shantideva",
    source: "The Way of the Bodhisattva 5.13 (c. 700)",
    isParaphrase: true,
    religious: true,
  },
  {
    quote: "A person is made great by the heart, not by birth.",
    author: "Laxmi Prasad Devkota",
    source: "Muna Madan (1936)",
    isParaphrase: true,
    religious: false,
  },
  // ---- Persia, the Arab world and Muslim thinkers ----
  {
    quote: "Listen to the reed, and the tale it tells of separation.",
    author: "Rumi",
    source: "Masnavi I.1 (c. 1260)",
    isParaphrase: true,
    religious: true,
  },
  {
    quote: "Human beings are members of one body, made from one essence.",
    author: "Saadi",
    source: "Gulistan I.10 (1258)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "A loaf of bread beneath the bough, a book of verse, and you beside me: the wilderness is paradise enough.",
    author: "Omar Khayyám",
    source: "Rubáiyát, in Edward FitzGerald's rendering (1859)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "The thirty birds crossed seven valleys to find their king, and found that what they were seeking was themselves.",
    author: "Farid ud-Din Attar",
    source: "The Conference of the Birds (1177)",
    isParaphrase: true,
    religious: true,
  },
  {
    quote: "My heart has become able to take on every form.",
    author: "Ibn Arabi",
    source: "The Interpreter of Desires XI (1215)",
    isParaphrase: true,
    religious: true,
  },
  {
    quote: "Even floating in the air, touching nothing and seeing nothing, a person would still know that they exist.",
    author: "Ibn Sina",
    source: "the “floating man,” On the Soul (c. 1020)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "Love begins in play and ends in earnest.",
    author: "Ibn Hazm",
    source: "The Ring of the Dove (1022)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "We have on this earth what makes life worth living.",
    author: "Mahmoud Darwish",
    source: "“On This Earth” (1986)",
    isParaphrase: true,
    religious: false,
  },
  // ---- Europe and the Encyclopédie ----
  {
    quote: "The greatest thing in the world is to know how to belong to oneself.",
    author: "Michel de Montaigne",
    source: "“Of Solitude,” Essays (1580)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "I have discovered that all the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.",
    author: "Blaise Pascal",
    source: "Pensées 139, trans. W. F. Trotter (1910)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "But all things excellent are as difficult as they are rare.",
    author: "Baruch Spinoza",
    source: "Ethics V, trans. R. H. M. Elwes (1883)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "We must cultivate our garden.",
    author: "Voltaire",
    source: "Candide (1759)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "We gather what is known so that those who come after us, knowing more, may be happier and better.",
    author: "Denis Diderot",
    source: "“Encyclopédie,” in the Encyclopédie (1755)",
    isParaphrase: true,
    religious: false,
  },
  {
    quote: "Be patient toward all that is unsolved in your heart and try to love the questions themselves.",
    author: "Rainer Maria Rilke",
    source: "Letters to a Young Poet, trans. M. D. Herter Norton (1934)",
    isParaphrase: false,
    religious: false,
  },
  {
    quote: "Attention is the rarest and purest form of generosity.",
    author: "Simone Weil",
    source: "letter to Joë Bousquet (1942)",
    isParaphrase: false,
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
