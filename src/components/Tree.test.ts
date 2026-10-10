import { describe, expect, it } from "vitest";
import { layoutTree, leafSlot, STAGE_LEAVES, stageFor } from "./Tree";
import { STAGES } from "./treeStages";

describe("the tree", () => {
  it("has the stages of the supplied pictures", () => {
    expect(STAGE_LEAVES).toEqual([0, 1, 5, 12, 24, 48, 80, 120]);
  });

  it("picks the first stage with room for every leaf, and the last one beyond that", () => {
    const cases: [number, number][] = [[0, 0], [1, 1], [2, 2], [5, 2], [6, 3], [12, 3], [13, 4], [24, 4], [25, 5], [48, 5], [49, 6], [80, 6], [81, 7], [120, 7], [121, 7], [5000, 7]];
    for (const [count, stage] of cases) expect(stageFor(count), `${count} entries`).toBe(stage);
  });

  it("draws exactly one leaf for every entry, at every size", () => {
    for (const n of [0, 1, 2, 4, 5, 6, 11, 12, 13, 24, 25, 47, 48, 49, 79, 80, 81, 119, 120, 121, 200, 500, 1500]) {
      const { leaves } = layoutTree(n);
      expect(leaves.length, `${n} entries`).toBe(n);
      for (const l of leaves) expect(Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.rot)).toBe(true);
    }
  });

  it("looks the same on every visit", () => {
    expect(layoutTree(48)).toEqual(layoutTree(48));
    expect(layoutTree(333)).toEqual(layoutTree(333));
  });

  it("never moves a leaf when a newer entry arrives, within a stage and beyond the last one", () => {
    for (const [a, b] of [[2, 5], [6, 12], [13, 24], [49, 80], [81, 120], [121, 122], [300, 301]]) {
      const before = layoutTree(a).leaves;
      const after = layoutTree(b).leaves.slice(0, a);
      expect(after, `${a} then ${b}`).toEqual(before);
    }
  });

  it("keeps the leaves it has when the tree grows to its next stage", () => {
    // The supplied pictures reuse the earlier places, so growing a stage adds leaves without shuffling the old ones.
    for (let k = 1; k < STAGES.length - 1; k++) {
      const a = STAGES[k].slots;
      const b = STAGES[k + 1].slots.slice(0, a.length);
      expect(b).toEqual(a);
    }
  });

  it("keeps filling the last tree past 120 leaves, inside the picture", () => {
    const { leaves, view, scale } = layoutTree(900);
    expect(scale).toBe(1);
    for (const l of leaves.slice(120)) {
      // Not stacked on one place: each extra leaf has its own position.
      expect(Number.isFinite(l.x)).toBe(true);
    }
    const distinct = new Set(leaves.map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)}`));
    expect(distinct.size).toBeGreaterThan(850);
    for (const l of leaves) {
      expect(l.x).toBeGreaterThan(view.x);
      expect(l.x).toBeLessThan(view.x + view.w);
      expect(l.y).toBeGreaterThan(view.y);
      expect(l.y).toBeLessThan(view.y + view.h);
    }
  });

  it("grows taller as it fills, and never gets smaller", () => {
    let previous = 0;
    for (const n of [0, 1, 5, 12, 24, 48, 80, 120, 400]) {
      const { view, scale } = layoutTree(n);
      expect(view.w).toBeGreaterThan(0);
      expect(view.h).toBeGreaterThan(0);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });

  it("places an overflow leaf the same way however many entries there are", () => {
    expect(leafSlot(7, 150)).toEqual(leafSlot(7, 150));
    expect(layoutTree(151).leaves[150]).toEqual(layoutTree(400).leaves[150]);
  });
});
