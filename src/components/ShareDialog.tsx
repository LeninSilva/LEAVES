import { useEffect, useState } from "react";
import { cloudConfigured, useAuth } from "../lib/auth";
import {
  copyMarkdown,
  createLink,
  getProfile,
  publish,
  renderCard,
  revokeLink,
  saveProfile,
  shareFile,
  shareUrl,
  slug,
  unpublish,
} from "../lib/share";
import { useSettings } from "../lib/store";
import type { Entry } from "../lib/types";
import { Dialog } from "./Dialog";
import { go } from "../lib/router";

function firstLines(text: string, n = 3) {
  return text.trim().split(/\n+/).slice(0, n).join("\n");
}

/** Share as an image card, a private link, or plain text; or add to the public page. */
export function ShareDialog({ entry, open, onClose }: { entry: Entry; open: boolean; onClose: () => void }) {
  const [settings] = useSettings();
  const auth = useAuth();
  const [image, setImage] = useState<"illustration" | "photo">("illustration");
  const [excerpt, setExcerpt] = useState(() => firstLines(entry.text));
  const [withReflection, setWithReflection] = useState(true);
  const [withPhoto, setWithPhoto] = useState(false);
  const [withPlace, setWithPlace] = useState(settings.sharePlace);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [handleDraft, setHandleDraft] = useState("");

  useEffect(() => setWithPlace(settings.sharePlace), [settings.sharePlace]);
  useEffect(() => {
    if (open && cloudConfigured) getProfile().then((p) => setHandle(p?.handle ?? null));
    if (open) setNote(null);
  }, [open]);

  const run = async (label: string, task: () => Promise<string | void>) => {
    setBusy(label);
    setNote(null);
    try {
      const msg = await task();
      if (msg) setNote(msg);
    } catch (err) {
      setNote((err as Error).message || "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const theme = document.documentElement.dataset.theme === "lamplight" ? "lamplight" : "daylight";
  const cloudReady = cloudConfigured && auth.user;
  const snap = { withPhoto, withReflection, withPlace };
  const link = entry.share.linkToken ? shareUrl(entry.share.linkToken) : null;

  return (
    <Dialog open={open} onClose={onClose} title="Share">
      <div className="stack share">
        <fieldset className="group">
          <legend>What to include</legend>
          {entry.photo ? (
            <div className="segmented" role="radiogroup" aria-label="Picture">
              {(["illustration", "photo"] as const).map((v) => (
                <label key={v} className="segmented__option">
                  <input type="radio" name="card-image" value={v} checked={image === v} onChange={() => setImage(v)} />
                  <span>{v === "illustration" ? "Drawing" : "My photo"}</span>
                </label>
              ))}
            </div>
          ) : null}
          <label className="field">
            <span className="field__label">Words to show</span>
            <textarea className="input input--short" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={withReflection} onChange={(e) => setWithReflection(e.target.checked)} />
            <span>Include the reflection</span>
          </label>
          {entry.place ? (
            <label className="check">
              <input type="checkbox" checked={withPlace} onChange={(e) => setWithPlace(e.target.checked)} />
              <span>Include the place</span>
            </label>
          ) : null}
        </fieldset>

        <button
          type="button"
          className="button"
          disabled={!!busy}
          onClick={() =>
            run("image", async () => {
              const blob = await renderCard(entry, { image, excerpt, withReflection, withPlace, theme });
              const result = await shareFile(blob, `${slug(entry.title ?? "entry")}.png`, entry.title ?? "Leaves");
              if (result === "downloaded") return "Saved the image to your downloads.";
            })
          }
        >
          {busy === "image" ? "Making the image" : "Share as an image"}
        </button>

        <button
          type="button"
          className="button button--soft"
          disabled={!!busy}
          onClick={() =>
            run("text", async () => ((await copyMarkdown(entry, withPlace)) ? "Copied as text." : "Couldn't copy. Try again."))
          }
        >
          Copy as text
        </button>

        <section className="group" aria-labelledby="link-heading">
          <h3 id="link-heading" className="group__title">
            Link
          </h3>
          {!cloudConfigured ? (
            <p className="field-note">Links need an account, which isn't set up on this server.</p>
          ) : !cloudReady ? (
            <p className="field-note">
              <button type="button" className="text-button" onClick={() => go("/settings/account")}>
                Sign in
              </button>{" "}
              to share a link.
            </p>
          ) : link ? (
            <div className="stack">
              <p className="field-note">Anyone with this link can read this entry. Search engines can't see it.</p>
              <input className="input" readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} />
              <div className="row">
                <button
                  type="button"
                  className="button button--soft"
                  onClick={() =>
                    run("copy", async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({ url: link, title: entry.title ?? "Leaves" });
                          return;
                        } catch {
                          /* fall through to copy */
                        }
                      }
                      await navigator.clipboard.writeText(link);
                      return "Copied the link.";
                    })
                  }
                >
                  Share link
                </button>
                <button type="button" className="button button--quiet" disabled={!!busy} onClick={() => run("revoke", async () => { await revokeLink(entry); return "The link no longer works."; })}>
                  Stop sharing
                </button>
              </div>
            </div>
          ) : (
            <div className="stack">
              {entry.photo ? (
                <label className="check">
                  <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} />
                  <span>Include my photo</span>
                </label>
              ) : null}
              <button type="button" className="button button--soft" disabled={!!busy} onClick={() => run("link", async () => void (await createLink(entry, snap)))}>
                {busy === "link" ? "Making the link" : "Make a private link"}
              </button>
            </div>
          )}
        </section>

        {cloudReady ? (
          <section className="group" aria-labelledby="public-heading">
            <h3 id="public-heading" className="group__title">
              Public page
            </h3>
            {entry.share.published ? (
              <div className="stack">
                <p className="field-note">
                  This entry is on your public page
                  {handle ? (
                    <>
                      {" at "}
                      <a href={`/p/${handle}`}>{`${location.host}/p/${handle}`}</a>
                    </>
                  ) : null}
                  .
                </p>
                <button type="button" className="button button--quiet" disabled={!!busy} onClick={() => run("unpublish", async () => { await unpublish(entry); return "Taken off your public page."; })}>
                  Unpublish
                </button>
              </div>
            ) : handle ? (
              <button type="button" className="button button--soft" disabled={!!busy} onClick={() => run("publish", async () => { await publish(entry, snap); return "Published."; })}>
                Publish to my page
              </button>
            ) : (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("handle", async () => {
                    const err = await saveProfile(handleDraft, null);
                    if (err) return err;
                    setHandle(handleDraft.trim().toLowerCase());
                    await publish(entry, snap);
                    return "Published.";
                  });
                }}
              >
                <label className="field">
                  <span className="field__label">Name for your public page</span>
                  <input className="input" value={handleDraft} onChange={(e) => setHandleDraft(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={30} />
                </label>
                <button type="submit" className="button button--soft" disabled={!!busy}>
                  Publish to my page
                </button>
              </form>
            )}
          </section>
        ) : null}

        <p className="field-note" role="status" aria-live="polite">
          {note}
        </p>
        <button type="button" className="button button--quiet" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
