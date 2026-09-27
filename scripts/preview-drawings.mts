import sharp from "sharp";
import { drawIllustration } from "/home/user/LEAVES/src/illustration/drawn";
import { MOTIFS } from "/home/user/LEAVES/shared/schema";
const out = process.argv[2];
const times = ["afternoon","evening","night","morning","dawn","afternoon"] as const;
const moods = ["calm","joyful","tender","wistful","heavy","hopeful"] as const;
const seasons = ["summer","autumn","winter","spring"] as const;
const tiles: Buffer[] = [];
for (let i = 0; i < MOTIFS.length; i++) {
  const svg = drawIllustration({ seed: "s" + i, motif: MOTIFS[i], mood: moods[i%6], timeOfDay: times[i%6], season: seasons[i%4] });
  tiles.push(await sharp(Buffer.from(svg)).resize(300,300).png().toBuffer());
}
const comp = tiles.map((b, i) => ({ input: b, left: (i%4)*300, top: Math.floor(i/4)*300 }));
await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#fff" } }).composite(comp).png().toFile(out);
