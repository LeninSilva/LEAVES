import { useState } from "react";
import { promptInstall, useInstall } from "../lib/install";
import { LeafIcon, ShareIcon } from "./icons";

/** How to put Leaves on the home screen, for whichever device this is. */
export function InstallCard() {
  const install = useInstall();
  const [note, setNote] = useState<string | null>(null);

  if (install.installed) {
    return (
      <p className="setting__hint install__done">
        <LeafIcon size={18} /> Leaves is on your home screen. It opens like any app and works without a connection.
      </p>
    );
  }

  return (
    <div className="install">
      <p className="setting__hint">
        Open Leaves from an icon on your home screen, like any app. It works without a connection, and installing helps your phone keep your pages safe.
      </p>
      {install.canPrompt ? (
        <button
          type="button"
          className="button"
          onClick={async () => {
            const ok = await promptInstall();
            setNote(ok ? "Installed. Look for Leaves on your home screen." : null);
          }}
        >
          Install Leaves
        </button>
      ) : install.ios ? (
        <ol className="install__steps">
          <li>
            Open this page in <strong>Safari</strong>.
          </li>
          <li>
            Tap the <strong>Share</strong> button <ShareIcon size={18} className="install__icon" /> at the bottom of the screen.
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
        </ol>
      ) : (
        <p className="setting__hint">
          Open your browser's menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
        </p>
      )}
      {note ? (
        <p className="field-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
