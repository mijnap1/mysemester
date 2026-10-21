'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useClickOutside, useRotating } from '@/lib/hooks';
import { COURSE_ICONS, ICONS_PER_PAGE, iconLabel } from '@/lib/icons';
import type { CourseInput } from '@/lib/semester';

const PLACEHOLDERS = [
  { code: 'MAT101', title: 'Calculus 1' },
  { code: 'PSY100', title: 'Introduction to Psychology' },
  { code: 'ECO101', title: 'Microeconomics' },
  { code: 'PHY101', title: 'Mechanics' },
  { code: 'BIO100', title: 'Introduction to Biology' },
];

const PAGE_COUNT = Math.ceil(COURSE_ICONS.length / ICONS_PER_PAGE);

/** Which control the onboarding tour currently allows; everything else in the form is locked. */
export type TourField = 'code' | 'title' | 'grade' | 'icon' | 'save';

interface AddCourseDialogProps {
  open: boolean;
  onClose: () => void;
  /** Course being edited, or null to add a new one. */
  editing: CourseInput | null;
  onSave: (input: CourseInput) => void;
  /** Set while the tour is walking through this form. */
  tourField?: TourField | null;
  /** Tells the tour the user typed into a field (for steps that require input). */
  onFieldInput?: () => void;
  dialogRef?: React.RefObject<HTMLDialogElement | null>;
}

function IconSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const pageOf = (v: string) => Math.max(0, Math.floor(COURSE_ICONS.findIndex((i) => i.value === v) / ICONS_PER_PAGE));
  const [page, setPage] = useState(() => pageOf(value));
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside([ref], () => setOpen(false), open);

  return (
    <div className={open ? 'profile-select-wrap icon-select-wrap open' : 'profile-select-wrap icon-select-wrap'} ref={ref}>
      <button
        type="button"
        className="profile-select-button"
        id="iconSelectButton"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
          onClick={() => {
          if (!open) setPage(pageOf(value));
          setOpen(!open);
        }}
      >
        {iconLabel(value)}
      </button>
      <input type="hidden" name="icon" id="iconInput" value={value} />
      <div className="profile-select-menu icon-select-menu" role="listbox" aria-label="Course icon">
        <button type="button" className="icon-page-button icon-page-prev" aria-label="Previous icons" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          <Icon name="chevron-back-outline" />
        </button>
        <div className="icon-select-grid">
          {COURSE_ICONS.map((icon, i) => (
            <button
              key={icon.value}
              type="button"
              role="option"
              aria-selected={icon.value === value}
              className={icon.value === value ? 'profile-select-option icon-select-option is-selected' : 'profile-select-option icon-select-option'}
              hidden={Math.floor(i / ICONS_PER_PAGE) !== page}
              onClick={() => {
                onChange(icon.value);
                setOpen(false);
              }}
            >
              <Icon name={icon.value} />
              <span>{icon.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-page-button icon-page-next"
          aria-label="Next icons"
          disabled={page === PAGE_COUNT - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          <Icon name="chevron-forward-outline" />
        </button>
        <div className="icon-page-dots" aria-hidden="true">
          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <span key={i} className={i === page ? 'is-active' : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AddCourseDialog({ open, onClose, dialogRef, ...formProps }: AddCourseDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} id="addCourseModal" dialogRef={dialogRef}>
      {open && <AddCourseForm onClose={onClose} {...formProps} />}
      <div className="tour-modal-mask" aria-hidden="true" />
    </Dialog>
  );
}

/** Mounted fresh each time the dialog opens, so its fields start from `editing`. */
function AddCourseForm({ onClose, editing, onSave, tourField = null, onFieldInput }: Omit<AddCourseDialogProps, 'open' | 'dialogRef'>) {
  const [code, setCode] = useState(editing?.code ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [grade, setGrade] = useState(editing?.grade == null ? '' : String(editing.grade));
  const [icon, setIcon] = useState(editing?.icon ?? 'book-outline');
  const [showError, setShowError] = useState(false);
  const placeholder = useRotating(PLACEHOLDERS, 3200);

  const locked = (field: TourField) => tourField != null && tourField !== field;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setShowError(true);
      return;
    }
    const parsed = grade.trim() === '' ? null : parseFloat(grade);
    onSave({
      code: code.trim(),
      title: title.trim(),
      icon: icon || 'book-outline',
      grade: parsed == null || Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed)),
    });
  }

  const typed = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    onFieldInput?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-head">
        <Icon name="add-circle-outline" /> <span>{editing ? 'Edit Course' : 'Add Course'}</span>
      </div>
      <div className="modal-body">
        <div className="modal-grid">
          <div id="courseCodeField">
            <label htmlFor="codeInput">Course Code</label>
            <input id="codeInput" name="code" placeholder={placeholder.code} value={code} disabled={locked('code')} onChange={typed(setCode)} />
          </div>
          <div id="courseNameField">
            <label htmlFor="titleInput">Course Name</label>
            <input id="titleInput" name="title" placeholder={placeholder.title} value={title} disabled={locked('title')} onChange={typed(setTitle)} />
          </div>
        </div>
        <div className="modal-grid">
          <div id="initialGradeField">
            <label htmlFor="gradeInput">Initial Grade (%) — optional</label>
            <input
              id="gradeInput"
              name="grade"
              type="number"
              step={0.1}
              min={0}
              max={100}
              placeholder="e.g., 85"
              value={grade}
              disabled={locked('grade')}
              onChange={typed(setGrade)}
            />
          </div>
          <div id="iconField">
            <label>Icon</label>
            <IconSelect value={icon} onChange={setIcon} disabled={locked('icon')} />
            <div className="hint">
              Preview: <Icon name={icon} />
            </div>
          </div>
        </div>
        {showError && (
          <div className="error" style={{ display: 'block' }}>
            Please enter at least a course code (e.g., CSC108).
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-plain" id="cancelCourse" disabled={tourField != null} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" id="saveCourse" disabled={locked('save')}>
          Save Course
        </button>
      </div>
    </form>
  );
}
