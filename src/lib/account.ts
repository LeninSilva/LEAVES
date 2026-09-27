/**
 * Which account's notebook this device has open. Read synchronously at start
 * so the right notebook opens before anything else loads. Null means a guest.
 */
const KEY = "leaves.account";

export function activeAccount(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveAccount(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the guest notebook is used */
  }
}
