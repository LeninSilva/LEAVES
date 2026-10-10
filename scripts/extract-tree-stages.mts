// Reads the supplied tree growth pictures (stage-01 to stage-08) and writes src/components/treeStages.ts:
// the trunk and branch outlines, how large each stage is drawn, and where its leaves sit. The leaves in
// the pictures are only slots; the live tree draws one real leaf, in its mood color, for every entry.
//   npx tsx scripts/extract-tree-stages.mts path/to/trees/daylight
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("Give the folder with stage-01.svg to stage-08.svg");

const stages: { scale: number; slots: [number, number, number][] }[] = [];
let trunk: string | null = null;
let branches: string[] = [];

for (let i = 1; i <= 8; i++) {
  const svg = readFileSync(`${dir}/stage-0${i}.svg`, "utf8");
  const wrap = svg.match(/<g transform="translate\(256 466\) scale\(([\d.]+)\) translate\(-256 -466\)">/);
  if (!wrap) throw new Error(`stage ${i}: unexpected wrapper`);
  // The trunk and branches come before any leaf group.
  const leafStart = svg.search(/<g transform="translate\([\d.\-]+ [\d.\-]+\) rotate\(/);
  const head = leafStart === -1 ? svg : svg.slice(0, leafStart);
  const parts = [...head.matchAll(/<path d="([^"]+)" fill="(#[0-9a-f]+|none)"/g)].map((m) => m[1]);
  if (!trunk) {
    trunk = parts[0];
    branches = parts.slice(1);
  } else if (parts[0] !== trunk || parts.slice(1).join("|") !== branches.join("|")) {
    throw new Error(`stage ${i}: the trunk differs from stage 1`);
  }
  const slots = [...svg.matchAll(/<g transform="translate\(([\d.\-]+) ([\d.\-]+)\) rotate\(([\d.\-]+)\) scale\(1\.8\)">/g)].map(
    (m) => [Number(m[1]), Number(m[2]), Math.round(Number(m[3]))] as [number, number, number],
  );
  stages.push({ scale: Number(wrap[1]), slots });
}

const out = `// Made by scripts/extract-tree-stages.mts from the supplied tree pictures. Do not edit by hand.
// Coordinates are in the pictures' own 512 x 512 space; the trunk stands on (256, 466).

/** The trunk as a filled outline, and the branches as strokes. */
export const TRUNK_PATH = ${JSON.stringify(trunk)};
export const BRANCH_PATHS: readonly string[] = ${JSON.stringify(branches)};

/** How each stage is drawn: its size, and where its leaves sit [x, y, rotation]. Stage k holds slots.length leaves. */
export const STAGES: readonly { scale: number; slots: readonly (readonly [number, number, number])[] }[] = [
${stages.map((s) => `  { scale: ${s.scale}, slots: ${JSON.stringify(s.slots.map((p) => p.map((n) => Math.round(n * 10) / 10)))} },`).join("\n")}
];
`;
writeFileSync("src/components/treeStages.ts", out);
console.log(stages.map((s) => `${s.slots.length} leaves, scale ${s.scale}`).join("\n"));
