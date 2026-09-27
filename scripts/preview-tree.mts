// Renders the tree at a few sizes to a PNG for a quick visual check (dev only).
import sharp from "sharp";
import { layoutTree } from "../src/components/Tree";
import { LEAF_PATH } from "../src/components/LeafShape";
const colors = ["#86ad8f", "#e8b54a", "#d98e8a", "#c2a24c", "#8dbf6a", "#6fa3a8", "#9db9be", "#d9985f", "#a5a384", "#5e7a66"];
const tiles: Buffer[] = [];
for (const n of [1, 12, 48, 150]) {
  const l = layoutTree(n);
  const seg = (s: any) => `M${s.x0},${s.y0} Q${(s.x0 + s.x1) / 2 + (s.y1 - s.y0) * 0.08},${(s.y0 + s.y1) / 2 - (s.x1 - s.x0) * 0.08} ${s.x1},${s.y1}`;
  const all = [l.trunk, ...l.branches.flat()];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300"><rect width="400" height="300" fill="#eaf0e3"/>
${all.map((s) => `<path d="${seg(s)}" stroke="#4a3b2c" stroke-width="${s.width + 2.2}" stroke-linecap="round" fill="none"/>`).join("")}
${all.map((s) => `<path d="${seg(s)}" stroke="#6b5641" stroke-width="${s.width}" stroke-linecap="round" fill="none"/>`).join("")}
${l.leaves.map((p, i) => `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.scale * 0.9})"><path d="${LEAF_PATH}" fill="${colors[i % 10]}" stroke="#4a3b2c" stroke-width="1.3"/></g>`).join("")}</svg>`;
  tiles.push(await sharp(Buffer.from(svg)).png().toBuffer());
}
await sharp({ create: { width: 1600, height: 300, channels: 3, background: "#fff" } })
  .composite(tiles.map((b, i) => ({ input: b, left: i * 400, top: 0 })))
  .png()
  .toFile(process.argv[2]);
