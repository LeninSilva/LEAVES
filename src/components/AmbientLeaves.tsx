import { useMemo } from "react";
import { pick, range, seeded } from "../lib/rng";
import { LEAF_PATH, LEAF_VEIN } from "./LeafShape";

const COLORS = ["var(--mood-hopeful)", "var(--color-honey)", "var(--color-rosehip)", "var(--mood-calm)", "var(--mood-restless)", "var(--mood-grateful)"];

/**
 * A few leaves drifting slowly down behind the page, always a little different
 * from the last time. Faint, behind the words, and still while someone writes.
 */
export function AmbientLeaves({ still = false, count = 7 }: { still?: boolean; count?: number }) {
  const leaves = useMemo(() => {
    const rand = seeded(String(Date.now() >> 14));
    return Array.from({ length: count }, (_, i) => ({
      left: ((i + 0.5) / count) * 100 + range(rand, -7, 7),
      size: range(rand, 16, 28),
      duration: range(rand, 22, 38),
      delay: -range(rand, 0, 38),
      sway: range(rand, 18, 46) * (rand() < 0.5 ? -1 : 1),
      turn: range(rand, 120, 300) * (rand() < 0.5 ? -1 : 1),
      color: pick(rand, COLORS),
    }));
  }, [count]);
  return (
    <div className={`ambient ${still ? "ambient--still" : ""}`} aria-hidden="true">
      {leaves.map((l, i) => (
        <svg
          key={i}
          className="ambient__leaf"
          viewBox="-10 -11 20 22"
          width={l.size}
          height={l.size}
          style={{ left: `${l.left}%`, animationDuration: `${l.duration}s`, animationDelay: `${l.delay}s`, "--sway": `${l.sway}px`, "--turn": `${l.turn}deg` } as React.CSSProperties}
        >
          <path d={LEAF_PATH} fill={l.color} stroke="var(--color-bark-line)" strokeWidth="1.1" strokeLinejoin="round" />
          <path d={LEAF_VEIN} stroke="var(--color-bark-line)" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        </svg>
      ))}
    </div>
  );
}
