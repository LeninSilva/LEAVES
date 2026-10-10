import { useEffect, useId, useMemo, useState } from "react";
import { entryArtUrl, entrySubject, subjectAlt, useIllustrationStyle, useResolvedTheme } from "../lib/art";
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

/**
 * The entry's picture in the chosen style. Quiet and Storybook come from the artwork that
 * ships with the app, picked by what the entry is about, so the same entry always gets the
 * same picture. Drawn is the picture made for this entry. If a shipped picture can't be
 * loaded (offline, before it was ever opened), the entry's own drawing stands in.
 */
export function Illustration({ entry, variant }: Props) {
  const style = useIllustrationStyle();
  const theme = useResolvedTheme();
  const subject = entrySubject(entry);
  const packUrl = style && style !== "drawn" && subject ? entryArtUrl(style, theme, subject, variant) : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => setFailedUrl(null), [packUrl]);
  const showPack = !!packUrl && failedUrl !== packUrl;

  const ref = variant === "thumb" ? entry.illustration?.thumbUrl : entry.illustration?.url;
  const ownUrl = useBlobUrl(showPack ? null : ref);
  const waiting = !showPack && (style === null || (style === "drawn" ? !entry.illustration : !subject && !entry.illustration));

  if (showPack && style && style !== "drawn" && subject) {
    const img = (
      <img
        src={packUrl}
        alt={variant === "thumb" ? "" : subjectAlt(subject, style)}
        width={512}
        height={512}
        loading={variant === "thumb" ? "lazy" : undefined}
        decoding="async"
        onError={() => setFailedUrl(packUrl)}
      />
    );
    return <div className={`art art--${style} art--${variant}`}>{img}</div>;
  }

  if (variant === "thumb") {
    return (
      <PaperFrame seed={entry.id} className="paper--thumb">
        {ownUrl ? <img src={ownUrl} alt="" loading="lazy" decoding="async" /> : <div className="paper__empty" />}
      </PaperFrame>
    );
  }
  return (
    <PaperFrame seed={entry.id} className="paper--large">
      {ownUrl ? (
        <img src={ownUrl} alt={entry.illustration?.alt ?? ""} decoding="async" />
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
