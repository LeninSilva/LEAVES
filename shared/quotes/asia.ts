import { after, quote as q, type Quote } from "./helper.js";

/** China, Japan, India and Nepal. */
export const ASIA: Quote[] = [
  q("confucius", "Learning without thought is labour lost; thought without learning is perilous.", "Analects II.15, trans. James Legge (1861)", ["knowledge", "humility"]),
  q("confucius", "When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it; this is knowledge.", "Analects II.17, trans. James Legge (1861)", ["knowledge", "humility"]),
  q("confucius", "What you do not want done to yourself, do not do to others.", "Analects XV.23, trans. James Legge (1861)", ["virtue", "justice"]),
  q("confucius", "When we see men of worth, we should think of equalling them; when we see men of a contrary character, we should turn inwards and examine ourselves.", "Analects IV.17, trans. James Legge (1861)", ["self", "virtue"]),
  q("confucius", "They who know the truth are not equal to those who love it, and they who love it are not equal to those who delight in it.", "Analects VI.20, trans. James Legge (1861)", ["knowledge", "joy", "love"]),
  q("confucius", "When I walk along with two others, they may serve me as my teachers.", "Analects VII.21, trans. James Legge (1861)", ["humility", "knowledge", "friendship"]),

  q("mencius", "The feeling of commiseration is the principle of benevolence.", "Mencius II.A.6, trans. James Legge (1895)", ["virtue", "love"]),
  q("mencius", "All things are already complete in us. There is no greater delight than to be conscious of sincerity on self-examination.", "Mencius VII.A.4, trans. James Legge (1895)", ["self", "joy"]),

  q("zhuangzi", "See how the minnows dart about! That is the happiness of fish.", "Autumn Floods, on the bridge over the Hao", ["joy", "nature", "wonder"], after),
  q("zhuangzi", "The perfect person uses the mind like a mirror: it grasps nothing, refuses nothing, receives but does not keep.", "chapter 7", ["peace", "attention"], after),

  q("laozi", "The highest excellence is like that of water.", "Tao Te Ching 8, trans. James Legge (1891)", ["nature", "humility", "virtue"]),

  q("dogen", "To study the way is to study the self; to study the self is to forget the self.", "Genjōkōan (1233)", ["self", "attention"], after),
  q("ryokan", "The thief left it behind: the moon at my window.", "poem", ["nature", "peace", "joy"], after),
  q("chiyo-ni", "Morning glory! The well bucket is taken, so I ask for water.", "haiku", ["nature", "gratitude", "wonder"], after),
  q("basho", "Every day is a journey, and the journey itself is home.", "The Narrow Road to the Deep North (1702)", ["time", "peace", "nature"], after),

  q("dhammapada", "Not to commit any sin, to do good, and to purify one's mind, that is the teaching of the Awakened.", "verse 183, trans. F. Max Müller (1881)", ["virtue", "peace"]),
  q("dhammapada", "If one man conquer in battle a thousand times a thousand men, and if another conquer himself, he is the greatest of conquerors.", "verse 103, trans. F. Max Müller (1881)", ["self", "courage", "struggle"]),
  q("dhammapada", "Let a man overcome anger by love, let him overcome evil by good.", "verse 223, trans. F. Max Müller (1881)", ["peace", "virtue", "love"]),
  q("dhammapada", "Self is the lord of self, who else could be the lord?", "verse 160, trans. F. Max Müller (1881)", ["self", "freedom"]),
  q("buddha", "Just as a mother would protect her only child at the risk of her own life, so let one cultivate a boundless heart towards all beings.", "Metta Sutta (Sutta Nipata 1.8)", ["love", "peace", "family"], after),
  q("buddha", "Do not go by hearsay or by what has been handed down; see for yourselves whether a thing is wholesome, and then keep to it.", "Kalama Sutta (Anguttara Nikaya 3.65)", ["knowledge", "freedom", "self"], after),

  q("tagore", "Let life be beautiful like summer flowers and death like autumn leaves.", "Stray Birds 82 (1916)", ["death", "nature", "joy"]),
  q("tagore", "The leaf becomes flower when it loves. The flower becomes fruit when it worships.", "Stray Birds (1916)", ["love", "nature", "change"]),
  q("tagore", "The dust receives insult and in return offers her flowers.", "Stray Birds (1916)", ["virtue", "nature"]),
  q("tagore", "Trees are the earth's endless effort to speak to the listening heaven.", "Fireflies (1928)", ["nature", "wonder"]),
  q("thiruvalluvar", "The deeper you dig the sand, the more the water springs; the more you learn, the more your wisdom flows.", "Tirukkural 396", ["knowledge", "work"], after),
  q("gandhi", "The weak can never forgive. Forgiveness is the attribute of the strong.", "Young India (1922)", ["courage", "virtue", "peace"]),
  q("gandhi", "Nonviolence is the greatest force at the disposal of humankind.", "Young India (1926)", ["peace", "justice", "courage"], after),
];
