import { useId, useMemo } from "react";
import { seeded, range } from "../lib/rng";
import { useBlobUrl } from "../lib/store";
import type { Entry } from "../lib/types";
import { BreathingLeaf } from "./BreathingLeaf";

/** A softly irregular, hand-cut paper outline in 0..1 units, the same for an entry on every visit. */
export function paperPath(seed: string, wobble = 0.012): string {
  const rand = seeded(seed + ":paper");
  const r = 0.035; // corner softness
  const pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const j = i === 0 ? 0 : range(rand, -wobble, wobble);
      pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
    }
  };
  edge(r, 0, 1 - r, 0, 0, 1);
  edge(1, r, 1, 1 - r, 1, 0);
  edge(1 - r, 1, r, 1, 0, 1);
  edge(0, 1 - r, 0, r, 1, 0);
  const f = (n: number) => Math.min(1, Math.max(0, n)).toFixed(4);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    const prev = pts[i - 1];
    const mx = (prev[0] + p[0]) / 2;
    const my = (prev[1] + p[1]) / 2;
    d += ` Q${f(prev[0])},${f(prev[1])} ${f(mx)},${f(my)}`;
  }
  return d + " Z";
}

export function PaperFrame({ seed, children, className = "" }: { seed: string; children: React.ReactNode; className?: string }) {
  const id = useId().replace(/:/g, "");
  const d = useMemo(() => paperPath(seed), [seed]);
  return (
    <div className={`paper ${className}`}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <clipPath id={`paper-${id}`} clipPathUnits="objectBoundingBox">
          <path d={d} />
        </clipPath>
      </svg>
      <div className="paper__cut" style={{ clipPath: `url(#paper-${id})` }}>
        {children}
      </div>
    </div>
  );
}

interface Props {
  entry: Entry;
  variant: "large" | "thumb";
}

export function Illustration({ entry, variant }: Props) {
  const ref = variant === "thumb" ? entry.illustration?.thumbUrl : entry.illustration?.url;
  const url = useBlobUrl(ref);
  const waiting = !entry.illustration;
  if (variant === "thumb") {
    return (
      <PaperFrame seed={entry.id} className="paper--thumb">
        {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : <div className="paper__empty" />}
      </PaperFrame>
    );
  }
  return (
    <PaperFrame seed={entry.id} className="paper--large">
      {url ? (
        <img src={url} alt={entry.illustration?.alt ?? ""} decoding="async" />
      ) : waiting ? (
        <div className="paper__waiting">
          <BreathingLeaf label="Your drawing is on the way" />
        </div>
      ) : (
        <div className="paper__empty" />
      )}
    </PaperFrame>
  );
}
