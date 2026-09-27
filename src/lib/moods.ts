import type { Mood } from "../../shared/constants";

/** CSS variable holding the leaf color for a mood. */
export function moodVar(mood: Mood | null | undefined): string {
  return `var(--mood-${mood ?? "none"})`;
}

/** Literal colors for canvas and SVG files that live outside the page (exports, share cards). */
export const MOOD_COLORS: Record<Mood | "none", { day: string; night: string }> = {
  calm: { day: "#86ad8f", night: "#6f927a" },
  joyful: { day: "#e8b54a", night: "#d6a954" },
  tender: { day: "#d98e8a", night: "#c98a84" },
  grateful: { day: "#c2a24c", night: "#b09450" },
  hopeful: { day: "#8dbf6a", night: "#7fa663" },
  curious: { day: "#6fa3a8", night: "#5f8f93" },
  wistful: { day: "#9db9be", night: "#7f9ca1" },
  restless: { day: "#d9985f", night: "#c48a58" },
  tired: { day: "#a5a384", night: "#8e8c73" },
  heavy: { day: "#5e7a66", night: "#587262" },
  none: { day: "#7fa36f", night: "#6a8c63" },
};
