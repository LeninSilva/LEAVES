/** A thin, still strip of illustrated grass along the bottom edge. Decorative only. */
export function Grass() {
  return (
    <div className="grass" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <pattern id="grass-tile" width="132" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M0 28 C8 22 12 16 14 9 C15 16 18 22 22 28 Z M18 28 C24 20 27 14 27 6 C30 14 32 21 34 28 Z M36 28 C40 23 44 18 47 13 C48 19 50 24 52 28 Z M58 28 C62 19 66 13 70 10 C70 17 71 23 74 28 Z M76 28 C80 22 82 16 83 8 C86 15 89 22 92 28 Z M96 28 C100 24 104 19 108 15 C108 21 110 25 112 28 Z M112 28 C117 21 120 15 122 7 C124 15 127 22 132 28 Z"
              fill="var(--color-grass)"
            />
            <path
              d="M8 28 C12 24 14 20 16 16 C17 21 18 25 20 28 Z M44 28 C48 22 52 19 55 17 C55 22 56 26 58 28 Z M86 28 C90 23 92 20 95 16 C96 21 97 25 99 28 Z"
              fill="var(--color-grass-deep)"
            />
            <circle cx="64" cy="18" r="1.6" fill="var(--color-honey)" />
            <circle cx="118" cy="21" r="1.4" fill="var(--color-rosehip)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grass-tile)" />
      </svg>
    </div>
  );
}
