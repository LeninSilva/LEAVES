import { useEffect, useRef } from "react";
import { Grass } from "../components/Grass";
import { saveMeta } from "../lib/db";
import { prepareOpeningThought } from "../lib/pipeline";
import { navigate } from "../lib/router";

/** First launch: one sentence and a Begin button. No tour. */
export function Welcome() {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    void prepareOpeningThought();
  }, []);
  return (
    <>
      <main className="page page--welcome" id="main">
        <h1 className="visually-hidden">Leaves</h1>
        <p className="welcome__line">Write about your day. When you finish, you'll get a small drawing and a thought to keep.</p>
        <button
          ref={button}
          type="button"
          className="button button--primary"
          onClick={async () => {
            await saveMeta({ welcomed: true });
            navigate("/", { replace: true });
          }}
        >
          Begin
        </button>
      </main>
      <Grass />
    </>
  );
}
