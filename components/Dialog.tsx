'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Keeps `body.dialog-lock` set while any modal dialog is open (the CSS stops background scroll). */
function syncDialogLock() {
  document.body.classList.toggle('dialog-lock', !!document.querySelector('dialog[open]'));
}

interface DialogProps {
  open: boolean;
  /** Called when the dialog closes itself (Escape key). */
  onClose: () => void;
  id?: string;
  className?: string;
  children: ReactNode;
  dialogRef?: React.RefObject<HTMLDialogElement | null>;
}

/** A native modal <dialog> driven by the `open` prop. */
export function Dialog({ open, onClose, id, className, children, dialogRef }: DialogProps) {
  const localRef = useRef<HTMLDialogElement>(null);
  const ref = dialogRef ?? localRef;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    syncDialogLock();
  }, [open, ref]);

  useEffect(() => () => {
    // Unmounting an open dialog must not leave the page locked.
    queueMicrotask(syncDialogLock);
  }, []);

  return (
    <dialog
      ref={ref}
      id={id}
      className={className}
      onClose={() => {
        syncDialogLock();
        if (open) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
