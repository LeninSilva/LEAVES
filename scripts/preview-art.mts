import sharp from "sharp";
import { drawArt } from "../src/illustration/art";
import type { ArtSpec, Mood, Season, TimeOfDay } from "../shared/constants";

/** Renders a grid of drawings to look at: npx tsx scripts/preview-art.mts out.png [set] */
type Case = [ArtSpec, Mood, Season, TimeOfDay];
const A = (subject: ArtSpec["subject"], arrangement: ArtSpec["arrangement"], setting: ArtSpec["setting"], weather: ArtSpec["weather"], light: ArtSpec["light"], accents: ArtSpec["accents"], focus: ArtSpec["focus"] = "center"): ArtSpec => ({ subject, arrangement, setting, weather, light, accents, focus });

const sets: Record<string, Case[]> = {
  a: [
    [A("lantern", "reaching", "meadow", "clear", "glow", ["fireflies"]), "grateful", "autumn", "evening"],
    [A("birds", "together", "meadow", "clear", "soft", ["flowers"], "left"), "tender", "spring", "morning"],
    [A("path", "apart", "hills", "mist", "soft", []), "curious", "summer", "morning"],
    [A("stones", "alone", "shore", "clear", "soft", ["birds in flight"], "right"), "calm", "summer", "afternoon"],
    [A("tree", "alone", "hills", "wind", "dim", ["falling leaves"], "left"), "heavy", "autumn", "afternoon"],
    [A("sapling", "alone", "garden", "clear", "rays", ["butterflies"]), "hopeful", "spring", "dawn"],
    [A("candle", "alone", "indoors", "rain", "glow", []), "wistful", "winter", "night"],
    [A("fox", "together", "meadow", "stars", "soft", ["fireflies"]), "tired", "summer", "night"],
    [A("lighthouse", "alone", "shore", "mist", "glow", []), "restless", "autumn", "evening"],
    [A("kite", "together", "sky", "wind", "soft", []), "joyful", "summer", "afternoon"],
    [A("open book", "alone", "indoors", "clear", "soft", ["petals"]), "curious", "spring", "afternoon"],
    [A("door", "alone", "meadow", "clear", "glow", ["tall grass"], "right"), "hopeful", "summer", "evening"],
    [A("boat", "apart", "water", "clear", "soft", ["birds in flight"]), "wistful", "summer", "evening"],
    [A("house", "alone", "hills", "snow", "glow", []), "tender", "winter", "night"],
    [A("umbrella", "together", "meadow", "rain", "soft", ["flowers"]), "tender", "spring", "afternoon"],
    [A("moon", "alone", "water", "stars", "soft", []), "calm", "summer", "night"],
  ],
  b: [
    [A("teacup", "together", "indoors", "rain", "soft", []), "grateful", "autumn", "morning"],
    [A("letter", "alone", "meadow", "clear", "soft", ["petals"]), "tender", "spring", "afternoon"],
    [A("nest", "gathered", "meadow", "clear", "soft", []), "hopeful", "spring", "morning"],
    [A("mountain", "alone", "mountains", "clear", "rays", ["birds in flight"]), "hopeful", "summer", "dawn"],
    [A("flowers", "gathered", "garden", "clear", "soft", ["butterflies"]), "joyful", "summer", "afternoon"],
    [A("bench", "alone", "meadow", "clear", "soft", ["falling leaves"]), "wistful", "autumn", "evening"],
    [A("bridge", "alone", "meadow", "clear", "soft", ["flowers"]), "calm", "summer", "morning"],
    [A("paper boat", "reaching", "water", "rain", "soft", []), "restless", "spring", "afternoon"],
    [A("birds", "reaching", "meadow", "clear", "soft", []), "hopeful", "summer", "morning"],
    [A("tree", "together", "hills", "clear", "glow", ["fireflies"]), "grateful", "summer", "evening"],
    [A("lantern", "alone", "indoors", "stars", "glow", []), "calm", "winter", "night"],
    [A("stones", "gathered", "meadow", "clear", "soft", []), "restless", "summer", "afternoon"],
    [A("birds", "apart", "sky", "clear", "soft", []), "wistful", "autumn", "evening"],
    [A("path", "together", "meadow", "clear", "rays", ["flowers"]), "grateful", "summer", "afternoon"],
    [A("house", "reaching", "hills", "clear", "glow", ["fireflies"]), "tender", "autumn", "night"],
    [A("sapling", "gathered", "garden", "rain", "soft", []), "hopeful", "spring", "morning"],
  ],
};

const out = process.argv[2];
const cases = sets[process.argv[3] ?? "a"];
const tiles: Buffer[] = [];
for (let i = 0; i < cases.length; i++) {
  const [art, mood, season, timeOfDay] = cases[i];
  const svg = drawArt({ seed: "preview-" + i, art, mood, season, timeOfDay });
  tiles.push(await sharp(Buffer.from(svg)).resize(300, 300).png().toBuffer());
}
await sharp({ create: { width: 1200, height: 1200, channels: 3, background: "#fff" } })
  .composite(tiles.map((b, i) => ({ input: b, left: (i % 4) * 300, top: Math.floor(i / 4) * 300 })))
  .png()
  .toFile(out);
