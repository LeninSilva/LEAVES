import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { allEntries, getEntry, putDraft } from "./db";
import { beginIfNeeded, blankEntry, finishDraft, saveDraft } from "./entries";

describe("finishing", () => {
  it("is idempotent: a double tap never makes two entries or changes the finish time", async () => {
    const draft = await saveDraft(beginIfNeeded({ ...blankEntry(), text: "A good day." }));
    const [a, b] = await Promise.all([finishDraft(draft.id), finishDraft(draft.id)]);
    expect(a?.status).toBe("finished");
    expect(b?.finishedAt).toBe(a?.finishedAt);
    const again = await finishDraft(draft.id);
    expect(again?.finishedAt).toBe(a?.finishedAt);
    expect((await allEntries()).filter((e) => e.id === draft.id)).toHaveLength(1);
  });

  it("never lets a late autosave turn a finished entry back into a draft", async () => {
    const draft = await saveDraft(beginIfNeeded({ ...blankEntry(), text: "Words." }));
    await finishDraft(draft.id);
    await putDraft({ ...draft, text: "Words. More" });
    const stored = await getEntry(draft.id);
    expect(stored?.status).toBe("finished");
    expect(stored?.text).toBe("Words.");
  });

  it("won't finish an empty page", async () => {
    const draft = await saveDraft(beginIfNeeded({ ...blankEntry(), text: "   " }));
    await finishDraft(draft.id);
    expect((await getEntry(draft.id))?.status).toBe("draft");
  });
});
