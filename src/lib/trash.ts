import { queueShareRevocation, restoreFromTrash, trashEntry } from "./db";
import { scheduleSync } from "./sync";
import type { Entry } from "./types";

/**
 * Deleting an entry moves it to Recently deleted, where it can be brought back
 * for 30 days. Any link it was shared by, or page it was published on, is turned
 * off at once (or as soon as the device is online).
 */
export async function deleteEntry(entry: Entry): Promise<void> {
  if (entry.share.linkToken || entry.share.published) await queueShareRevocation(entry.id);
  await trashEntry(entry.id);
  scheduleSync(0);
}

export async function bringBack(id: string) {
  await restoreFromTrash(id);
}
