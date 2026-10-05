import { after, quote as q, type Quote } from "./helper.js";

/**
 * The first 57 lines the app ever had, in their original order. People's
 * "already seen" marks refer to these by position, so nothing here is ever
 * reordered or removed; new quotations are only added after them.
 */
export const LEGACY: Quote[] = [
  q("epictetus", "Men are disturbed not by things, but by the principles and notions which they form concerning things.", "Enchiridion, trans. T. W. Higginson (1865)", ["self", "knowledge"]),
  q("marcus-aurelius", "Nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul.", "Meditations IV.3, trans. George Long (1862)", ["solitude", "peace", "self"]),
  q("seneca", "Nothing, Lucilius, is ours, except time.", "Letter 1, trans. Richard M. Gummere (1917)", ["time"]),
  q("heraclitus", "You cannot step twice into the same rivers; for fresh waters are ever flowing in upon you.", "trans. John Burnet (1892)", ["change", "time"]),
  q("laozi", "He who knows other men is discerning; he who knows himself is intelligent.", "Tao Te Ching 33, trans. James Legge (1891)", ["self", "knowledge"]),
  q("dhammapada", "All that we are is the result of what we have thought.", "verse 1, trans. F. Max Müller (1881)", ["self", "knowledge"]),
  q("kabir", "The river and its waves are one surf: where is the difference between the river and its waves?", "Songs of Kabir, trans. Rabindranath Tagore (1915)", ["wonder", "self"]),
  q("tagore", "The butterfly counts not months but moments, and has time enough.", "Fireflies (1928)", ["time", "joy"]),
  q("julian-of-norwich", "All shall be well, and all shall be well, and all manner of thing shall be well.", "Revelations of Divine Love, trans. Grace Warrack (1901)", ["hope"]),
  q("ecclesiastes", "To every thing there is a season, and a time to every purpose under the heaven.", "3:1, King James Version", ["time", "change"]),
  q("hillel", "If I am not for myself, who will be for me? If I am only for myself, what am I? If not now, when?", "Pirkei Avot 1:14", ["self", "courage"]),
  q("quran", "Indeed, with hardship comes ease.", "94:6", ["hope", "struggle"]),
  q("emerson", "The years teach much which the days never know.", "“Experience” (1844)", ["time"]),
  q("thoreau", "Heaven is under our feet as well as over our heads.", "Walden (1854)", ["nature", "wonder"]),
  q("whitman", "I exist as I am, that is enough.", "“Song of Myself,” Leaves of Grass", ["self", "joy"]),
  q("dickinson", "Hope is the thing with feathers / That perches in the soul.", "Poems, Second Series (1891)", ["hope"]),
  q("keats", "I am certain of nothing but of the holiness of the Heart's affections and the truth of Imagination.", "letter to Benjamin Bailey (1817)", ["love", "wonder"]),
  q("george-eliot", "What do we live for, if it is not to make life less difficult to each other?", "Middlemarch (1872)", ["friendship", "virtue", "love"]),
  q("woolf", "The great revelation perhaps never did come. Instead there were little daily miracles, illuminations, matches struck unexpectedly in the dark.", "To the Lighthouse (1927)", ["wonder", "attention"]),
  q("gibran", "Work is love made visible.", "The Prophet (1923)", ["work", "love"]),
  q("kierkegaard", "Life is understood backwards, but it must be lived forwards.", "journals (1843)", ["time", "knowledge"], after),
  // ---- Ancient Egypt and Greece ----
  q("ptahhotep", "Do not be proud of what you know. Ask the unlearned as well as the wise; no one has reached the limits of their craft.", "The Maxims of Ptahhotep (c. 2400 BCE)", ["humility", "knowledge"], after),
  q("ptahhotep", "Follow your heart as long as you live, and do not cut short the time for joy.", "The Maxims of Ptahhotep (c. 2400 BCE)", ["joy", "time"], after),
  q("socrates", "The unexamined life is not worth living.", "in Plato's Apology 38a, trans. Benjamin Jowett (1871)", ["knowledge", "self"]),
  q("aristotle", "For one swallow does not make a summer, nor does one day.", "Nicomachean Ethics I.7, trans. W. D. Ross (1908)", ["time", "virtue"]),
  q("epicurus", "Of all that wisdom gives us for a happy life, by far the greatest is friendship.", "Principal Doctrines 27", ["friendship", "joy"], after),
  // ---- China and Japan ----
  q("confucius", "Is it not delightful to have friends coming from distant quarters?", "Analects I.1, trans. James Legge (1861)", ["friendship", "joy"]),
  q("mencius", "The great man is he who does not lose his child's-heart.", "IV.2.12, trans. James Legge (1895)", ["virtue", "wonder"]),
  q("laozi", "The journey of a thousand li commenced with a single step.", "Tao Te Ching 64, trans. James Legge (1891)", ["courage", "change"]),
  q("zhuangzi", "Once upon a time, I, Chuang Tzŭ, dreamt I was a butterfly, fluttering hither and thither, to all intents and purposes a butterfly.", "trans. Herbert A. Giles (1889)", ["wonder", "self"]),
  q("tao-yuanming", "I pick chrysanthemums by the eastern hedge, and far off, unhurried, the southern hills come into view.", "“Drinking Wine,” poem 5 (c. 400)", ["nature", "peace"], after),
  q("li-bai", "I lift my head and look at the bright moon; I lower it and think of home.", "“Quiet Night Thought” (c. 726)", ["solitude", "family", "nature"], after),
  q("kamo-no-chomei", "The flowing river never stops, and yet its water is never the same.", "Hōjōki, An Account of My Hut (1212)", ["time", "change"], after),
  q("yoshida-kenko", "The most precious thing in life is its uncertainty.", "Essays in Idleness (c. 1330)", ["time", "wonder"], after),
  q("basho", "An old pond. A frog jumps in. The sound of water.", "haiku (1686)", ["nature", "attention", "wonder"], after),
  q("issa", "This world of dew is a world of dew, and yet, and yet.", "haiku (1819)", ["grief", "time"], after),
  // ---- India and Nepal ----
  q("tagore", "If you shed tears when you miss the sun, you also miss the stars.", "Stray Birds 6 (1916)", ["grief", "time", "nature"]),
  q("thiruvalluvar", "To speak harsh words when kind ones are at hand is to eat unripe fruit when ripe fruit is there.", "Tirukkural 100", ["virtue"], after),
  q("bhagavad-gita", "You have a right to your work, but never to its fruits.", "2.47", ["work", "struggle"], { paraphrase: true, religious: true }),
  q("dhammapada", "Hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.", "verse 5, trans. F. Max Müller (1881)", ["peace", "love"]),
  q("shantideva", "I could never find leather enough to cover the whole earth, but leather on the soles of my feet is enough.", "The Way of the Bodhisattva 5.13 (c. 700)", ["humility", "peace"], after),
  q("devkota", "A person is made great by the heart, not by birth.", "Muna Madan (1936)", ["virtue", "humility"], after),
  // ---- Persia, the Arab world and Muslim thinkers ----
  q("rumi", "Listen to the reed, and the tale it tells of separation.", "Masnavi I.1 (c. 1260)", ["grief", "love"], after),
  q("saadi", "Human beings are members of one body, made from one essence.", "Gulistan I.10 (1258)", ["justice", "friendship"], after),
  q("omar-khayyam", "A loaf of bread beneath the bough, a book of verse, and you beside me: the wilderness is paradise enough.", "Rubáiyát, in Edward FitzGerald's rendering (1859)", ["love", "nature", "joy"], after),
  q("attar", "The thirty birds crossed seven valleys to find their king, and found that what they were seeking was themselves.", "The Conference of the Birds (1177)", ["self", "wonder"], after),
  q("ibn-arabi", "My heart has become able to take on every form.", "The Interpreter of Desires XI (1215)", ["love", "self"], after),
  q("ibn-sina", "Even floating in the air, touching nothing and seeing nothing, a person would still know that they exist.", "the “floating man,” On the Soul (c. 1020)", ["self", "knowledge"], after),
  q("ibn-hazm", "Love begins in play and ends in earnest.", "The Ring of the Dove (1022)", ["love"], after),
  q("darwish", "We have on this earth what makes life worth living.", "“On This Earth” (1986)", ["joy", "nature"], after),
  // ---- Europe and the Encyclopédie ----
  q("montaigne", "The greatest thing in the world is to know how to belong to oneself.", "“Of Solitude,” Essays (1580)", ["self", "solitude"], after),
  q("pascal", "I have discovered that all the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.", "Pensées 139, trans. W. F. Trotter (1910)", ["solitude", "peace"]),
  q("spinoza", "But all things excellent are as difficult as they are rare.", "Ethics V, trans. R. H. M. Elwes (1883)", ["virtue", "struggle"]),
  q("voltaire", "We must cultivate our garden.", "Candide (1759)", ["work", "peace"]),
  q("diderot", "We gather what is known so that those who come after us, knowing more, may be happier and better.", "“Encyclopédie,” in the Encyclopédie (1755)", ["knowledge", "hope"], after),
  q("rilke", "Be patient toward all that is unsolved in your heart and try to love the questions themselves.", "Letters to a Young Poet, trans. M. D. Herter Norton (1934)", ["knowledge", "time", "hope"]),
  q("weil", "Attention is the rarest and purest form of generosity.", "letter to Joë Bousquet (1942)", ["attention", "love"]),
];
