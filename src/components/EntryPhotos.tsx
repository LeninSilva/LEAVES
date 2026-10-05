import { useBlobUrl } from "../lib/store";
import type { Photo } from "../lib/types";

function EntryPhoto({ photo }: { photo: Photo }) {
  const url = useBlobUrl(photo.url);
  const ratio = photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined;
  return (
    <figure className="entry__figure">
      <div className="entry__frame" style={ratio}>
        {url ? <img src={url} alt={photo.alt || (photo.caption ? "" : "Photo")} decoding="async" /> : null}
      </div>
      {photo.caption ? <figcaption className="entry__caption">{photo.caption}</figcaption> : null}
    </figure>
  );
}

/** An entry's photographs in order, each with its caption beneath, like a blog post. */
export function EntryPhotos({ photos }: { photos: Photo[] }) {
  if (!photos.length) return null;
  return (
    <div className="entry__photos">
      {photos.map((p) => (
        <EntryPhoto key={p.id} photo={p} />
      ))}
    </div>
  );
}
