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
}

interface InputOptions {
  title?: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
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
  notice: (message: string, title?: string) => Promise<boolean>;
  input: (options: InputOptions) => Promise<string | null>;
  dialogs: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: 'confirm', options, resolve })),
    [],
  );
  const notice = useCallback(
    (message: string, title = 'Notice') => confirm({ title, message, confirmText: 'OK', showCancel: false }),
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

function ConfirmDialog({ pending, onAnswer }: { pending: ConfirmOptions | null; onAnswer: (ok: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  const options = pending ?? {};
  useEffect(() => {
    if (pending) okRef.current?.focus();
  }, [pending]);
  return (
    <Dialog open={!!pending} onClose={() => onAnswer(false)} id="appConfirmModal" className="app-dialog">
      <div className="modal-head">
        <Icon name="help-circle-outline" />
        <span>{options.title ?? 'Confirm action'}</span>
      </div>
      <div className="modal-body">
        <p className="app-dialog-message">{options.message ?? 'Are you sure?'}</p>
      </div>
      <div className="modal-actions">
        {options.showCancel !== false && (
          <button type="button" className="btn-plain" onClick={() => onAnswer(false)}>
            {options.cancelText ?? 'Cancel'}
          </button>
        )}
        <button
          ref={okRef}
          type="button"
          className={options.confirmTone === 'danger' ? 'btn-primary danger' : 'btn-primary'}
          onClick={() => onAnswer(true)}
        >
          {options.confirmText ?? 'Confirm'}
        </button>
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
        <div className="modal-head">
          <Icon name="create-outline" />
          <span>{options.title ?? 'Enter value'}</span>
        </div>
        <div className="modal-body">
          <p className="app-dialog-message">{options.message ?? 'Enter a value below.'}</p>
          <input
            ref={fieldRef}
            type="text"
            autoComplete="off"
            placeholder={options.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error && (
            <div className="error" style={{ display: 'block' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-actions">
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
