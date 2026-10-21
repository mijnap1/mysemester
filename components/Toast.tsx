'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import './toast.css';

export type ToastType = 'info' | 'success' | 'error';

/** A button shown inside the toast, e.g. "Undo". Clicking it also dismisses the toast. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
  action: ToastAction | null;
}

/** Small status toast at the top of the page. Render `toast` once; call `show` to display a message. */
export function useToast(): {
  show: (message: string, type?: ToastType, ms?: number, action?: ToastAction) => void;
  toast: ReactNode;
} {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false, action: null });
  const timer = useRef<number | null>(null);

  const hide = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', ms = 2600, action?: ToastAction) => {
      if (timer.current) window.clearTimeout(timer.current);
      setToast({ message, type, visible: true, action: action ?? null });
      timer.current = window.setTimeout(hide, ms);
    },
    [hide],
  );

  const className = [
    'app-toast',
    toast.visible && 'show',
    toast.action && 'has-action',
    toast.type === 'success' && 'is-success',
    toast.type === 'error' && 'is-error',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    show,
    toast: (
      <div className={className} role={toast.type === 'error' ? 'alert' : 'status'} aria-live="polite">
        <span>{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            className="app-toast-action"
            tabIndex={toast.visible ? 0 : -1}
            onClick={() => {
              const action = toast.action;
              hide();
              action?.onClick();
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    ),
  };
}
