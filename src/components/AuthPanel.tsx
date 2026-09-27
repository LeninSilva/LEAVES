import { useEffect, useId, useRef, useState } from "react";
import {
  MIN_PASSWORD,
  createAccount,
  enabledProviders,
  sendPasswordReset,
  signInWithPassword,
  signInWithProvider,
  type AuthResult,
  type Provider,
  type Providers,
} from "../lib/auth";

type Mode = "create" | "signin" | "reset";

const SUBMIT: Record<Mode, [idle: string, busy: string]> = {
  create: ["Create account", "Creating your account"],
  signin: ["Sign in", "Signing in"],
  reset: ["Send reset link", "Sending"],
};

/** Google, Apple, or email and password. Only methods turned on in Supabase appear. */
export function AuthPanel({ next = "/", startWith = "create" }: { next?: string; startWith?: Mode }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [mode, setMode] = useState<Mode>(startWith);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badField, setBadField] = useState<"email" | "password" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    let live = true;
    enabledProviders().then((p) => live && setProviders(p));
    return () => {
      live = false;
    };
  }, []);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setBadField(null);
    setNote(null);
    setPassword("");
    requestAnimationFrame(() => (email ? passwordRef.current : emailRef.current)?.focus());
  };

  const withProvider = async (p: Provider) => {
    setError(null);
    setBusy(true);
    const res = await signInWithProvider(p, next);
    // On success the browser leaves for Google or Apple.
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBadField(null);
    setNote(null);
    const address = email.trim();
    const problem = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
      ? ["Enter your email address, like name@example.com.", emailRef]
      : mode === "signin" && !password
        ? ["Enter your password.", passwordRef]
        : mode === "create" && password.length < MIN_PASSWORD
          ? [`Choose a longer password, with at least ${MIN_PASSWORD} characters.`, passwordRef]
          : null;
    if (problem) {
      const [message, field] = problem as [string, React.RefObject<HTMLInputElement | null>];
      setError(message);
      setBadField(field === emailRef ? "email" : "password");
      field.current?.focus();
      return;
    }
    setBusy(true);
    let res: AuthResult;
    if (mode === "create") res = await createAccount(address, password);
    else if (mode === "signin") res = await signInWithPassword(address, password);
    else res = await sendPasswordReset(address);
    // A new session opens this person's notebook and reloads the app; stay busy until then.
    if (res.ok && !res.message) return;
    setBusy(false);
    if (res.ok) {
      setNote(res.message ?? null);
      setPassword("");
    } else {
      setError(res.message);
    }
  };

  if (!providers) return <div className="auth auth--loading" aria-busy="true" />;

  const social = providers.google || providers.apple;
  const [idle, working] = SUBMIT[mode];
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="auth">
      {social && mode !== "reset" ? (
        <div className="stack">
          {providers.google ? (
            <button type="button" className="button button--soft auth__provider" disabled={busy} onClick={() => void withProvider("google")}>
              <GoogleMark />
              <span>Continue with Google</span>
            </button>
          ) : null}
          {providers.apple ? (
            <button type="button" className="button button--soft auth__provider" disabled={busy} onClick={() => void withProvider("apple")}>
              <AppleMark />
              <span>Continue with Apple</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {social && providers.email && mode !== "reset" ? (
        <p className="auth__or">
          <span>or use your email</span>
        </p>
      ) : null}

      {providers.email ? (
        <form className="stack" onSubmit={submit} aria-label={idle} noValidate>
          {mode === "reset" ? (
            <p className="auth__lead">Enter your email and we'll send you a link to choose a new password.</p>
          ) : null}
          <label className="field">
            <span className="field__label">Email</span>
            <input
              ref={emailRef}
              className="input"
              type="email"
              name="email"
              inputMode="email"
              autoComplete={mode === "create" ? "email" : "username"}
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              aria-invalid={badField === "email" || undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== "reset" ? (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-password`}>
                Password
              </label>
              <div className="auth__password">
                <input
                  ref={passwordRef}
                  id={`${id}-password`}
                  className="input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={password}
                  aria-invalid={badField === "password" || undefined}
                  aria-describedby={[mode === "create" ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="button button--quiet auth__show"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "create" ? (
                <span className="field-note" id={hintId}>
                  At least {MIN_PASSWORD} characters.
                </span>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="auth__error" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="auth__note" role="status">
              {note}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? working : idle}
          </button>

          {mode === "signin" ? (
            <button type="button" className="link-button" onClick={() => switchTo("reset")}>
              Forgot your password?
            </button>
          ) : null}
        </form>
      ) : null}

      {providers.email ? (
        <p className="auth__switch">
          {mode === "create" ? (
            <>
              Already have an account?{" "}
              <button type="button" className="link-button" onClick={() => switchTo("signin")}>
                Sign in
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              New to Leaves?{" "}
              <button type="button" className="link-button" onClick={() => switchTo("create")}>
                Create an account
              </button>
            </>
          ) : (
            <button type="button" className="link-button" onClick={() => switchTo("signin")}>
              Back to sign in
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}

/** Google's "G", as its sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.6 7.1-17.1Z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5Z" />
    </svg>
  );
}
