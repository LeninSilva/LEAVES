import { useRef, useState } from "react";
import { ACCEPTED_TYPES } from "../lib/photo";
import { useBlobUrl } from "../lib/store";
import type { Photo } from "../lib/types";
import { Dialog } from "./Dialog";
import { PhotoIcon } from "./icons";

interface Props {
  photo: Photo | null;
  onPick: (file: File) => Promise<void>;
  onRemove: () => void;
  onAlt: (alt: string) => void;
}

/** "Add a photo" as a modest button; once added, the photo full width. Tap it to view, replace or remove. */
export function PhotoField({ photo, onPick, onRemove, onAlt }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const url = useBlobUrl(photo?.url);

  const choose = () => input.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(file);
      setOpen(false);
    } catch {
      setError("Couldn't open that photo. Try a JPEG, PNG or HEIC.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photo-field">
      <input ref={input} type="file" accept={ACCEPTED_TYPES} onChange={onFile} className="visually-hidden" tabIndex={-1} aria-hidden="true" />
      {photo && url ? (
        <button type="button" className="photo-field__photo" onClick={() => setOpen(true)} aria-label="Photo options">
          <img src={url} alt={photo.alt || "Your photo"} />
        </button>
      ) : (
        <button type="button" className="button button--soft" onClick={choose} disabled={busy} aria-busy={busy}>
          <PhotoIcon />
          <span>{busy ? "Adding photo" : "Add a photo"}</span>
        </button>
      )}
      {error ? (
        <p className="field-note" role="alert">
          {error}
        </p>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} title="Your photo">
        <div className="stack">
          <button type="button" className="button button--soft" onClick={() => setViewing(true)}>
            View
          </button>
          <button type="button" className="button button--soft" onClick={choose} disabled={busy}>
            {busy ? "Replacing" : "Replace"}
          </button>
          <button
            type="button"
            className="button button--soft"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove
          </button>
          <label className="field">
            <span className="field__label">Describe the photo for screen readers</span>
            <textarea
              className="input input--short"
              rows={2}
              defaultValue={photo?.alt ?? ""}
              placeholder="A description is suggested after you finish"
              onBlur={(e) => onAlt(e.target.value.trim())}
            />
          </label>
          <button type="button" className="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </Dialog>

      {viewing && url ? (
        <Dialog open={viewing} onClose={() => setViewing(false)} title="Photo">
          <img className="photo-view" src={url} alt={photo?.alt || "Your photo"} />
          <div className="dialog__actions">
            <button type="button" className="button" onClick={() => setViewing(false)}>
              Close
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
