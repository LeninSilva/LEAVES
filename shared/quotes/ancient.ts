import { after, quote as q, type Quote } from "./helper.js";

/** Egypt, Greece and Rome. Translations are named where they are public domain. */
export const ANCIENT: Quote[] = [
  q("ptahhotep", "Be not proud because thou art learned; but discourse with the ignorant man, as with the sage.", "The Instruction of Ptah-hotep, trans. Battiscombe Gunn (1906)", ["humility", "knowledge"]),
  q("ptahhotep", "Fair speech is more rare than the emerald that is found by slave-maidens on the pebbles.", "The Instruction of Ptah-hotep, trans. Battiscombe Gunn (1906)", ["virtue", "friendship"]),

  q("plato", "Wonder is the feeling of a philosopher, and philosophy begins in wonder.", "Theaetetus 155d, trans. Benjamin Jowett (1892)", ["wonder", "knowledge"]),
  q("socrates", "I do not fancy that I know what I do not know.", "in Plato's Apology 21d", ["humility", "knowledge"], after),

  q("aristotle", "For without friends no one would choose to live, though he had all other goods.", "Nicomachean Ethics VIII.1, trans. W. D. Ross (1908)", ["friendship", "love"]),
  q("aristotle", "We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.", "Nicomachean Ethics II.1, trans. W. D. Ross (1908)", ["virtue", "courage", "work"]),
  q("aristotle", "It is owing to their wonder that men both now begin and at first began to philosophize.", "Metaphysics I.2, trans. W. D. Ross (1908)", ["wonder", "knowledge"]),

  q("heraclitus", "Nature loves to hide.", "fragment 123", ["nature", "wonder"], after),
  q("epicurus", "Do not spoil what you have by desiring what you have not; remember that what you now have was once among the things you only hoped for.", "Vatican Sayings 35", ["gratitude", "joy"], after),

  q("epictetus", "Some things are in our control, and others not.", "Enchiridion 1, trans. T. W. Higginson (1865)", ["self", "peace"]),
  q("epictetus", "Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.", "Enchiridion 8, trans. T. W. Higginson (1865)", ["peace", "change"]),

  q("marcus-aurelius", "The best way of avenging thyself is not to become like the wrong doer.", "Meditations VI.6, trans. George Long (1862)", ["virtue", "peace"]),
  q("marcus-aurelius", "No longer talk at all about the kind of man that a good man ought to be, but be such.", "Meditations X.16, trans. George Long (1862)", ["virtue", "work"]),
  q("marcus-aurelius", "The soul is dyed by the thoughts.", "Meditations V.16, trans. George Long (1862)", ["self", "knowledge"]),

  q("seneca", "We suffer more often in imagination than in reality.", "Letter 13, trans. Richard M. Gummere (1917)", ["courage", "peace"]),
  q("seneca", "It is not that we have a short time to live, but that we waste much of it.", "On the Shortness of Life 1", ["time", "attention"], after),

  q("plutarch", "The mind is not a vessel to be filled but a fire to be kindled.", "On Listening to Lectures", ["knowledge", "wonder"], after),
  q("cicero", "If you have a garden and a library, you have everything you need.", "letter to Varro (46 BCE)", ["peace", "nature", "knowledge"], after),
];
