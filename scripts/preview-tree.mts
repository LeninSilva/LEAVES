// Renders the tree at a few sizes, in both themes, to one PNG for a quick visual check (dev only):
//   npx tsx scripts/preview-tree.mts out.png
import sharp from "sharp";
import { layoutTree } from "../src/components/Tree";
import { BRANCH_PATHS, TRUNK_PATH } from "../src/components/treeStages";
import { LEAF_PATH, LEAF_VEIN } from "../src/components/LeafShape";
import { MOOD_COLORS } from "../src/lib/moods";

const palette = {
  day: { bg: "#eaf0e3", trunk: "#6b5641", line: "#4a3b2c", grass: "#7fa36f" },
  night: { bg: "#1e2923", trunk: "#6a5a48", line: "#1a1611", grass: "#3f5a45" },
};
const moods = Object.keys(MOOD_COLORS).filter((m) => m !== "none") as (keyof typeof MOOD_COLORS)[];
const sizes = [0, 1, 5, 12, 24, 48, 80, 120, 300];
const W = 300;
const tiles: { input: Buffer; left: number; top: number }[] = [];
for (const [row, theme] of (["day", "night"] as const).entries()) {
  const c = palette[theme];
  for (const [col, n] of sizes.entries()) {
    const { view, scale, leaves } = layoutTree(n);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" width="${W}" height="${Math.round((W * view.h) / view.w)}"><rect x="${view.x}" y="${view.y}" width="${view.w}" height="${view.h}" fill="${c.bg}"/>
<ellipse cx="256" cy="472" rx="${Math.max(70, view.w * 0.38)}" ry="10" fill="${c.grass}"/>
<g transform="translate(256 466) scale(${scale}) translate(-256 -466)"><path d="${TRUNK_PATH}" fill="${c.trunk}" stroke="${c.line}" stroke-width="3"/>
<g fill="none" stroke="${c.trunk}" stroke-width="8" stroke-linecap="round">${BRANCH_PATHS.map((d) => `<path d="${d}"/>`).join("")}</g>
${leaves.map((l, i) => `<g transform="translate(${l.x} ${l.y}) rotate(${l.rot}) scale(1.8)"><path d="${LEAF_PATH}" fill="${MOOD_COLORS[moods[i % 10]][theme]}" stroke="${c.line}" stroke-width="1.2"/><path d="${LEAF_VEIN}" stroke="${c.line}" stroke-width="0.9" opacity="0.7"/></g>`).join("")}</g></svg>`;
    tiles.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: col * (W + 6), top: row * (W + 6) });
  }
}
await sharp({ create: { width: sizes.length * (W + 6), height: 2 * (W + 6), channels: 3, background: "#888" } })
  .composite(tiles)
  .png()
  .toFile(process.argv[2]);
