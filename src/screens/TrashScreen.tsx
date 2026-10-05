import { useState } from "react";
import { Confirm } from "../components/Dialog";
import { showToast } from "../components/Toast";
import { formatRowDate } from "../lib/dates";
import { emptyTrash, purgeEntry, TRASH_DAYS } from "../lib/db";
import { navigate } from "../lib/router";
import { useTrashed } from "../lib/store";
import { bringBack } from "../lib/trash";
import type { Entry } from "../lib/types";
import { SettingsBar } from "./SettingsScreen";

const DAY = 86_400_000;

function daysLeft(e: Entry, now = Date.now()): number {
  return Math.max(0, Math.ceil(((e.deletedAt ?? now) + TRASH_DAYS * DAY - now) / DAY));
}

function leftText(n: number): string {
  if (n <= 0) return "Removed for good today";
  if (n === 1) return "Removed for good tomorrow";
  return `Removed for good in ${n} days`;
}

/** Entries that were deleted, kept for 30 days so a slip of the finger never costs a page. */
export function TrashScreen() {
  const [list, ready] = useTrashed();
  const [forgetting, setForgetting] = useState<Entry | null>(null);
  const [emptying, setEmptying] = useState(false);

  return (
    <>
      <SettingsBar back="/settings" label="Settings" />
      <main className="page page--prose" id="main">
        <h1 className="page-title">Recently deleted</h1>
        <p className="lead">Entries you delete stay here for {TRASH_DAYS} days, with their photos, and then they are removed for good.</p>

        {ready && list.length === 0 ? <p className="empty">Nothing here.</p> : null}

        <ul className="plain-list trash">
          {list.map((e) => (
            <li key={e.id} className="trash__item">
              <div className="trash__body">
                <span className="trash__title">{e.title ?? "Untitled"}</span>
                <span className="trash__meta">
                  {formatRowDate(e)}
                  {e.photos.length ? ` · ${e.photos.length} ${e.photos.length === 1 ? "photo" : "photos"}` : ""}
                </span>
                <span className="trash__meta">{leftText(daysLeft(e))}</span>
              </div>
              <div className="trash__actions">
                <button
                  type="button"
                  className="button button--soft"
                  onClick={async () => {
                    await bringBack(e.id);
                    showToast("Brought back.", { label: "Open", run: () => navigate(`/entry/${e.id}`) }, 6000);
                  }}
                >
                  Bring back
                </button>
                <button type="button" className="button button--danger-quiet" onClick={() => setForgetting(e)}>
                  Delete now
                </button>
              </div>
            </li>
          ))}
        </ul>

        {list.length > 1 ? (
          <button type="button" className="button button--danger-quiet trash__all" onClick={() => setEmptying(true)}>
            Delete all
          </button>
        ) : null}
      </main>

      <Confirm
        open={!!forgetting}
        title="Delete for good?"
        body="This entry and its photos will be removed from this device and your backup. It can't be undone."
        confirmLabel="Delete for good"
        danger
        onConfirm={async () => {
          const e = forgetting;
          setForgetting(null);
          if (e) await purgeEntry(e.id);
        }}
        onCancel={() => setForgetting(null)}
      />
      <Confirm
        open={emptying}
        title="Delete everything here?"
        body="Every entry in Recently deleted, with its photos, will be removed for good. It can't be undone."
        confirmLabel="Delete all"
        danger
        onConfirm={async () => {
          setEmptying(false);
          await emptyTrash();
        }}
        onCancel={() => setEmptying(false)}
      />
    </>
  );
}

/** What opens if someone follows a link to an entry that is in Recently deleted. */
export function DeletedEntry({ entry }: { entry: Entry }) {
  return (
    <>
      <SettingsBar back="/settings/trash" label="Recently deleted" />
      <main className="page page--prose" id="main">
        <h1 className="page-title">{entry.title ?? "Untitled"}</h1>
        <p className="lead">This entry is in Recently deleted. {leftText(daysLeft(entry))}.</p>
        <div className="stack">
          <button
            type="button"
            className="button button--primary"
            onClick={async () => {
              await bringBack(entry.id);
              navigate(`/entry/${entry.id}`, { replace: true });
            }}
          >
            Bring it back
          </button>
        </div>
      </main>
    </>
  );
}
