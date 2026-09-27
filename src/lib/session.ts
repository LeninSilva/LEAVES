import type { User } from "@supabase/supabase-js";
import { activeAccount, setActiveAccount } from "./account";
import { accessToken, isAccount, supabase } from "./auth";
import { forgetNotebook, prepareNotebook, unsyncedCount, wipeLocal } from "./db";
import { disableReminder } from "./reminder";
import { deleteRemoteEverything, startSync, syncNow } from "./sync";

/**
 * Keeps the open notebook matched to whoever is signed in. Switching accounts
 * reloads the app, so no screen ever holds one person's pages while another
 * person is signed in.
 */

const openedAs = activeAccount();
let switching = false;

function reopen() {
  const path = location.pathname === "/welcome" ? "/" : location.pathname + location.search;
  location.replace(path);
}

async function reconcile(user: User | null) {
  if (switching) return;
  // Another tab signed in or out: follow it.
  if (activeAccount() !== openedAs) {
    switching = true;
    reopen();
    return;
  }
  // An expired session keeps this notebook open; signing in again resumes backup.
  if (!isAccount(user)) return;
  if (user.id === openedAs) {
    void startSync();
    return;
  }
  switching = true;
  await prepareNotebook(user.id, { adoptGuest: openedAs === null });
  setActiveAccount(user.id);
  reopen();
}

export async function startAccount() {
  const sb = await supabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  await reconcile(data.session?.user ?? null);
  if (switching) return;
  // Supabase asks that this callback not await its own calls, so defer the work.
  sb.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void reconcile(session?.user ?? null), 0);
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "leaves.account") void reconcile(null);
  });
}

export type LeaveResult = { ok: true } | { ok: false; message: string };

/** Signs out on this device and removes this account's pages from it. Its backup stays. */
export async function signOutHere(): Promise<LeaveResult> {
  await syncNow();
  if ((await unsyncedCount()) > 0) {
    return {
      ok: false,
      message: navigator.onLine
        ? "A few changes are still backing up. Try again in a moment."
        : "Some pages haven't been backed up yet. Connect to the internet, then sign out.",
    };
  }
  await disableReminder();
  const sb = await supabase();
  await sb?.auth.signOut({ scope: "local" });
  await leaveDevice();
  return { ok: true };
}

/** Deletes the account, its backup, and its pages on this device. */
export async function deleteAccount(): Promise<LeaveResult> {
  if (!navigator.onLine) return { ok: false, message: "Connect to the internet to delete your account." };
  try {
    await disableReminder();
    await deleteRemoteEverything();
    const token = await accessToken();
    const res = await fetch("/api/account/delete", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    return { ok: false, message: "Couldn't delete your account just now. Try again." };
  }
  const sb = await supabase();
  await sb?.auth.signOut({ scope: "local" });
  await wipeLocal();
  await leaveDevice();
  return { ok: true };
}

async function leaveDevice() {
  const account = activeAccount();
  switching = true;
  setActiveAccount(null);
  if (account) await forgetNotebook(account);
  location.replace("/welcome");
}
