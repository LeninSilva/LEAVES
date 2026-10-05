/**
 * The voices behind the quotations: who they were, in a line, and where they
 * belong. Quotations live in shared/quotes/ and refer to a voice by its id.
 * Dates are given only where they are well established.
 */

export const TRADITIONS = [
  { id: "antiquity", label: "Egypt, Greece and Rome" },
  { id: "china-japan", label: "China and Japan" },
  { id: "south-asia", label: "India and Nepal" },
  { id: "middle-east", label: "Persia, the Arab world and Islam" },
  { id: "abrahamic", label: "Jewish and Christian voices" },
  { id: "europe", label: "Europe" },
  { id: "existential", label: "Existentialists and phenomenologists" },
  { id: "virtue", label: "Virtue, care and the good life" },
  { id: "justice", label: "Justice and liberation" },
  { id: "americas", label: "The Americas" },
  { id: "africa", label: "Africa and its diaspora" },
  { id: "nature", label: "Nature writers" },
  { id: "today", label: "Philosophers of today" },
] as const;
export type Tradition = (typeof TRADITIONS)[number]["id"];

/** What a line is about. Used to find a thought that speaks to what someone wrote. */
export const THEMES = [
  "attention",
  "change",
  "courage",
  "death",
  "family",
  "freedom",
  "friendship",
  "gratitude",
  "grief",
  "hope",
  "humility",
  "joy",
  "justice",
  "knowledge",
  "love",
  "nature",
  "peace",
  "self",
  "solitude",
  "struggle",
  "time",
  "virtue",
  "wonder",
  "work",
] as const;
export type Theme = (typeof THEMES)[number];

export interface Voice {
  id: string;
  /** How the voice is named in a reflection, and what Voices I love and Voices to skip match against. */
  name: string;
  years?: string;
  about: string;
  tradition: Tradition;
  /** Scripture and religious teachers are left out when a person turns religious voices off. */
  religious?: boolean;
}

const v = (
  id: string,
  name: string,
  tradition: Tradition,
  years: string | undefined,
  about: string,
  religious = false,
): Voice => ({ id, name, tradition, years, about, religious });

export const VOICE_LIST: Voice[] = [
  // ---- Egypt, Greece and Rome ----
  v("ptahhotep", "Ptahhotep", "antiquity", "c. 2400 BCE", "A vizier of Old Kingdom Egypt, remembered for the oldest surviving book of advice on how to live."),
  v("socrates", "Socrates", "antiquity", "c. 470–399 BCE", "Athenian philosopher who wrote nothing and questioned everyone. We know him through Plato and Xenophon."),
  v("heraclitus", "Heraclitus", "antiquity", "c. 535–475 BCE", "Philosopher of Ephesus, who saw the world as a river of change."),
  v("epicurus", "Epicurus", "antiquity", "341–270 BCE", "Athenian philosopher who taught that a good life is made of friendship, simple pleasures and a quiet mind."),
  v("aristotle", "Aristotle", "antiquity", "384–322 BCE", "Student of Plato and teacher of Alexander. His ethics asks what a flourishing human life is made of."),
  v("seneca", "Seneca", "antiquity", "c. 4 BCE–65 CE", "Roman Stoic, statesman and playwright, who wrote letters on how to use a short life well."),
  v("epictetus", "Epictetus", "antiquity", "c. 50–135 CE", "Born enslaved, he became one of the great Stoic teachers, urging us to tell what is up to us from what is not."),
  v("marcus-aurelius", "Marcus Aurelius", "antiquity", "121–180 CE", "Roman emperor who wrote his Meditations as private notes to himself."),

  // ---- China and Japan ----
  v("confucius", "Confucius", "china-japan", "551–479 BCE", "Teacher and statesman of the Spring and Autumn period, whose sayings were gathered in the Analects."),
  v("laozi", "Laozi", "china-japan", "traditionally 6th century BCE", "The sage said to have written the Tao Te Ching, a short book on yielding, simplicity and the way."),
  v("mencius", "Mencius", "china-japan", "c. 372–289 BCE", "Confucian philosopher who held that people are born with the seeds of goodness."),
  v("zhuangzi", "Zhuangzi", "china-japan", "c. 369–286 BCE", "Daoist writer of parables, butterflies and cheerful doubt."),
  v("tao-yuanming", "Tao Yuanming", "china-japan", "c. 365–427", "Chinese poet who left office to farm and write about wine, chrysanthemums and the quiet life."),
  v("li-bai", "Li Bai", "china-japan", "701–762", "One of the great poets of the Tang dynasty, famed for moonlight and wandering."),
  v("kamo-no-chomei", "Kamo no Chōmei", "china-japan", "1155–1216", "Japanese poet who gave up court life for a small hut and wrote of impermanence."),
  v("yoshida-kenko", "Yoshida Kenkō", "china-japan", "c. 1283–1350", "Buddhist monk and essayist, author of Essays in Idleness."),
  v("basho", "Matsuo Bashō", "china-japan", "1644–1694", "The master of the haiku, who made journeys on foot into poems."),
  v("issa", "Kobayashi Issa", "china-japan", "1763–1828", "Japanese haiku poet, tender toward small creatures and hard losses."),

  // ---- India and Nepal ----
  v("dhammapada", "The Dhammapada", "south-asia", undefined, "A collection of verses attributed to the Buddha, among the best loved of Buddhist texts.", true),
  v("bhagavad-gita", "The Bhagavad Gita", "south-asia", undefined, "A dialogue on duty and action between Arjuna and Krishna, within the Mahabharata.", true),
  v("shantideva", "Shantideva", "south-asia", "8th century", "Indian Buddhist monk and poet, author of The Way of the Bodhisattva.", true),
  v("thiruvalluvar", "Thiruvalluvar", "south-asia", undefined, "Tamil poet of the Tirukkural, 1,330 couplets on virtue, wealth and love. His dates are uncertain."),
  v("kabir", "Kabir", "south-asia", "c. 1440–1518", "A weaver and mystic poet of Varanasi, loved by Hindus and Muslims alike.", true),
  v("tagore", "Rabindranath Tagore", "south-asia", "1861–1941", "Bengali poet, painter and educator; the first non-European to win the Nobel Prize in Literature."),
  v("devkota", "Laxmi Prasad Devkota", "south-asia", "1909–1959", "Nepali poet and playwright, called the Mahakavi, the great poet."),

  // ---- Persia, the Arab world and Islam ----
  v("quran", "Qur'an", "middle-east", undefined, "The scripture of Islam.", true),
  v("ibn-sina", "Ibn Sina", "middle-east", "c. 980–1037", "Known in the West as Avicenna: physician and philosopher of Persia."),
  v("ibn-hazm", "Ibn Hazm", "middle-east", "994–1064", "Andalusian scholar and poet, author of The Ring of the Dove on love."),
  v("omar-khayyam", "Omar Khayyám", "middle-east", "1048–1131", "Persian mathematician, astronomer and poet of the Rubáiyát."),
  v("attar", "Farid ud-Din Attar", "middle-east", "c. 1145–c. 1221", "Persian Sufi poet of The Conference of the Birds.", true),
  v("ibn-arabi", "Ibn Arabi", "middle-east", "1165–1240", "Andalusian Sufi mystic and philosopher, called the greatest master.", true),
  v("rumi", "Rumi", "middle-east", "1207–1273", "Persian poet and Sufi teacher of Konya, author of the Masnavi.", true),
  v("saadi", "Saadi", "middle-east", "c. 1210–1291", "Poet of Shiraz, whose Gulistan and Bustan are among the most quoted works in Persian.", false),
  v("darwish", "Mahmoud Darwish", "middle-east", "1941–2008", "Palestinian poet of exile, home and the ordinary beauty of the earth."),

  // ---- Jewish and Christian voices ----
  v("ecclesiastes", "Ecclesiastes", "abrahamic", undefined, "A book of the Hebrew Bible: the Preacher on time, toil and what endures.", true),
  v("hillel", "Hillel", "abrahamic", "c. 110 BCE–10 CE", "Jewish sage of the Second Temple period, known for the golden rule and for patience.", true),
  v("julian-of-norwich", "Julian of Norwich", "abrahamic", "c. 1342–after 1416", "English anchoress and mystic, the first woman known to have written a book in English.", true),

  // ---- Europe ----
  v("montaigne", "Michel de Montaigne", "europe", "1533–1592", "French essayist who made himself his subject and found everyone in it."),
  v("pascal", "Blaise Pascal", "europe", "1623–1662", "French mathematician and thinker, author of the Pensées."),
  v("spinoza", "Baruch Spinoza", "europe", "1632–1677", "Dutch philosopher who lived by grinding lenses and wrote the Ethics."),
  v("voltaire", "Voltaire", "europe", "1694–1778", "French writer of wit and tolerance."),
  v("diderot", "Denis Diderot", "europe", "1713–1784", "Editor of the Encyclopédie, the great Enlightenment project to gather all knowledge."),
  v("keats", "John Keats", "europe", "1795–1821", "English Romantic poet who died at 25 and left some of the most loved odes in the language."),
  v("george-eliot", "George Eliot", "europe", "1819–1880", "The pen name of Mary Ann Evans, English novelist of moral insight."),
  v("woolf", "Virginia Woolf", "europe", "1882–1941", "English novelist and essayist of inner life and ordinary days."),
  v("rilke", "Rainer Maria Rilke", "europe", "1875–1926", "Bohemian-Austrian poet, whose Letters to a Young Poet have steadied many writers."),
  v("weil", "Simone Weil", "europe", "1909–1943", "French philosopher and mystic, who wrote on attention, affliction and obligation."),
  v("kierkegaard", "Søren Kierkegaard", "existential", "1813–1855", "Danish philosopher and the first great voice of existential thought."),

  // ---- The Americas ----
  v("emerson", "Ralph Waldo Emerson", "americas", "1803–1882", "American essayist and lecturer of self-reliance and attention to the ordinary."),
  v("thoreau", "Henry David Thoreau", "nature", "1817–1862", "American writer who lived by Walden Pond and wrote about living deliberately."),
  v("whitman", "Walt Whitman", "americas", "1819–1892", "American poet of Leaves of Grass, who sang the self and the crowd."),
  v("dickinson", "Emily Dickinson", "americas", "1830–1886", "American poet of small rooms and large silences."),
  v("gibran", "Kahlil Gibran", "middle-east", "1883–1931", "Lebanese-American poet and painter, author of The Prophet."),
];

export const VOICES: Readonly<Record<string, Voice>> = Object.freeze(Object.fromEntries(VOICE_LIST.map((x) => [x.id, x])));

export function traditionLabel(id: Tradition): string {
  return TRADITIONS.find((t) => t.id === id)?.label ?? id;
}
