import { useState } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { BreathingLeaf } from "../components/BreathingLeaf";
import { Confirm } from "../components/Dialog";
import { MIN_PASSWORD, setNewPassword, signInMethod, useAuth } from "../lib/auth";
import { showToast } from "../components/Toast";
import { navigate, useRouteState } from "../lib/router";
import { deleteAccount, signOutHere, type LeaveResult } from "../lib/session";
import { SettingsBar } from "./SettingsScreen";

const METHOD = { email: "email and password", google: "Google", apple: "Apple" } as const;

/** Sign in with Google, Apple, or email and password. Stays signed in. */
export function AccountScreen() {
  const auth = useAuth();
  const route = useRouteState<{ create?: boolean }>();
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"out" | "delete" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const run = async (kind: "out" | "delete", action: () => Promise<LeaveResult>) => {
    setConfirmOut(false);
    setConfirmDelete(false);
    setProblem(null);
    setBusy(kind);
    const res = await action();
    // On success the app reopens on the welcome page.
    if (!res.ok) {
      setBusy(null);
      setProblem(res.message);
    }
  };

  let body: React.ReactNode;
  if (!auth.configured) {
    body = <p>Your entries are kept on this device only. You can export them any time from Settings.</p>;
  } else if (!auth.ready) {
    body = <BreathingLeaf />;
  } else if (auth.signedIn && auth.user) {
    const method = signInMethod(auth.user);
    body = (
      <div className="stack">
        <p>
          Signed in as <strong>{auth.user.email ?? "you"}</strong> with {METHOD[method]}. Your entries are backed up, and only you can
          see them.
        </p>
        {method === "email" ? (
          <button type="button" className="button button--soft" onClick={() => navigate("/reset-password")}>
            Change password
          </button>
        ) : null}
        <button type="button" className="button button--soft" disabled={!!busy} onClick={() => setConfirmOut(true)}>
          {busy === "out" ? "Signing out" : "Sign out"}
        </button>
        <button type="button" className="button button--danger-quiet" disabled={!!busy} onClick={() => setConfirmDelete(true)}>
          {busy === "delete" ? "Deleting" : "Delete account"}
        </button>
        {problem ? (
          <p className="auth__error" role="alert">
            {problem}
          </p>
        ) : null}
      </div>
    );
  } else {
    body = (
      <div className="stack">
        <p>Sign in to back up your entries and read them on any device. Pages you've already written here come with you.</p>
        <AuthPanel next="/settings/account" startWith={route?.create ? "create" : "signin"} />
      </div>
    );
  }

  return (
    <>
      <SettingsBar back="/settings" label="Settings" />
      <main className="page page--settings" id="main">
        <h1 className="page-title">Account</h1>
        {body}
      </main>
      <Confirm
        open={confirmOut}
        title="Sign out?"
        body="Your entries stay safe in your backup and leave this device. Sign in again any time to see them."
        confirmLabel="Sign out"
        onConfirm={() => void run("out", signOutHere)}
        onCancel={() => setConfirmOut(false)}
      />
      <Confirm
        open={confirmDelete}
        title="Delete your account?"
        body="This deletes your account and every entry, photo and drawing, here and in your backup. It can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={() => void run("delete", deleteAccount)}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

/** Where a password reset link lands, and where a signed-in person changes their password. */
export function ResetPasswordScreen() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = /error_code=otp_expired|error=access_denied/.test(location.hash);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Choose a longer password, with at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await setNewPassword(password);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    showToast("Your new password is saved.");
    navigate("/", { replace: true });
  };

  let body: React.ReactNode;
  if (!auth.ready) body = <BreathingLeaf />;
  else if (!auth.signedIn) {
    body = (
      <div className="stack">
        <p>{expired ? "This link has expired or was already used. Ask for a new one below." : "Ask for a link to choose a new password."}</p>
        <AuthPanel next="/" startWith="reset" />
      </div>
    );
  } else {
    body = (
      <form className="stack" onSubmit={submit} noValidate>
        <input type="email" name="email" autoComplete="username" value={auth.user?.email ?? ""} readOnly hidden />
        <div className="field">
          <label className="field__label" htmlFor="new-password">
            New password
          </label>
          <div className="auth__password">
            <input
              id="new-password"
              className="input"
              type={show ? "text" : "password"}
              name="new-password"
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-describedby="new-password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="button button--quiet auth__show" aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <span className="field-note" id="new-password-hint">
            At least {MIN_PASSWORD} characters.
          </span>
        </div>
        {error ? (
          <p className="auth__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? "Saving" : "Save new password"}
        </button>
      </form>
    );
  }

  return (
    <>
      <SettingsBar back="/settings/account" label="Account" />
      <main className="page page--settings" id="main">
        <h1 className="page-title">Choose a new password</h1>
        {body}
      </main>
    </>
  );
}
