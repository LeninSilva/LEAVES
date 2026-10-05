import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { EntryPhotos } from "../components/EntryPhotos";
import { BackIcon, MoreIcon, ShareIcon } from "../components/icons";
import { Illustration } from "../components/Illustration";
import { LeafFall } from "../components/LeafFall";
import { Menu } from "../components/Menu";
import { ReflectionView } from "../components/ReflectionView";
import { Stamp } from "../components/Stamp";
import { Confirm } from "../components/Dialog";
import { BreathingLeaf } from "../components/BreathingLeaf";
import { showToast } from "../components/Toast";
import { NavLink, TopBar } from "../components/TopBar";
import { announce } from "../lib/announce";
import { cloudConfigured, useAuth } from "../lib/auth";
import { restoreFromTrash, saveMeta } from "../lib/db";
import { drawAgain, newReflection } from "../lib/pipeline";
import { go, navigate } from "../lib/router";
import { useMeta, useOnline } from "../lib/store";
import { deleteEntry } from "../lib/trash";
import type { Entry } from "../lib/types";

const ShareDialog = lazy(() => import("../components/ShareDialog").then((m) => ({ default: m.ShareDialog })));

export function EntryScreen({ entry, justFinished }: { entry: Entry; justFinished: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [celebrate] = useState(justFinished);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const online = useOnline();
  const [meta] = useMeta();
  const auth = useAuth();
  const reflectionWasPending = useRef(entry.steps.reflection !== "done");

  // Move focus to the title, and tell screen readers what is happening.
  useEffect(() => {
    titleRef.current?.focus();
    if (justFinished) {
      announce("Entry finished. Your drawing and reflection are on the way.");
      // Don't replay the moment on reload or when coming back.
      history.replaceState({ ...(history.state ?? {}), justFinished: false }, "");
    }
  }, [justFinished, entry.id]);

  useEffect(() => {
    if (reflectionWasPending.current && entry.steps.reflection === "done") {
      reflectionWasPending.current = false;
      if (entry.reflection) announce("Your reflection is ready.");
    }
  }, [entry.steps.reflection, entry.reflection]);

  const owed = entry.steps.reflection !== "done" || !entry.illustration;
  const drawingFailed = entry.steps.illustration === "failed";

  const onDelete = async () => {
    setConfirmDelete(false);
    await deleteEntry(entry);
    navigate("/entries", { replace: true, state: { fromApp: true } });
    showToast("Moved to Recently deleted.", { label: "Undo", run: () => void restoreFromTrash(entry.id) }, 8000);
  };

  const showNudge = celebrate && cloudConfigured && auth.ready && !auth.signedIn && !meta.signInNudgeShown;

  return (
    <>
      {celebrate ? <LeafFall seed={entry.id} /> : null}
      {celebrate ? (
        <TopBar />
      ) : (
        <TopBar
          left={
            <NavLink to="/entries" icon={<BackIcon size={20} />}>
              Entries
            </NavLink>
          }
          right={
            <Menu
              label="More"
              icon={<MoreIcon size={20} />}
              items={[
                { label: "Edit", onSelect: () => go(`/entry/${entry.id}/edit`) },
                { label: "Share", onSelect: () => setSharing(true) },
                { label: "Draw again", onSelect: () => void drawAgain(entry.id) },
                { label: "New reflection", onSelect: () => void newReflection(entry.id), hidden: entry.crisis },
                { label: "Delete", onSelect: () => setConfirmDelete(true) },
              ]}
            />
          }
        />
      )}
      <main className={`page page--entry ${celebrate ? "settle" : ""}`} id="main">
        <article>
          <div className="entry__art settle__1">
            <Illustration entry={entry} variant="large" />
            {drawingFailed && online ? (
              <div className="entry__notice">
                <p>Couldn't make the drawing. Check your connection and try again.</p>
                <button type="button" className="button button--soft" onClick={() => void drawAgain(entry.id)}>
                  Try again
                </button>
              </div>
            ) : null}
          </div>
          <h1 className="entry__title settle__2" tabIndex={-1} ref={titleRef}>
            {entry.title ?? "Untitled"}
          </h1>
          <div className="settle__3">
            <Stamp entry={entry} />
          </div>
          {!online && owed ? (
            <p className="entry__notice settle__3">
              You're offline. This entry is saved and will get its drawing and reflection when you're back online.
            </p>
          ) : null}
          <div className="settle__4">
            <EntryPhotos photos={entry.photos} />
            {entry.text ? (
              <div className="entry__text">
                {entry.text.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="settle__5">
            {entry.reflection ? (
              <ReflectionView reflection={entry.reflection} crisis={entry.crisis} />
            ) : entry.steps.reflection !== "done" && online ? (
              <div className="reflection reflection--waiting">
                <BreathingLeaf size={28} />
                <p>Your reflection is on the way.</p>
              </div>
            ) : null}
          </div>
        </article>

        {celebrate ? (
          <div className="entry__actions">
            <button type="button" className="button button--soft button--icon" onClick={() => setSharing(true)}>
              <ShareIcon size={20} />
              <span>Share</span>
            </button>
            <button type="button" className="button button--primary" onClick={() => navigate("/", { replace: true })}>
              Close
            </button>
          </div>
        ) : null}

        {showNudge ? (
          <aside className="nudge" aria-label="Back up your entries">
            <p>This entry lives only on this device. Make a free account to back it up and read it anywhere.</p>
            <div className="nudge__actions">
              <button type="button" className="button button--soft" onClick={() => void saveMeta({ signInNudgeShown: true })}>
                Not now
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  void saveMeta({ signInNudgeShown: true });
                  go("/settings/account", { create: true });
                }}
              >
                Make an account
              </button>
            </div>
          </aside>
        ) : null}
      </main>

      {sharing ? (
        <Suspense fallback={null}>
          <ShareDialog entry={entry} open={sharing} onClose={() => setSharing(false)} />
        </Suspense>
      ) : null}
      <Confirm
        open={confirmDelete}
        title="Delete this entry?"
        body="It moves to Recently deleted, where you can bring it back for 30 days. Any link you shared stops working now."
        confirmLabel="Delete entry"
        danger
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
