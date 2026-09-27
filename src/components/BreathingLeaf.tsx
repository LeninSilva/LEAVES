import { LeafMark } from "./LeafShape";

/** Holds a place while something is on its way. One soft pulse about every four seconds. */
export function BreathingLeaf({ label, size = 56 }: { label?: string; size?: number }) {
  return (
    <div className="breathing" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <LeafMark color="var(--mood-none)" size={size} className="breathing__leaf" />
    </div>
  );
}
