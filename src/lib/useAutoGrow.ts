import { useLayoutEffect, type RefObject } from "react";

const native = typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content");

/** Grows a textarea with its text where CSS field-sizing isn't supported. */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || native) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
