import { useEffect, useId, useRef } from "react";

/**
 * A native <dialog>, which gives focus trapping, Escape to close and the
 * right semantics for free. Opens as a sheet from the bottom on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  describedBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  describedBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onClose={onClose}
      onClick={(e) => {
        // A tap on the backdrop closes it.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog__body">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

/** Asks once. The confirming action is named plainly, never "OK". */
export function Confirm({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const bodyId = useId();
  return (
    <Dialog open={open} onClose={onCancel} title={title} describedBy={bodyId}>
      <p id={bodyId} className="dialog__text">
        {body}
      </p>
      <div className="dialog__actions">
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={danger ? "button button--danger" : "button"} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
