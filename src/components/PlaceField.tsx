import { useState } from "react";
import { lookUpPlace } from "../lib/place";
import { Dialog } from "./Dialog";
import { PinIcon } from "./icons";
import { SteadyButton } from "./SteadyButton";

/**
 * "Add place". The first tap asks the browser for permission; the coarse name
 * it finds can be edited or replaced with anything, like "Grandma's kitchen".
 */
export function PlaceField({ place, onChange }: { place: string | null; onChange: (name: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [looking, setLooking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const start = async () => {
    setDraft(place ?? "");
    setNote(null);
    setOpen(true);
    if (place) return;
    setLooking(true);
    const found = await lookUpPlace();
    setLooking(false);
    if (found) setDraft((d) => d || found);
    else setNote("Couldn't find where you are. You can type any place.");
  };

  const save = () => {
    const name = draft.trim();
    onChange(name || null);
    setOpen(false);
  };

  return (
    <>
      <SteadyButton
        className="button button--quiet button--icon"
        onPress={() => void start()}
        aria-label={place ? `Place: ${place}. Change place` : undefined}
      >
        <PinIcon size={20} />
        <span className="place-label">{place ?? "Add place"}</span>
      </SteadyButton>
      <Dialog open={open} onClose={() => setOpen(false)} title="Place">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="field">
            <span className="field__label">Where you are</span>
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={looking ? "Looking for your area" : "A neighborhood, a city, or anywhere"}
              aria-busy={looking}
              maxLength={80}
              autoComplete="off"
            />
          </label>
          {note ? <p className="field-note">{note}</p> : null}
          <p className="field-note">Only the name is kept, never your location.</p>
          <div className="dialog__actions">
            {place ? (
              <button
                type="button"
                className="button button--quiet"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Remove place
              </button>
            ) : (
              <button type="button" className="button button--quiet" onClick={() => setOpen(false)}>
                Cancel
              </button>
            )}
            <button type="submit" className="button">
              Save place
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
