'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { useClickOutside, useRotating } from '@/lib/hooks';
import { autoIcon, COURSE_ICONS, courseIcon, DEFAULT_COURSE_ICON, iconLabel } from '@/lib/icons';
import type { CourseInput } from '@/lib/semester';

const PLACEHOLDERS = [
  { code: 'MAT101', title: 'Calculus 1' },
  { code: 'PSY100', title: 'Introduction to Psychology' },
  { code: 'ECO101', title: 'Microeconomics' },
  { code: 'PHY101', title: 'Mechanics' },
  { code: 'BIO100', title: 'Introduction to Biology' },
];


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
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([ref], () => setOpen(false), open);

  // Bring the current icon into view when the menu opens.
  useEffect(() => {
    if (!open) return;
    const selected = menuRef.current?.querySelector<HTMLElement>('.is-selected');
    if (selected && menuRef.current) menuRef.current.scrollTop = selected.offsetTop - menuRef.current.clientHeight / 2 + selected.offsetHeight / 2;
  }, [open]);

  return (
    <div className={open ? 'profile-select-wrap icon-select-wrap open' : 'profile-select-wrap icon-select-wrap'} ref={ref}>
      <button
        type="button"
        className="profile-select-button"
        id="iconSelectButton"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {iconLabel(value)}
      </button>
      <input type="hidden" name="icon" id="iconInput" value={value} />
      <div className="profile-select-menu icon-select-menu" role="listbox" aria-label="Course icon" ref={menuRef}>
        <div className="icon-select-grid">
          {COURSE_ICONS.map((icon) => (
            <button
              key={icon.value}
              type="button"
              role="option"
              aria-selected={icon.value === value}
              title={icon.label}
              className={icon.value === value ? 'profile-select-option icon-select-option is-selected' : 'profile-select-option icon-select-option'}
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
  const [icon, setIcon] = useState(editing ? courseIcon(editing) : DEFAULT_COURSE_ICON);
  // The icon follows the course code's subject until the student picks one.
  const [iconPicked, setIconPicked] = useState(!!editing && editing.icon !== DEFAULT_COURSE_ICON);
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
      icon: icon || DEFAULT_COURSE_ICON,
      grade: parsed == null || Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed)),
    });
  }

  const typed = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    onFieldInput?.();
  };

  return (
    <form className="cd" onSubmit={handleSubmit}>
      <div className="cd-head">
        <span className="cd-preview" aria-hidden="true">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="ad-title">{editing ? 'Edit course' : 'Add course'}</h2>
          <p className="ad-message">{editing ? 'Change its code, name, grade or icon.' : 'Weights and grades go on the course page next.'}</p>
        </div>
      </div>
      <div className="cd-body">
        <div className="cd-grid">
          <div id="courseCodeField">
            <label htmlFor="codeInput">Course code</label>
            <input
              id="codeInput"
              name="code"
              placeholder={placeholder.code}
              value={code}
              autoComplete="off"
              aria-invalid={showError && !code.trim()}
              disabled={locked('code')}
              onChange={typed((v) => {
                setCode(v);
                if (!iconPicked) setIcon(autoIcon(v));
              })}
            />
          </div>
          <div id="courseNameField">
            <label htmlFor="titleInput">Course name</label>
            <input id="titleInput" name="title" placeholder={placeholder.title} value={title} autoComplete="off" disabled={locked('title')} onChange={typed(setTitle)} />
          </div>
          <div id="initialGradeField">
            <label htmlFor="gradeInput">
              Starting grade <span className="cd-optional">optional</span>
            </label>
            <input
              id="gradeInput"
              name="grade"
              type="number"
              inputMode="decimal"
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
            <IconSelect
              value={icon}
              onChange={(v) => {
                setIcon(v);
                setIconPicked(true);
              }}
              disabled={locked('icon')}
            />
          </div>
        </div>
        {showError && <p className="ad-error">Enter a course code, like CSC108.</p>}
      </div>
      <div className="ad-actions cd-actions">
        <button type="button" className="btn-plain" id="cancelCourse" disabled={tourField != null} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" id="saveCourse" disabled={locked('save')}>
          {editing ? 'Save changes' : 'Add course'}
        </button>
      </div>
    </form>
  );
}
