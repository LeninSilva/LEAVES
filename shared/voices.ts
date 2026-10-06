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

  // ---- added: antiquity ----
  v("plato", "Plato", "antiquity", "c. 428–348 BCE", "Athenian philosopher, student of Socrates and founder of the Academy. His dialogues are where Socrates still speaks."),
  v("plutarch", "Plutarch", "antiquity", "c. 46–c. 120 CE", "Greek biographer and essayist of Chaeronea, who wrote the Parallel Lives and the Moralia."),
  v("cicero", "Cicero", "antiquity", "106–43 BCE", "Roman statesman, orator and philosopher, whose letters read like conversation."),

  // ---- added: China and Japan ----
  v("dogen", "Dōgen", "china-japan", "1200–1253", "Japanese Zen master who founded the Sōtō school and wrote of practice as awakening itself.", true),
  v("ryokan", "Ryōkan", "china-japan", "1758–1831", "Japanese Zen monk and poet who lived simply in a hut and played with the village children."),
  v("chiyo-ni", "Chiyo-ni", "china-japan", "1703–1775", "Japanese haiku poet, among the most admired women poets of her time."),

  // ---- added: India and Nepal ----
  v("buddha", "The Buddha", "south-asia", "c. 5th century BCE", "Siddhartha Gautama, who taught the end of suffering through understanding, kindness and attention.", true),
  v("gandhi", "Mohandas Gandhi", "south-asia", "1869–1948", "Leader of India's independence movement, who held that nonviolence is the strongest force there is."),

  // ---- added: Persia, the Arab world and Islam ----
  v("rabia", "Rabia al-Adawiyya", "middle-east", "c. 717–801", "Sufi saint and poet of Basra, remembered for loving God for God's own sake.", true),
  v("ali", "Ali ibn Abi Talib", "middle-east", "601–661", "Cousin and son-in-law of the Prophet Muhammad and the fourth caliph. Nahj al-Balagha gathers his sermons and letters, and is cherished by Shia Muslims.", true),

  // ---- added: Jewish and Christian voices ----
  v("proverbs", "The Book of Proverbs", "abrahamic", undefined, "Wisdom sayings of the Hebrew Bible.", true),
  v("psalms", "The Psalms", "abrahamic", undefined, "The songs and prayers of the Hebrew Bible.", true),
  v("micah", "Micah", "abrahamic", "8th century BCE", "A prophet of ancient Israel who asked what is truly required of us.", true),
  v("song-of-songs", "The Song of Songs", "abrahamic", undefined, "A love poem of the Hebrew Bible, full of spring.", true),
  v("gospel-matthew", "The Gospel of Matthew", "abrahamic", undefined, "One of the four accounts of the life and teaching of Jesus.", true),
  v("paul", "Paul of Tarsus", "abrahamic", "died c. 64", "Apostle and letter writer of the early Christian movement.", true),
  v("augustine", "Augustine of Hippo", "abrahamic", "354–430", "North African bishop and philosopher, author of the Confessions.", true),
  v("teresa", "Teresa of Ávila", "abrahamic", "1515–1582", "Spanish Carmelite nun, mystic and reformer, and the first woman named a Doctor of the Church.", true),
  v("buber", "Martin Buber", "abrahamic", "1878–1965", "Jewish philosopher of dialogue, who wrote that real life is meeting.", true),
  v("heschel", "Abraham Joshua Heschel", "abrahamic", "1907–1972", "Rabbi, philosopher and civil rights ally, who wrote of wonder and of the holiness of time.", true),
  v("francis", "Pope Francis", "abrahamic", "1936–2025", "The first pope from the Americas, who wrote on mercy, the poor and care for our common home.", true),
  v("leo-xiv", "Pope Leo XIV", "abrahamic", "born 1955", "Elected in May 2025, the first pope born in the United States; a missionary in Peru before he was a bishop.", true),
  v("king", "Martin Luther King Jr.", "justice", "1929–1968", "Baptist minister and leader of the American civil rights movement."),

  // ---- added: Europe ----
  v("blake", "William Blake", "europe", "1757–1827", "English poet and engraver who saw the infinite in small things."),
  v("wordsworth", "William Wordsworth", "europe", "1770–1850", "English Romantic poet of walking, memory and ordinary people."),
  v("tennyson", "Alfred, Lord Tennyson", "europe", "1809–1892", "English poet of In Memoriam, a long song of grief and faith."),
  v("shelley", "Percy Bysshe Shelley", "europe", "1792–1822", "English Romantic poet of wind, change and hope."),
  v("rossetti", "Christina Rossetti", "europe", "1830–1894", "English poet of devotion, longing and clear small images."),
  v("hopkins", "Gerard Manley Hopkins", "europe", "1844–1889", "English Jesuit poet who heard the whole of nature singing."),
  v("yeats", "W. B. Yeats", "europe", "1865–1939", "Irish poet and Nobel laureate."),
  v("frost", "Robert Frost", "americas", "1874–1963", "American poet of New England fields, woods and plain speech."),
  v("wilde", "Oscar Wilde", "europe", "1854–1900", "Irish writer of wit, who also knew what it is to be in the gutter."),
  v("cather", "Willa Cather", "americas", "1873–1947", "American novelist of the prairie and of the people who settled it."),
  v("barrett-browning", "Elizabeth Barrett Browning", "europe", "1806–1861", "English poet of Aurora Leigh and Sonnets from the Portuguese."),
  v("anne-frank", "Anne Frank", "europe", "1929–1945", "A young diarist who wrote in hiding in Amsterdam during the war."),
  v("dostoevsky", "Fyodor Dostoevsky", "europe", "1821–1881", "Russian novelist of conscience, doubt and forgiveness."),
  v("kant", "Immanuel Kant", "europe", "1724–1804", "German philosopher of Königsberg who asked what we can know, what we ought to do and what we may hope."),
  v("rousseau", "Jean-Jacques Rousseau", "europe", "1712–1778", "Genevan philosopher and writer of The Social Contract and the Confessions."),
  v("wollstonecraft", "Mary Wollstonecraft", "europe", "1759–1797", "English writer who argued for the education and equality of women."),
  v("descartes", "René Descartes", "europe", "1596–1650", "French philosopher who began by doubting everything and found he could not doubt that he was thinking."),
  v("nietzsche", "Friedrich Nietzsche", "existential", "1844–1900", "German philosopher of becoming who you are, of the body and of loyalty to the earth."),
  v("machado", "Antonio Machado", "europe", "1875–1939", "Spanish poet of roads, orchards and plain wisdom."),

  // ---- added: existentialists and phenomenologists ----
  v("sartre", "Jean-Paul Sartre", "existential", "1905–1980", "French philosopher and writer who held that we are what we make of ourselves."),
  v("camus", "Albert Camus", "existential", "1913–1960", "French-Algerian writer of the absurd, and of the revolt that refuses despair."),
  v("beauvoir", "Simone de Beauvoir", "existential", "1908–1986", "French philosopher of freedom, ambiguity and the situation of women."),
  v("merleau-ponty", "Maurice Merleau-Ponty", "existential", "1908–1961", "French phenomenologist who showed that perception begins in the living body."),
  v("arendt", "Hannah Arendt", "existential", "1906–1975", "Political thinker of action, plurality and beginning anew."),

  // ---- added: virtue, care and the good life ----
  v("murdoch", "Iris Murdoch", "virtue", "1919–1999", "Irish-born philosopher and novelist who wrote that morality is a matter of attention and love."),
  v("hursthouse", "Rosalind Hursthouse", "virtue", "born 1943", "New Zealand philosopher whose On Virtue Ethics set out a modern account of acting as a virtuous person would."),
  v("annas", "Julia Annas", "virtue", "born 1942", "Philosopher of ancient ethics, who compares learning a virtue to learning a skill."),
  v("norlock", "Kathryn J. Norlock", "virtue", undefined, "Feminist philosopher of forgiveness, hope and living well in a world that doesn't get fixed."),
  v("ruddick", "Sara Ruddick", "virtue", "1935–2011", "American philosopher of maternal thinking and peacemaking."),
  v("schwitzgebel", "Eric Schwitzgebel", "virtue", undefined, "Philosopher of belief, attitude and the strangeness of the mind."),

  // ---- added: philosophers of today ----
  v("noe", "Alva Noë", "today", "born 1964", "Philosopher at Berkeley who argues that consciousness is something we do together with the world, and that perception is a form of care."),
  v("ginsborg", "Hannah Ginsborg", "today", undefined, "Philosopher at Berkeley, who writes on Kant, on judgment and on the ordinary sense of what fits."),
  v("searle", "John Searle", "today", "born 1932", "American philosopher of language and mind, who worked out what we do when we speak."),
  v("cherry", "Myisha Cherry", "today", undefined, "Philosopher of anger, love and justice, and host of the UnMute podcast."),

  // ---- added: justice and liberation ----
  v("marx", "Karl Marx", "justice", "1818–1883", "German philosopher and economist who wanted not only to understand the world but to change it."),
  v("engels", "Friedrich Engels", "justice", "1820–1895", "German philosopher, Marx's friend and collaborator."),
  v("mao", "Mao Zedong", "justice", "1893–1976", "Leader of the Chinese Communist revolution. His essay On Practice is about how knowledge is made."),
  v("che", "Che Guevara", "justice", "1928–1967", "Argentine doctor who became a leader of the Cuban Revolution."),
  v("fidel", "Fidel Castro", "justice", "1926–2016", "Leader of the Cuban Revolution."),
  v("lorde", "Audre Lorde", "africa", "1934–1992", "Black lesbian poet, essayist and warrior, who wrote that our silences will not protect us."),
  v("hooks", "bell hooks", "africa", "1952–2021", "American writer and teacher on race, class, gender and love."),
  v("baldwin", "James Baldwin", "africa", "1924–1987", "American novelist and essayist who looked at America without flinching."),
  v("douglass", "Frederick Douglass", "africa", "c. 1818–1895", "Born into slavery, he became a writer, speaker and leading abolitionist."),
  v("angelou", "Maya Angelou", "africa", "1928–2014", "American poet, memoirist and civil rights activist."),
  v("mandela", "Nelson Mandela", "africa", "1918–2013", "Freed after 27 years in prison, he became South Africa's first democratically elected president."),
  v("adichie", "Chimamanda Ngozi Adichie", "africa", "born 1977", "Nigerian novelist and essayist."),
  v("havel", "Václav Havel", "europe", "1936–2011", "Playwright and dissident who became the president of a free Czechoslovakia."),

  // ---- added: the Americas ----
  v("neruda", "Pablo Neruda", "americas", "1904–1973", "Chilean poet and Nobel laureate, of love, the sea and common things."),
  v("garcia-marquez", "Gabriel García Márquez", "americas", "1927–2014", "Colombian novelist and Nobel laureate, author of One Hundred Years of Solitude."),
  v("mistral", "Gabriela Mistral", "americas", "1889–1957", "Chilean poet, teacher and the first Latin American Nobel laureate in literature."),
  v("marti", "José Martí", "americas", "1853–1895", "Cuban poet, essayist and leader of the struggle for independence."),
  v("parra", "Violeta Parra", "americas", "1917–1967", "Chilean singer, songwriter and folklorist."),

  // ---- added: nature writers ----
  v("muir", "John Muir", "nature", "1838–1914", "Scottish-American naturalist who helped save Yosemite and founded the Sierra Club."),
  v("carson", "Rachel Carson", "nature", "1907–1964", "American biologist and writer whose Silent Spring began the modern environmental movement."),
  v("leopold", "Aldo Leopold", "nature", "1887–1948", "American ecologist who wrote A Sand County Almanac and argued for a land ethic."),
  v("kimmerer", "Robin Wall Kimmerer", "nature", "born 1953", "Botanist and member of the Citizen Potawatomi Nation, author of Braiding Sweetgrass."),
  v("oliver", "Mary Oliver", "nature", "1935–2019", "American poet of attention, woods and ponds."),
  v("berry", "Wendell Berry", "nature", "born 1934", "Kentucky farmer, poet and essayist."),

  // ---- added: a further batch ----
  v("muhammad", "The Prophet Muhammad", "middle-east", "c. 570–632", "The Prophet of Islam. His sayings, the hadith, are gathered by many scholars.", true),
  v("horace", "Horace", "antiquity", "65–8 BCE", "Roman lyric poet of the Odes, who advised living well in the present."),
  v("terence", "Terence", "antiquity", "c. 195–159 BCE", "Roman playwright, born in North Africa and once enslaved, who wrote comedies of ordinary life."),
];

export const VOICES: Readonly<Record<string, Voice>> = Object.freeze(Object.fromEntries(VOICE_LIST.map((x) => [x.id, x])));

export function traditionLabel(id: Tradition): string {
  return TRADITIONS.find((t) => t.id === id)?.label ?? id;
}
