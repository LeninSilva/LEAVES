import { useEffect, useRef, useState } from "react";
import { Dialog } from "../components/Dialog";
import { InstallCard } from "../components/InstallCard";
import { promptInstall, useInstall } from "../lib/install";
import { AmbientLeaves } from "../components/AmbientLeaves";
import { AuthPanel } from "../components/AuthPanel";
import { BreathingLeaf } from "../components/BreathingLeaf";
import { Grass } from "../components/Grass";
import { LockIcon } from "../components/icons";
import { useAuth } from "../lib/auth";
import { saveMeta } from "../lib/db";
import { go, navigate } from "../lib/router";

const LINE = "Write about your day. When you finish, you'll get a small drawing and a thought to keep.";

async function begin() {
  try {
    await saveMeta({ welcomed: true });
  } catch {
    // Storage may be unavailable right now. Open the page anyway; it says so if it can't save.
  }
  navigate("/", { replace: true });
}

/** First launch: one sentence, then Begin, or a way in to your own account. No tour. */
export function Welcome() {
  const auth = useAuth();
  const button = useRef<HTMLButtonElement>(null);
  const install = useInstall();
  const [howTo, setHowTo] = useState(false);
  const askToSignIn = auth.configured && auth.ready && !auth.signedIn;

  useEffect(() => {
    if (auth.ready && !askToSignIn) button.current?.focus();
  }, [auth.ready, askToSignIn]);

  return (
    <>
      <div className="welcome-backdrop" aria-hidden="true" />
      <AmbientLeaves />
      <main className="page page--welcome" id="main">
        <h1 className="visually-hidden">Leaves</h1>
        <p className="welcome__line">{LINE}</p>
        {!auth.ready ? (
          <BreathingLeaf />
        ) : askToSignIn ? (
          <>
            <p className="welcome__private">
              <LockIcon size={18} />
              <span>Private by design. Only you can read what you write.</span>
            </p>
            <AuthPanel next="/" />
            <button type="button" className="link-button welcome__guest" onClick={() => void begin()}>
              Try it first, without an account
            </button>
          </>
        ) : (
          <button ref={button} type="button" className="button button--primary" onClick={() => void begin()}>
            Begin
          </button>
        )}
        <nav className="welcome__footer" aria-label="About Leaves">
          <button type="button" className="link-button" onClick={() => go("/about", { from: "/welcome" })}>
            About
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link-button" onClick={() => go("/privacy", { from: "/welcome" })}>
            Privacy
          </button>
          {!install.installed ? (
            <>
              <span aria-hidden="true">·</span>
              <button type="button" className="link-button" onClick={() => (install.canPrompt ? void promptInstall() : setHowTo(true))}>
                Install
              </button>
            </>
          ) : null}
        </nav>
      </main>
      <Dialog open={howTo} onClose={() => setHowTo(false)} title="Install Leaves">
        <InstallCard />
        <div className="dialog__actions">
          <button type="button" className="button" onClick={() => setHowTo(false)}>
            Close
          </button>
        </div>
      </Dialog>
      <Grass />
    </>
  );
}
