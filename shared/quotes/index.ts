import type { Quote } from "./helper.js";
import { LEGACY } from "./legacy.js";

/**
 * Every quotation in the library, in one fixed order. New quotations are only
 * ever added to the end of a module or as a new module at the end of this
 * list, because people's "already seen" marks refer to lines by position.
 */
const MODULES: Quote[][] = [LEGACY];

function withUniqueIds(list: Quote[]): Quote[] {
  const seen = new Map<string, number>();
  return list.map((x) => {
    const n = (seen.get(x.id) ?? 0) + 1;
    seen.set(x.id, n);
    return n === 1 ? x : { ...x, id: `${x.id}-${n}` };
  });
}

export const ALL_QUOTES: readonly Quote[] = withUniqueIds(MODULES.flat());
