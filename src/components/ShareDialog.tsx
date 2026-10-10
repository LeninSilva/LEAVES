import { useEffect, useMemo, useRef, useState } from "react";
import { useResolvedTheme } from "../lib/art";
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
  const appTheme = useResolvedTheme();
  // The card starts in the colors the app is showing; it can be made in either.
  const [cardTheme, setCardTheme] = useState<"daylight" | "lamplight" | null>(null);
  const theme = cardTheme ?? appTheme;
  const style = settings.illustrationStyle;
  const [preview, setPreview] = useState<{ url: string; failed: boolean } | null>(null);

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

  const cloudReady = cloudConfigured && auth.signedIn;
  const snap = { withPhoto, withReflection, withPlace, style, theme: appTheme };
  const cardOptions = useMemo(
    () => ({ image, excerpt, withReflection, withPlace, theme, style }),
    [image, excerpt, withReflection, withPlace, theme, style],
  );

  // A small copy of the card, redrawn a moment after anything changes, so what is shared is no surprise.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let made: string | null = null;
    const timer = window.setTimeout(async () => {
      try {
        const blob = await renderCard(entry, cardOptions, 0.4);
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setPreview((old) => {
          if (old?.url) URL.revokeObjectURL(old.url);
          return { url: made!, failed: false };
        });
      } catch {
        if (!cancelled) setPreview({ url: "", failed: true });
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, entry, cardOptions]);
  // Let go of the preview's memory when the dialog closes or goes away.
  const latest = useRef<string | null>(null);
  latest.current = preview?.url || null;
  useEffect(() => {
    if (!open) {
      setPreview((old) => {
        if (old?.url) URL.revokeObjectURL(old.url);
        return null;
      });
    }
  }, [open]);
  useEffect(
    () => () => {
      if (latest.current) URL.revokeObjectURL(latest.current);
    },
    [],
  );
  const link = entry.share.linkToken ? shareUrl(entry.share.linkToken) : null;

  return (
    <Dialog open={open} onClose={onClose} title="Share">
      <div className="stack share">
        <fieldset className="group">
          <legend>What to include</legend>
          {entry.photos.length > 0 ? (
            <div className="segmented" role="radiogroup" aria-label="Picture">
              {(["illustration", "photo"] as const).map((v) => (
                <label key={v} className="segmented__option">
                  <input type="radio" name="card-image" value={v} checked={image === v} onChange={() => setImage(v)} />
                  <span>{v === "illustration" ? "Drawing" : "My photo"}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="field">
            <span className="field__label" id="card-colors">
              Card colors
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby="card-colors">
              {(["daylight", "lamplight"] as const).map((v) => (
                <label key={v} className="segmented__option">
                  <input type="radio" name="card-theme" value={v} checked={theme === v} onChange={() => setCardTheme(v)} />
                  <span>{v === "daylight" ? "Daylight" : "Lamplight"}</span>
                </label>
              ))}
            </div>
          </div>
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

        <div className="share__preview">
          {preview?.url ? (
            <img src={preview.url} alt="Preview of your card" width={432} height={540} />
          ) : (
            <p className="field-note" role="status">
              {preview?.failed ? "Couldn't draw a preview. You can still share the image." : "Drawing a preview"}
            </p>
          )}
        </div>

        <button
          type="button"
          className="button"
          disabled={!!busy}
          onClick={() =>
            run("image", async () => {
              const blob = await renderCard(entry, cardOptions);
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
              {entry.photos.length > 0 ? (
                <label className="check">
                  <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} />
                  <span>{entry.photos.length > 1 ? "Include my photos and captions" : "Include my photo and caption"}</span>
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
