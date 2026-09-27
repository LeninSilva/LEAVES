import { expect, it } from "vitest";
import { branchCount, branchThresholds, layoutTree } from "./Tree";

it("places leaves the same way on every visit", () => {
  expect(layoutTree(48)).toEqual(layoutTree(48));
});

it("keeps existing leaves where they were when a new one grows, within a branch stage", () => {
  const before = layoutTree(10).leaves;
  const after = layoutTree(11).leaves.slice(0, 10);
  const moved = before.filter((l, i) => Math.hypot(l.x - after[i].x, l.y - after[i].y) > 12);
  expect(moved.length).toBeLessThan(before.length);
});

it("grows a new branch every 20 to 30 leaves", () => {
  const t = branchThresholds();
  for (let k = 3; k < t.length; k++) {
    const gap = t[k] - t[k - 1];
    expect(gap).toBeGreaterThanOrEqual(20);
    expect(gap).toBeLessThanOrEqual(30);
  }
  expect(branchCount(0)).toBe(3);
});
