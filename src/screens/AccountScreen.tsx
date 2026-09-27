import { useState } from "react";
import { Confirm } from "../components/Dialog";
import { signInWithEmail, signInWithProvider, signOut, useAuth, accessToken } from "../lib/auth";
import { wipeLocal } from "../lib/db";
import { navigate } from "../lib/router";
import { deleteRemoteEverything, syncNow } from "../lib/sync";
import { SettingsBar } from "./SettingsScreen";

/** The simplest sign-in available: an email link, Apple or Google. Stays signed in. */
export function AccountScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const signedIn = auth.user && !auth.anonymous;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await signInWithEmail(email.trim());
    setSending(false);
    setNote(res.message);
  };

  const out = async () => {
    setConfirmOut(false);
    await syncNow();
    await signOut();
    await wipeLocal();
    navigate("/welcome", { replace: true });
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    try {
      await deleteRemoteEverything();
      const token = await accessToken();
      await fetch("/api/account/delete", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {} });
    } catch {
      /* local data is still removed */
    }
    await signOut();
    await wipeLocal();
    navigate("/welcome", { replace: true });
  };

  return (
    <>
      <SettingsBar back="/settings" label="Settings" />
      <main className="page page--settings" id="main">
        <h1 className="page-title">Account</h1>
        {!auth.configured ? (
          <p>Your entries are kept on this device only. You can export them any time from Settings.</p>
        ) : signedIn ? (
          <div className="stack">
            <p>
              Signed in as <strong>{auth.user!.email ?? "you"}</strong>. Your entries are backed up and you'll stay signed in.
            </p>
            <button type="button" className="button button--soft" onClick={() => setConfirmOut(true)}>
              Sign out
            </button>
            <button type="button" className="button button--danger-quiet" onClick={() => setConfirmDelete(true)}>
              Delete account
            </button>
          </div>
        ) : (
          <div className="stack">
            <p>Sign in to back up your entries and read them on any device. Nothing you've written will move or change.</p>
            <button type="button" className="button button--soft" onClick={() => void signInWithProvider("apple")}>
              Continue with Apple
            </button>
            <button type="button" className="button button--soft" onClick={() => void signInWithProvider("google")}>
              Continue with Google
            </button>
            <form className="stack" onSubmit={sendLink}>
              <label className="field">
                <span className="field__label">Or get a sign-in link by email</span>
                <input
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button type="submit" className="button" disabled={sending}>
                {sending ? "Sending" : "Send link"}
              </button>
            </form>
            {note ? (
              <p className="field-note" role="status">
                {note}
              </p>
            ) : null}
          </div>
        )}
      </main>
      <Confirm
        open={confirmOut}
        title="Sign out?"
        body="Your entries stay in your backup and will be removed from this device."
        confirmLabel="Sign out"
        onConfirm={out}
        onCancel={() => setConfirmOut(false)}
      />
      <Confirm
        open={confirmDelete}
        title="Delete your account?"
        body="This deletes your account, every entry, photo and drawing, here and in your backup. It can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
