import { useEffect, useMemo, useState } from "react";
import { LEAF_PATH, LEAF_VEIN } from "./LeafShape";
import { seeded, range, pick } from "../lib/rng";

/**
 * The one orchestrated moment: after Finish, six leaves drift down slowly for
 * about four seconds and come to rest. With reduced motion, a short fade.
 */
export function LeafFall({ seed, onDone }: { seed: string; onDone?: () => void }) {
  const [gone, setGone] = useState(false);
  const leaves = useMemo(() => {
    const rand = seeded(seed + ":fall");
    const colors = ["var(--mood-hopeful)", "var(--color-honey)", "var(--color-rosehip)", "var(--mood-calm)", "var(--mood-restless)"];
    const count = 6;
    return Array.from({ length: count }, (_, i) => ({
      left: ((i + 0.5) / count) * 100 + range(rand, -6, 6),
      drift: range(rand, -40, 40),
      sway: range(rand, 14, 30) * (rand() < 0.5 ? -1 : 1),
      delay: range(rand, 0, 700),
      duration: range(rand, 3300, 4000),
      rest: range(rand, -80, 80),
      size: range(rand, 20, 30),
      color: pick(rand, colors),
      restY: range(rand, 0, 18),
    }));
  }, [seed]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 6400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  if (gone) return null;
  return (
    <div className="leaf-fall" aria-hidden="true">
      {leaves.map((l, i) => (
        <svg
          key={i}
          className="leaf-fall__leaf"
          viewBox="-10 -11 20 22"
          width={l.size}
          height={l.size}
          style={
            {
              left: `${l.left}%`,
              "--drift": `${l.drift}px`,
              "--sway": `${l.sway}px`,
              "--rest": `${l.rest}deg`,
              "--rest-y": `${l.restY}px`,
              animationDelay: `${l.delay}ms, ${l.delay + l.duration + 900}ms`,
              animationDuration: `${l.duration}ms, 900ms`,
            } as React.CSSProperties
          }
        >
          <path d={LEAF_PATH} fill={l.color} stroke="var(--color-bark-line)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={LEAF_VEIN} stroke="var(--color-bark-line)" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        </svg>
      ))}
    </div>
  );
}
