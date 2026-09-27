import { useId, useState } from "react";
import { formatMoment, formatStamp } from "../lib/dates";
import type { Entry } from "../lib/types";

/** The date line. Tapping it shows when writing began, when it finished, and the place. */
export function Stamp({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!entry.finishedAt) return null;
  return (
    <div className="stamp">
      <button type="button" className="stamp__button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <time dateTime={entry.finishedAt}>{formatStamp(entry)}</time>
      </button>
      {entry.editedAt ? <span className="stamp__edited">Edited</span> : null}
      <dl id={id} className="stamp__details" hidden={!open}>
        {entry.startedAt ? (
          <div>
            <dt>Began</dt>
            <dd>{formatMoment(entry.startedAt, entry.startTimeZone ?? entry.timeZone)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Finished</dt>
          <dd>{formatMoment(entry.finishedAt, entry.timeZone)}</dd>
        </div>
        {entry.place ? (
          <div>
            <dt>Place</dt>
            <dd>{entry.place.name}</dd>
          </div>
        ) : null}
        {entry.editedAt ? (
          <div>
            <dt>Edited</dt>
            <dd>{formatMoment(entry.editedAt, entry.timeZone)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
