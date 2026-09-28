import { Component, type ReactNode } from "react";

const RELOADED = "leaves.reloadedForUpdate";

/** After a new release, a page opened earlier may ask for files that no longer exist. */
export function isStaleChunk(error: unknown): boolean {
  const m = String((error as Error)?.message ?? error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(m);
}

/** Reloads once to pick up the new release; a second failure shows the message instead. */
export function reloadForUpdate(): boolean {
  try {
    if (sessionStorage.getItem(RELOADED)) return false;
    sessionStorage.setItem(RELOADED, "1");
  } catch {
    return false;
  }
  location.reload();
  return true;
}

export function clearReloadFlag() {
  try {
    sessionStorage.removeItem(RELOADED);
  } catch {
    /* ignore */
  }
}

/** Nothing written is ever at risk here: pages are saved before any screen loads. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (isStaleChunk(error) && reloadForUpdate()) return;
    console.warn("Screen failed", (error as Error)?.message);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page page--center" id="main">
        <p className="empty">This page didn't open properly. Your entries are safe.</p>
        <button type="button" className="button button--primary" onClick={() => location.reload()}>
          Open again
        </button>
      </main>
    );
  }
}
