import { useEffect, useRef } from "react";
import { AuthPanel } from "../components/AuthPanel";
import { BreathingLeaf } from "../components/BreathingLeaf";
import { Grass } from "../components/Grass";
import { LockIcon } from "../components/icons";
import { useAuth } from "../lib/auth";
import { saveMeta } from "../lib/db";
import { prepareOpeningThought } from "../lib/pipeline";
import { go, navigate } from "../lib/router";

const LINE = "Write about your day. When you finish, you'll get a small drawing and a thought to keep.";

async function begin() {
  await saveMeta({ welcomed: true });
  navigate("/", { replace: true });
}

/** First launch: one sentence, then Begin, or a way in to your own account. No tour. */
export function Welcome() {
  const auth = useAuth();
  const button = useRef<HTMLButtonElement>(null);
  const askToSignIn = auth.configured && auth.ready && !auth.signedIn;

  useEffect(() => {
    void prepareOpeningThought();
  }, []);
  useEffect(() => {
    if (auth.ready && !askToSignIn) button.current?.focus();
  }, [auth.ready, askToSignIn]);

  return (
    <>
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
        </nav>
      </main>
      <Grass />
    </>
  );
}
