import { useEffect, useMemo, useRef } from "react";
import type { Mood } from "../../shared/constants";
import { hashString, range, seeded } from "../lib/rng";
import { moodVar } from "../lib/moods";
import { LEAF_PATH, LEAF_VEIN } from "./LeafShape";
import { BRANCH_PATHS, STAGES, TRUNK_PATH } from "./treeStages";

/**
 * The tree. Each finished entry is one leaf in its mood color: leaf 1 is the oldest entry, so a leaf
 * never moves when a newer one arrives. The trunk and branches are the supplied growth pictures;
 * the stage follows how many entries there are (bare, then 1, 5, 12, 24, 48, 80 and 120 leaves). Their
 * leaves are only places to hang a leaf, so the tree always has exactly as many leaves as entries.
 * Past 120 the last tree keeps filling, a little fuller each time. Nothing ever withers.
 */

/** The pictures' own space: the trunk stands on (BASE_X, BASE_Y) in a 512 x 512 square. */
const BASE_X = 256;
const BASE_Y = 466;
/** The leaf shape is 20 long; this is the size the supplied pictures draw it at. */
const LEAF_SCALE = 1.8;

/** How many leaves each stage holds: 0, 1, 5, 12, 24, 48, 80, 120. */
export const STAGE_LEAVES: readonly number[] = STAGES.map((s) => s.slots.length);
const LAST = STAGES.length - 1;
const FULL = STAGE_LEAVES[LAST];

/** The first stage with room for this many leaves; the last stage for anything beyond it. */
export function stageFor(count: number): number {
  const k = STAGE_LEAVES.findIndex((room) => room >= count);
  return k === -1 ? LAST : k;
}

export interface TreeLeaf {
  x: number;
  y: number;
  rot: number;
}

/** The centre of the full canopy, which later leaves are pushed out from. */
const CANOPY = (() => {
  const slots = STAGES[LAST].slots;
  return { x: slots.reduce((n, p) => n + p[0], 0) / slots.length, y: slots.reduce((n, p) => n + p[1], 0) / slots.length };
})();

/** Where leaf i hangs, in the pictures' space, before the stage's size is applied. */
export function leafSlot(stage: number, i: number): TreeLeaf {
  const slots = STAGES[stage].slots;
  if (i < slots.length) return { x: slots[i][0], y: slots[i][1], rot: slots[i][2] };
  // Beyond the last supplied tree: start from one of its places and drift outward, the same way every time.
  const base = STAGES[LAST].slots[(i * 53) % FULL]; // 53 shares no factor with 120, so every place is used in turn
  const rand = seeded(hashString(`leaf-${i}`));
  const push = Math.min(34, (i - FULL + 1) * 0.12);
  const away = Math.atan2(base[1] - CANOPY.y, base[0] - CANOPY.x);
  return {
    x: base[0] + range(rand, -14, 14) + Math.cos(away) * push,
    y: base[1] + range(rand, -14, 14) + Math.sin(away) * push,
    rot: base[2] + range(rand, -60, 60),
  };
}

/** Every number pair in a path of absolute commands. */
function points(d: string): [number, number][] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return Array.from({ length: Math.floor(n.length / 2) }, (_, k) => [n[2 * k], n[2 * k + 1]] as [number, number]);
}
const SKELETON = [TRUNK_PATH, ...BRANCH_PATHS].flatMap(points);

export interface Layout {
  stage: number;
  /** How large this stage is drawn about the foot of the trunk. */
  scale: number;
  /** In the pictures' space. */
  leaves: TreeLeaf[];
  /** The part of the 512-square to show, grown to fit. */
  view: { x: number; y: number; w: number; h: number };
}

const LEAF_REACH = (LEAF_SCALE * 10) + 3;
const MARGIN = 12;

/** A pure function of the number of entries, so the tree looks the same on every visit. */
export function layoutTree(count: number): Layout {
  const stage = stageFor(count);
  const { scale } = STAGES[stage];
  const leaves = Array.from({ length: count }, (_, i) => leafSlot(stage, i));
  // Where things end up on the page once the stage's size is applied about the foot of the trunk.
  const place = (x: number, y: number): [number, number] => [BASE_X + (x - BASE_X) * scale, BASE_Y + (y - BASE_Y) * scale];
  const reach = LEAF_REACH * scale;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const [x, y] of SKELETON) {
    const [px, py] = place(x, y);
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
  }
  for (const l of leaves) {
    const [px, py] = place(l.x, l.y);
    minX = Math.min(minX, px - reach);
    maxX = Math.max(maxX, px + reach);
    minY = Math.min(minY, py - reach);
  }
  const half = Math.max(BASE_X - minX, maxX - BASE_X, 150) + MARGIN;
  const w = half * 2;
  const bottom = BASE_Y + 24;
  const top = Math.min(minY - MARGIN, bottom - w * 0.72);
  return { stage, scale, leaves, view: { x: BASE_X - half, y: top, w, h: bottom - top } };
}

interface Props {
  moods: (Mood | null)[];
  /** Leaves already seen; a newer last leaf unfurls once. */
  seenCount: number;
  onSeen?: (count: number) => void;
}

const fmt = (n: number) => n.toFixed(1);

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
  const { view, scale } = layout;
  const groundRx = Math.max(70, view.w * 0.38);

  return (
    <div className="tree">
      <svg viewBox={`${fmt(view.x)} ${fmt(view.y)} ${fmt(view.w)} ${fmt(view.h)}`} role="img" aria-label={label}>
        <ellipse cx={BASE_X} cy={BASE_Y + 6} rx={groundRx} ry={10} fill="var(--color-grass)" />
        <g transform={`translate(${BASE_X} ${BASE_Y}) scale(${scale}) translate(${-BASE_X} ${-BASE_Y})`}>
          <path d={TRUNK_PATH} fill="var(--color-trunk)" stroke="var(--color-bark-line)" strokeWidth={3} strokeLinejoin="round" />
          <g fill="none" stroke="var(--color-trunk)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
            {BRANCH_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g>
            {layout.leaves.map((l, i) => {
              const isNew = unfurl && i === count - 1;
              return (
                <g key={i} transform={`translate(${fmt(l.x)} ${fmt(l.y)}) rotate(${Math.round(l.rot)}) scale(${LEAF_SCALE})`}>
                  <g className={isNew ? "tree__leaf tree__leaf--new" : "tree__leaf"}>
                    <path d={LEAF_PATH} fill={moodVar(moods[i])} stroke="var(--color-bark-line)" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d={LEAF_VEIN} fill="none" stroke="var(--color-bark-line)" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
