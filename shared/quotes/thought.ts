import { after, quote as q, type Quote } from "./helper.js";

/**
 * Existentialists and phenomenologists, virtue ethicists, philosophers of today,
 * and voices for justice and liberation. Lines from living philosophers are short,
 * and come from published work or from papers shared openly or in public lectures.
 */
export const THOUGHT: Quote[] = [
  // ---- existentialists and phenomenologists ----
  q("sartre", "Man is nothing else but what he makes of himself.", "Existentialism Is a Humanism (1946)", ["self", "freedom", "work"]),
  q("camus", "In the midst of winter, I found there was, within me, an invincible summer.", "“Return to Tipasa” (1952)", ["hope", "courage", "nature"]),
  q("camus", "The struggle itself toward the heights is enough to fill a man's heart. One must imagine Sisyphus happy.", "The Myth of Sisyphus (1942)", ["struggle", "joy", "work"]),
  q("camus", "There are more things to admire in men than to despise.", "The Plague (1947)", ["virtue", "hope", "friendship"], after),
  q("beauvoir", "To will oneself free is also to will others free.", "The Ethics of Ambiguity, trans. Bernard Frechtman (1948)", ["freedom", "justice", "love"]),
  q("beauvoir", "One is not born, but rather becomes, a woman.", "The Second Sex (1949)", ["self", "change", "freedom"]),
  q("merleau-ponty", "The world is not what I think, but what I live through.", "Phenomenology of Perception, trans. Colin Smith (1962)", ["attention", "wonder", "self"]),
  q("kierkegaard", "Anxiety is the dizziness of freedom.", "The Concept of Anxiety (1844)", ["freedom", "courage"]),
  q("arendt", "The miracle that saves the world, the realm of human affairs, from its normal, “natural” ruin is ultimately the fact of natality, in which the faculty of action is ontologically rooted.", "The Human Condition (1958)", ["hope", "change", "freedom"]),
  q("weil", "Absolutely unmixed attention is prayer.", "Gravity and Grace (1947)", ["attention", "peace"]),
  q("weil", "The love of our neighbor in all its fullness simply means being able to say to him: “What are you going through?”", "Waiting for God (1950)", ["love", "attention", "virtue"]),

  // ---- virtue, care and the good life ----
  q("murdoch", "Love is the extremely difficult realisation that something other than oneself is real.", "“The Sublime and the Good” (1959)", ["love", "attention", "humility"]),
  q("murdoch", "Attention is the idea of a just and loving gaze directed upon an individual reality.", "The Sovereignty of Good (1970)", ["attention", "love", "virtue"], after),
  q("hursthouse", "An action is right if and only if it is what a virtuous agent would, characteristically, do in the circumstances.", "On Virtue Ethics (1999)", ["virtue", "knowledge"]),
  q("annas", "A virtue, like a skill, has to be learned, and it comes with a drive to aspire to do it better.", "Intelligent Virtue (2011)", ["virtue", "work", "knowledge"], after),
  q("norlock", "I remain pessimistic, but I do not despair.", "“Perpetual Struggle,” Hypatia (2018)", ["hope", "struggle", "courage"]),
  q("norlock", "Wisdom can be lost.", "“Perpetual Struggle,” Hypatia (2018)", ["knowledge", "time"]),
  q("norlock", "No skilled housekeeper thinks one washing should keep the dishes away forever.", "“Perpetual Struggle,” Hypatia (2018)", ["work", "virtue", "time"]),
  q("norlock", "Practices are not only compatible with enjoyments; they are motivated and sustained by pleasure, too.", "“Perpetual Struggle,” Hypatia (2018)", ["joy", "work", "struggle"]),
  q("norlock", "Natality requires us to teach the lessons of history over again, but natality also provides us with sources of joy in educating.", "“Perpetual Struggle,” Hypatia (2018)", ["hope", "knowledge", "joy"]),
  q("ruddick", "Peacemaking is always specific.", "Maternal Thinking (1989)", ["peace", "attention", "justice"]),
  q("schwitzgebel", "To have an attitude is, at root, to live a certain way.", "“A Dispositional Approach to Attitudes” (2013)", ["self", "virtue"]),
  q("leopold", "That the situation is hopeless should not prevent us from doing our best.", "letter, quoted in Curt Meine, Aldo Leopold: His Life and Work (1988)", ["hope", "struggle", "nature"]),

  // ---- philosophers of today ----
  q("noe", "Perception itself is the exercise of care; it is the work of achieving and sustaining relationships of knowledge and intimacy.", "“Perception as a Relationship,” in The Relational View of Perception (Routledge)", ["attention", "love", "knowledge"]),
  q("noe", "You never manage to perceive more than you care about.", "“Perception as a Relationship,” in The Relational View of Perception (Routledge)", ["attention", "love"]),
  q("ginsborg", "The motivation would seem, then, to lie in the children's sense of what they're doing as appropriate, as called for by the situation.", "Normativity Without Reasons, New York Institute of Philosophy lectures (2024)", ["knowledge", "wonder"]),
  q("ginsborg", "We can do better than the child because we've seen a much broader range of examples, and we can draw on these to make much more refined distinctions.", "Normativity Without Reasons, New York Institute of Philosophy lectures (2024)", ["knowledge", "time"]),
  q("searle", "Roughly speaking, whether or not a work is literature is for the readers to decide, whether or not it is fiction is for the author to decide.", "“The Logical Status of Fictional Discourse,” New Literary History (1975)", ["knowledge", "wonder"]),
  q("cherry", "Anger can be a force for good on the battlefield for justice.", "The Case for Rage (2021)", ["justice", "struggle", "love"]),

  // ---- justice and liberation ----
  q("marx", "The philosophers have only interpreted the world, in various ways; the point, however, is to change it.", "Theses on Feuerbach, XI (1845)", ["change", "work", "justice"]),
  q("marx", "In place of the old bourgeois society we shall have an association, in which the free development of each is the condition for the free development of all.", "The Communist Manifesto, trans. Samuel Moore (1888)", ["freedom", "justice", "friendship"]),
  q("marx", "Assume man to be man and his relation to the world to be a human one: then love can be exchanged only for love, trust for trust.", "Economic and Philosophic Manuscripts of 1844", ["love", "justice", "virtue"], after),
  q("engels", "Freedom is the recognition of necessity.", "Anti-Dühring (1878)", ["freedom", "knowledge"], after),
  q("mao", "If you want to know the taste of a pear, you must change the pear by eating it yourself.", "On Practice (1937)", ["knowledge", "work", "change"]),
  q("mao", "If you want knowledge, you must take part in the practice of changing reality.", "On Practice (1937)", ["knowledge", "work", "change"]),
  q("che", "Above all, always be capable of feeling deeply any injustice committed against anyone, anywhere in the world. This is the most beautiful quality in a revolutionary.", "farewell letter to his children (1965)", ["justice", "love", "virtue"]),
  q("che", "The true revolutionary is guided by great feelings of love.", "“Socialism and Man in Cuba” (1965)", ["love", "justice", "virtue"], after),
  q("fidel", "Revolution means to have a sense of history; it is changing everything that must be changed; it is full equality and freedom; it is being treated and treating others like human beings.", "speech, 1 May 2000", ["justice", "freedom", "change"]),
  q("king", "Injustice anywhere is a threat to justice everywhere.", "Letter from Birmingham Jail (1963)", ["justice", "courage"]),
  q("king", "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.", "Strength to Love (1963)", ["love", "hope", "justice"]),
  q("lorde", "Caring for myself is not self-indulgence, it is self-preservation, and that is an act of political warfare.", "A Burst of Light (1988)", ["self", "justice", "courage"]),
  q("hooks", "Love is an action, never simply a feeling.", "All About Love (2000)", ["love", "work", "virtue"]),
  q("baldwin", "Not everything that is faced can be changed, but nothing can be changed until it is faced.", "“As Much Truth as One Can Bear” (1962)", ["change", "courage", "knowledge"]),
  q("douglass", "If there is no struggle, there is no progress.", "“West India Emancipation” (1857)", ["struggle", "justice", "change"]),
  q("angelou", "You may trod me in the very dirt / But still, like dust, I'll rise.", "“Still I Rise” (1978)", ["courage", "hope", "struggle"]),
  q("mandela", "I learned that courage was not the absence of fear, but the triumph over it.", "Long Walk to Freedom (1994)", ["courage", "struggle"]),
  q("adichie", "The problem with stereotypes is not that they are untrue, but that they are incomplete.", "“The Danger of a Single Story” (2009)", ["knowledge", "justice", "attention"]),
];
