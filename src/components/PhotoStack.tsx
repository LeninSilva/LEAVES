import { useRef, useState } from "react";
import { MAX_PHOTOS } from "../lib/entries";
import { ACCEPTED_TYPES } from "../lib/photo";
import { useBlobUrl } from "../lib/store";
import type { Photo } from "../lib/types";
import type { PhotoActions } from "../lib/usePhotoActions";
import { useAutoGrow } from "../lib/useAutoGrow";
import { Dialog } from "./Dialog";
import { MoreIcon, PhotoIcon } from "./icons";
import { Menu } from "./Menu";

function aspect(photo: Photo): React.CSSProperties | undefined {
  return photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined;
}

function PhotoItem({
  photo,
  index,
  count,
  actions,
  onView,
  onDescribe,
}: {
  photo: Photo;
  index: number;
  count: number;
  actions: PhotoActions;
  onView: () => void;
  onDescribe: () => void;
}) {
  const url = useBlobUrl(photo.url);
  const caption = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(caption, photo.caption);
  return (
    <li className="photo-item">
      <button type="button" className="photo-item__frame" style={aspect(photo)} onClick={onView} aria-label={`View photo ${index + 1} larger`}>
        {url ? <img src={url} alt={photo.alt} decoding="async" /> : <span className="photo-item__loading" aria-hidden="true" />}
      </button>
      <div className="photo-item__menu">
        <Menu
          label={`Options for photo ${index + 1}`}
          icon={<MoreIcon size={20} />}
          triggerClassName="photo-item__more"
          hideLabel
          items={[
            { label: "Move earlier", onSelect: () => actions.move(photo.id, -1), hidden: index === 0 },
            { label: "Move later", onSelect: () => actions.move(photo.id, 1), hidden: index === count - 1 },
            { label: "Describe for screen readers", onSelect: onDescribe },
            { label: "Remove photo", onSelect: () => actions.remove(photo.id) },
          ]}
        />
      </div>
      <textarea
        ref={caption}
        className="photo-caption"
        rows={1}
        maxLength={600}
        value={photo.caption}
        placeholder="Add a caption"
        aria-label={`Caption for photo ${index + 1}`}
        enterKeyHint="done"
        onChange={(e) => actions.caption(photo.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
    </li>
  );
}

function DescribeDialog({ photo, onDone, onSave }: { photo: Photo; onDone: () => void; onSave: (alt: string) => void }) {
  const [alt, setAlt] = useState(photo.alt);
  const save = () => {
    onSave(alt.trim());
    onDone();
  };
  return (
    <Dialog open onClose={onDone} title="Describe the photo">
      <div className="stack">
        <label className="field">
          <span className="field__label">For screen readers</span>
          <textarea
            className="input input--short"
            rows={3}
            value={alt}
            maxLength={300}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="A description is suggested after you finish"
          />
        </label>
        <p className="field-note">The caption under the photo is what you and your readers see. This is only for people who can't see the picture.</p>
        <div className="dialog__actions">
          <button type="button" className="button button--quiet" onClick={onDone}>
            Cancel
          </button>
          <button type="button" className="button" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function ViewDialog({ photo, onDone }: { photo: Photo; onDone: () => void }) {
  const url = useBlobUrl(photo.url);
  return (
    <Dialog open onClose={onDone} title="Photo">
      {url ? <img className="photo-view" src={url} alt={photo.alt} /> : null}
      {photo.caption ? <p className="photo-view__caption">{photo.caption}</p> : null}
      <div className="dialog__actions">
        <button type="button" className="button" onClick={onDone}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

/**
 * The photographs of a page, like a small blog: each one full width with a
 * caption under it. Add as many as you like.
 */
export function PhotoStack({ photos, actions }: { photos: Photo[]; actions: PhotoActions }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const [describing, setDescribing] = useState<string | null>(null);
  const busy = !!actions.adding;
  const full = photos.length >= MAX_PHOTOS;
  const viewed = photos.find((p) => p.id === viewing);
  const described = photos.find((p) => p.id === describing);

  return (
    <section className="photos" aria-label="Photos">
      {photos.length ? (
        <ol className="photos__list">
          {photos.map((p, i) => (
            <PhotoItem
              key={p.id}
              photo={p}
              index={i}
              count={photos.length}
              actions={actions}
              onView={() => setViewing(p.id)}
              onDescribe={() => setDescribing(p.id)}
            />
          ))}
        </ol>
      ) : null}

      {!full ? (
        <label className="button button--soft photos__add" aria-busy={busy}>
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="visually-hidden"
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void actions.add(files);
            }}
          />
          <PhotoIcon />
          <span>
            {actions.adding
              ? `Adding photo ${Math.min(actions.adding.done + 1, actions.adding.total)} of ${actions.adding.total}`
              : photos.length
                ? "Add another photo"
                : "Add a photo"}
          </span>
        </label>
      ) : null}

      {actions.error ? (
        <p className="field-note" role="alert">
          {actions.error}
        </p>
      ) : null}

      {viewed ? <ViewDialog key={viewed.id} photo={viewed} onDone={() => setViewing(null)} /> : null}
      {described ? (
        <DescribeDialog key={described.id} photo={described} onDone={() => setDescribing(null)} onSave={(alt) => actions.describe(described.id, alt)} />
      ) : null}
    </section>
  );
}
