import { useEffect } from "react";

/**
 * Keeps bottom controls above the on-screen keyboard. Browsers that resize the
 * layout need nothing; for those that only shrink the visual viewport (iOS
 * Safari) this sets --keyboard-offset to the covered height.
 */
export function useKeyboardOffset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard-offset", `${Math.round(covered)}px`);
      root.dataset.keyboard = covered > 80 ? "open" : "closed";
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.setProperty("--keyboard-offset", "0px");
      root.dataset.keyboard = "closed";
    };
  }, []);
}
