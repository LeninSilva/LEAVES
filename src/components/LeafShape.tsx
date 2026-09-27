/** The house leaf shape, used by the tree, the vine, the loader and the falling leaves. */
export const LEAF_PATH = "M0 10 C6 6 7 -2 0 -10 C-7 -2 -6 6 0 10 Z";
export const LEAF_VEIN = "M0 9 L0 -6";

export function LeafMark({ color, size = 14, className }: { color: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-10 -11 20 22" aria-hidden="true" focusable="false">
      <path d={LEAF_PATH} fill={color} stroke="var(--color-bark-line)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={LEAF_VEIN} stroke="var(--color-bark-line)" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
