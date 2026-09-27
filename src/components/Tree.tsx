import { useEffect, useMemo, useRef } from "react";
import type { Mood } from "../../shared/constants";
import { hashString, range, seeded } from "../lib/rng";
import { moodVar } from "../lib/moods";
import { LEAF_PATH, LEAF_VEIN } from "./LeafShape";

/**
 * The tree. Each finished entry is one leaf in its mood color. The shape is a
 * pure function of the leaves, so it looks the same on every visit. New
 * branches grow every 20 to 30 leaves, the tree grows a little taller as it
 * fills, and nothing ever withers.
 */

const W = 400;
const H = 300;
const BASE_X = 200;
const BASE_Y = 272;
const FIRST_BRANCHES = 3;
const MAX_BRANCHES = 16;

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  depth: number;
}

/** Leaf count at which branch k appears. */
export function branchThresholds(): number[] {
  const t: number[] = [];
  let at = 0;
  for (let k = 0; k < MAX_BRANCHES; k++) {
    if (k < FIRST_BRANCHES) t.push(0);
    else {
      at += Math.round(range(seeded(`branch-gap-${k}`), 20, 30));
      t.push(at);
    }
  }
  return t;
}

const THRESHOLDS = branchThresholds();

export function branchCount(leaves: number): number {
  return THRESHOLDS.filter((t) => t <= leaves).length;
}

/** Where each main branch leaves the trunk: fraction of trunk height, side, and angle. */
const SITES = Array.from({ length: MAX_BRANCHES }, (_, k) => {
  const rand = seeded(`site-${k}`);
  if (k === 2) return { at: 1, angle: -90 + range(rand, -8, 8), length: 0.95 };
  const left = k % 2 === 0;
  const at = k < 2 ? range(rand, 0.55, 0.68) : range(rand, 0.35, 0.95);
  const angle = left ? range(rand, -158, -122) : range(rand, -58, -22);
  return { at, angle, length: range(rand, 0.75, 1) };
});

function growBranch(k: number, x: number, y: number, angleDeg: number, len: number, width: number): Segment[] {
  const rand = seeded(`branch-${k}`);
  const segs: Segment[] = [];
  const step = (x0: number, y0: number, a: number, l: number, w: number, depth: number) => {
    const rad = (a * Math.PI) / 180;
    const x1 = x0 + Math.cos(rad) * l;
    const y1 = y0 + Math.sin(rad) * l;
    segs.push({ x0, y0, x1, y1, width: w, depth });
    if (depth >= 3) return;
    const kids = depth === 0 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (i - (kids - 1) / 2) * range(rand, 24, 36);
      // Branches lean gently upward, toward the light.
      const lift = a < -90 ? 6 : a > -90 ? -6 : 0;
      step(x1, y1, a + spread + lift, l * range(rand, 0.58, 0.72), Math.max(1.2, w * 0.62), depth + 1);
    }
  };
  step(x, y, angleDeg, len, width, 0);
  return segs;
}

interface Layout {
  trunk: Segment;
  branches: Segment[][];
  leaves: { x: number; y: number; rot: number; scale: number }[];
}

export function layoutTree(leafCount: number): Layout {
  const branches = Math.max(FIRST_BRANCHES, branchCount(leafCount));
  const growth = Math.min(1, 0.62 + 0.03 * branches + Math.min(leafCount, 60) * 0.002);
  const trunkLen = 118 * growth;
  const trunk: Segment = { x0: BASE_X, y0: BASE_Y, x1: BASE_X, y1: BASE_Y - trunkLen, width: 13 * growth, depth: 0 };
  const branchSegs: Segment[][] = [];
  for (let k = 0; k < branches; k++) {
    const s = SITES[k];
    const y = BASE_Y - trunkLen * s.at;
    const bend = (k % 2 === 0 ? -1 : 1) * 1.5;
    branchSegs.push(growBranch(k, BASE_X + bend, y, s.angle, 62 * growth * s.length, 7 * growth * (1 - s.at * 0.35)));
  }
  const leaves: Layout["leaves"] = [];
  for (let i = 0; i < leafCount; i++) {
    // A leaf belongs to one of the branches that existed when it arrived.
    const available = Math.max(FIRST_BRANCHES, branchCount(i));
    const h = hashString(`leaf-${i}`);
    const b = branchSegs[h % available];
    const twigs = b.filter((s) => s.depth >= 2);
    const seg = twigs[(h >>> 8) % twigs.length];
    const rand = seeded(h);
    const t = range(rand, 0.35, 1);
    const along = Math.atan2(seg.y1 - seg.y0, seg.x1 - seg.x0);
    const side = rand() < 0.5 ? -1 : 1;
    const off = range(rand, 2, 7) * side;
    leaves.push({
      x: seg.x0 + (seg.x1 - seg.x0) * t + Math.cos(along + Math.PI / 2) * off,
      y: seg.y0 + (seg.y1 - seg.y0) * t + Math.sin(along + Math.PI / 2) * off,
      rot: (along * 180) / Math.PI + 90 + side * range(rand, 25, 60),
      scale: range(rand, 0.72, 0.95),
    });
  }
  return { trunk, branches: branchSegs, leaves };
}

function segPath(s: Segment) {
  // A slight curve so branches feel drawn by hand.
  const mx = (s.x0 + s.x1) / 2 + (s.y1 - s.y0) * 0.08;
  const my = (s.y0 + s.y1) / 2 - (s.x1 - s.x0) * 0.08;
  return `M${s.x0.toFixed(1)},${s.y0.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${s.x1.toFixed(1)},${s.y1.toFixed(1)}`;
}

interface Props {
  moods: (Mood | null)[];
  /** Leaves already seen; a newer last leaf unfurls once. */
  seenCount: number;
  onSeen?: (count: number) => void;
}

export function Tree({ moods, seenCount, onSeen }: Props) {
  const count = moods.length;
  const layout = useMemo(() => layoutTree(count), [count]);
  const unfurl = count > 0 && count > seenCount;
  const reported = useRef(false);

  useEffect(() => {
    if (unfurl && !reported.current) {
      reported.current = true;
      const t = window.setTimeout(() => onSeen?.(count), 1600);
      return () => window.clearTimeout(t);
    }
  }, [unfurl, count, onSeen]);

  const label = `Your tree has ${count} ${count === 1 ? "leaf" : "leaves"}.`;
  const all = [layout.trunk, ...layout.branches.flat()];

  return (
    <div className="tree">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <path
          d={`M60,${BASE_Y + 6} Q200,${BASE_Y - 14} 340,${BASE_Y + 6} Q200,${BASE_Y + 22} 60,${BASE_Y + 6} Z`}
          fill="var(--color-grass)"
        />
        <g stroke="var(--color-bark-line)" strokeLinecap="round" fill="none">
          {all.map((s, i) => (
            <path key={`o${i}`} d={segPath(s)} strokeWidth={s.width + 2.2} />
          ))}
        </g>
        <g stroke="var(--color-trunk)" strokeLinecap="round" fill="none">
          {all.map((s, i) => (
            <path key={`i${i}`} d={segPath(s)} strokeWidth={s.width} />
          ))}
        </g>
        <g>
          {layout.leaves.map((l, i) => {
            const isNew = unfurl && i === count - 1;
            return (
              <g key={i} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.rot.toFixed(0)}) scale(${(l.scale * 0.9).toFixed(2)})`}>
                <g className={isNew ? "tree__leaf tree__leaf--new" : "tree__leaf"}>
                  <path d={LEAF_PATH} fill={moodVar(moods[i])} stroke="var(--color-bark-line)" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d={LEAF_VEIN} stroke="var(--color-bark-line)" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
