import { useEffect, useState } from "react";

/** One quiet message at a time, with an optional action such as Undo. */
interface ToastData {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  ms: number;
}

let current: ToastData | null = null;
const listeners = new Set<(t: ToastData | null) => void>();
let seq = 0;

export function showToast(message: string, action?: ToastData["action"], ms = 6000) {
  current = { id: ++seq, message, action, ms };
  listeners.forEach((fn) => fn(current));
}

export function hideToast() {
  current = null;
  listeners.forEach((fn) => fn(null));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastData | null>(current);
  useEffect(() => {
    listeners.add(setToast);
    return () => {
      listeners.delete(setToast);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(hideToast, toast.ms);
    return () => window.clearTimeout(t);
  }, [toast]);
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toast ? (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              className="button button--quiet toast__action"
              onClick={() => {
                toast.action!.run();
                hideToast();
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
