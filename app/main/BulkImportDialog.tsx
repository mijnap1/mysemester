'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Returns an error message, or null when the import succeeded. */
  onImport: (csv: string) => string | null;
}

export function BulkImportDialog({ open, onClose, onImport }: BulkImportDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} id="bulkImportModal">
      {open && <BulkImportBody onClose={onClose} onImport={onImport} />}
    </Dialog>
  );
}

function BulkImportBody({ onClose, onImport }: Omit<BulkImportDialogProps, 'open'>) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  return (
    <>
      <div className="modal-head">
        <Icon name="document-text-outline" />
        <span>Bulk Import Courses</span>
      </div>
      <div className="modal-body">
        <p className="bulk-import-help">
          Paste CSV with columns: <strong>code,title,grade,icon,folder</strong>. Only <strong>code</strong> is required.
        </p>
        <textarea
          autoFocus
          placeholder="CSC108,Intro to CS,84,laptop-outline,Fall 2026"
          aria-label="CSV rows"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && (
          <div className="error" style={{ display: 'block' }}>
            {error}
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-plain" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const message = onImport(text);
            if (message) setError(message);
            else onClose();
          }}
        >
          Import
        </button>
      </div>
    </>
  );
}
