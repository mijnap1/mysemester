'use client';

import { useEffect, useRef } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';

/** The tutorial's closing message, shown once on the course page the last step opens. */
export function TourFinale({ open, onDone }: { open: boolean; onDone: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) buttonRef.current?.focus();
  }, [open]);

  return (
    <Dialog open={open} onClose={onDone} id="tourFinale">
      <div className="tour-finale-icon">
        <Icon name="sparkles-outline" />
      </div>
      <h2>You’re all set!</h2>
      <p>This is your course page. Add each assessment with its weight, and MySemester keeps your average and GPA up to date as grades come in.</p>
      <p className="tour-finale-luck">Good luck this semester 🍀</p>
      <button ref={buttonRef} type="button" className="tour-finale-btn" onClick={onDone}>
        Let’s go
      </button>
    </Dialog>
  );
}
