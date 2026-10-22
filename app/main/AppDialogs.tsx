'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: 'primary' | 'danger';
  showCancel?: boolean;
  /** Ionicon shown above the title. Defaults to a question mark, or a warning for danger. */
  icon?: string;
}

interface InputOptions {
  title?: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  icon?: string;
  /** Return an error message to block saving, or '' to accept. */
  validate?: (value: string) => string;
}

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'input'; options: InputOptions; resolve: (value: string | null) => void };

/**
 * In-app replacements for confirm() and prompt(). Each call returns a promise
 * that resolves when the user answers.
 */
export function useAppDialogs(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notice: (message: string, title?: string, icon?: string) => Promise<boolean>;
  input: (options: InputOptions) => Promise<string | null>;
  dialogs: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: 'confirm', options, resolve })),
    [],
  );
  const notice = useCallback(
    (message: string, title = 'Notice', icon = 'information-circle-outline') =>
      confirm({ title, message, icon, confirmText: 'OK', showCancel: false }),
    [confirm],
  );
  const input = useCallback(
    (options: InputOptions) => new Promise<string | null>((resolve) => setPending({ kind: 'input', options, resolve })),
    [],
  );

  const finishConfirm = (ok: boolean) => {
    if (pending?.kind === 'confirm') pending.resolve(ok);
    setPending(null);
  };
  const finishInput = (value: string | null) => {
    if (pending?.kind === 'input') pending.resolve(value);
    setPending(null);
  };

  const dialogs = (
    <>
      <ConfirmDialog pending={pending?.kind === 'confirm' ? pending.options : null} onAnswer={finishConfirm} />
      <InputDialog pending={pending?.kind === 'input' ? pending.options : null} onAnswer={finishInput} />
    </>
  );

  return { confirm, notice, input, dialogs };
}

function DialogIcon({ name, danger }: { name: string; danger?: boolean }) {
  return (
    <span className={danger ? 'ad-icon is-danger' : 'ad-icon'}>
      <Icon name={name} />
    </span>
  );
}

function ConfirmDialog({ pending, onAnswer }: { pending: ConfirmOptions | null; onAnswer: (ok: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const options = pending ?? {};
  const danger = options.confirmTone === 'danger';
  const hasCancel = options.showCancel !== false;
  useEffect(() => {
    // Enter shouldn't delete things by accident: dangerous confirms start on Cancel.
    if (pending) (pending.confirmTone === 'danger' && pending.showCancel !== false ? cancelRef : okRef).current?.focus();
  }, [pending]);
  return (
    <Dialog open={!!pending} onClose={() => onAnswer(false)} id="appConfirmModal" className="app-dialog">
      <div className="ad">
        <DialogIcon name={options.icon ?? (danger ? 'alert-circle-outline' : 'help-circle-outline')} danger={danger} />
        <h2 className="ad-title">{options.title ?? 'Confirm action'}</h2>
        <p className="ad-message">{options.message ?? 'Are you sure?'}</p>
        <div className={hasCancel ? 'ad-actions' : 'ad-actions is-single'}>
          {hasCancel && (
            <button ref={cancelRef} type="button" className="btn-plain" onClick={() => onAnswer(false)}>
              {options.cancelText ?? 'Cancel'}
            </button>
          )}
          <button ref={okRef} type="button" className={danger ? 'btn-primary danger' : 'btn-primary'} onClick={() => onAnswer(true)}>
            {options.confirmText ?? 'Confirm'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function InputDialog({ pending, onAnswer }: { pending: InputOptions | null; onAnswer: (value: string | null) => void }) {
  return (
    <Dialog open={!!pending} onClose={() => onAnswer(null)} id="appInputModal" className="app-dialog">
      {pending && <InputForm options={pending} onAnswer={onAnswer} />}
    </Dialog>
  );
}

function InputForm({ options, onAnswer }: { options: InputOptions; onAnswer: (value: string | null) => void }) {
  const [value, setValue] = useState(options.initialValue ?? '');
  const [error, setError] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, []);

  return (
    <form
      className="ad"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        const message = options.validate?.(trimmed) ?? '';
        if (message) {
          setError(message);
          fieldRef.current?.focus();
          return;
        }
        onAnswer(trimmed);
      }}
    >
      <DialogIcon name={options.icon ?? 'create-outline'} />
      <h2 className="ad-title">{options.title ?? 'Enter value'}</h2>
      {options.message && <p className="ad-message">{options.message}</p>}
      <input
        ref={fieldRef}
        className={error ? 'ad-input has-error' : 'ad-input'}
        type="text"
        autoComplete="off"
        placeholder={options.placeholder}
        aria-label={options.title ?? 'Value'}
        aria-invalid={!!error}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError('');
        }}
      />
      {error && <p className="ad-error">{error}</p>}
      <div className="ad-actions">
        <button type="button" className="btn-plain" onClick={() => onAnswer(null)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {options.confirmText ?? 'Save'}
        </button>
      </div>
    </form>
  );
}
