import { useMemo } from "react";
import { leafUrl, useResolvedTheme } from "../lib/art";
import { range, seeded } from "../lib/rng";

/**
 * A few leaves drifting slowly down behind the page, always a little different
 * from the last time. Faint, behind the words, and still while someone writes.
 */
export function AmbientLeaves({ still = false, count = 7 }: { still?: boolean; count?: number }) {
  const theme = useResolvedTheme();
  const leaves = useMemo(() => {
    const rand = seeded(String(Math.floor(Date.now() / 16384)));
    return Array.from({ length: count }, (_, i) => ({
      left: ((i + 0.5) / count) * 100 + range(rand, -7, 7),
      size: range(rand, 16, 28),
      duration: range(rand, 22, 38),
      delay: -range(rand, 0, 38),
      sway: range(rand, 18, 46) * (rand() < 0.5 ? -1 : 1),
      turn: range(rand, 120, 300) * (rand() < 0.5 ? -1 : 1),
      shape: Math.floor(rand() * 10),
    }));
  }, [count]);
  return (
    <div className={`ambient ${still ? "ambient--still" : ""}`} aria-hidden="true">
      {leaves.map((l, i) => (
        <img
          key={i}
          className="ambient__leaf"
          src={leafUrl(theme, l.shape)}
          alt=""
          width={l.size * 1.5}
          height={l.size * 1.5}
          style={{ left: `${l.left}%`, animationDuration: `${l.duration}s`, animationDelay: `${l.delay}s`, "--sway": `${l.sway}px`, "--turn": `${l.turn}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
