import { useEffect } from "react";

/**
 * On a phone, the first touch on a button while the keyboard is open used to move
 * focus off the page: the keyboard closed, the layout jumped, and the tap landed
 * somewhere else or nowhere. On the writing pages, pressing a control now leaves
 * focus in the text where it is, so nothing moves under a finger. Text fields
 * and dialogs still take focus as usual.
 */
export function useKeepKeyboard() {
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const active = document.activeElement;
      const typing = active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && active.type !== "file");
      if (!typing || !(e.target instanceof Element)) return;
      if (e.target.closest("input, textarea, select, [contenteditable='true'], dialog")) return;
      if (e.target.closest("button, a[href], label, summary, [role='button'], [role='menuitem']")) e.preventDefault();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
}
