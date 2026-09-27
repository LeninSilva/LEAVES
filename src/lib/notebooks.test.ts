import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";

/** Opens the app's storage as a given account (null is a guest), as a fresh page load would. */
async function openAs(account: string | null) {
  vi.resetModules();
  if (account) localStorage.setItem("leaves.account", account);
  else localStorage.removeItem("leaves.account");
  return { ...(await import("./db")), ...(await import("./entries")) };
}

async function write(m: Awaited<ReturnType<typeof openAs>>, text: string) {
  const draft = await m.saveDraft(m.beginIfNeeded({ ...m.blankEntry(), text }));
  return (await m.finishDraft(draft.id))!;
}

describe("each account has its own notebook", () => {
  it("never shows one person's pages to another person on the same device", async () => {
    const ana = await openAs("ana");
    const mine = await write(ana, "Ana's page.");
    const ben = await openAs("ben");
    await write(ben, "Ben's page.");
    expect((await ben.allEntries()).map((e) => e.id)).not.toContain(mine.id);
    const anaAgain = await openAs("ana");
    expect((await anaAgain.allEntries()).map((e) => e.text)).toEqual(["Ana's page."]);
  });

  it("moves a guest's pages into their new account, ready to back up", async () => {
    const guest = await openAs(null);
    const page = await write(guest, "Written before signing in.");
    await guest.putEntry({ ...page, syncedAt: Date.now() }, { fromSync: true });
    await guest.prepareNotebook("cleo", { adoptGuest: true });

    const cleo = await openAs("cleo");
    const moved = await cleo.getEntry(page.id);
    expect(moved?.text).toBe("Written before signing in.");
    expect(moved?.syncedAt).toBeUndefined();
    expect(await cleo.unsyncedCount()).toBe(1);
    expect((await cleo.getMeta()).welcomed).toBe(true);
    expect(await (await openAs(null)).allEntries()).toEqual([]);
  });

  it("leaves nothing behind when an account is removed from the device", async () => {
    const dev = await openAs("dev");
    await write(dev, "Private.");
    await dev.forgetNotebook("dev");
    expect(await (await openAs("dev")).allEntries()).toEqual([]);
  });
});
