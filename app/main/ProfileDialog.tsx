'use client';

import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { UNIVERSITIES } from '@/lib/grading';
import { useClickOutside } from '@/lib/hooks';
import { filterProgramGroups, programGroupsFor, YEARS, type ProgramGroup } from '@/lib/options';
import { initials, safePictureUrl } from '@/lib/profile';
import type { Onboarding, Profile } from '@/lib/types';

const MAX_PICTURE_BYTES = 3 * 1024 * 1024;

const SHORT_UNIVERSITY: Record<string, string> = {
  'University of Toronto': 'UofT',
  'University of British Columbia': 'UBC',
  'McGill University': 'McGill',
  'University of Waterloo': 'Waterloo',
  'University of Alberta': 'UAlberta',
  'McMaster University': 'McMaster',
  'University of Ottawa': 'uOttawa',
  'York University': 'York',
};

function ProfileSelect({
  value,
  placeholder,
  options,
  groups,
  searchPlaceholder,
  open,
  dropUp,
  onOpenChange,
  onChange,
}: {
  value: string;
  placeholder: string;
  options?: readonly string[];
  /** Grouped options with headings; takes precedence over `options`. */
  groups?: ProgramGroup[];
  /** Show a filter box at the top of the menu. */
  searchPlaceholder?: string;
  open: boolean;
  dropUp?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  useClickOutside([ref], () => onOpenChange(false), open);

  const allGroups = groups ?? [{ label: '', programs: [...(options ?? [])] }];
  const shown = searchPlaceholder ? filterProgramGroups(allGroups, query) : allGroups;

  function toggle() {
    if (!open) setQuery('');
    onOpenChange(!open);
  }

  return (
    <div className={['profile-select-wrap', open && 'open', dropUp && 'pf-drop-up'].filter(Boolean).join(' ')} ref={ref}>
      <button
        type="button"
        className={value ? 'profile-select-button' : 'profile-select-button is-empty'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        {value || placeholder}
      </button>
      <div className="profile-select-menu" role="listbox">
        {searchPlaceholder && open && (
          <input
            className="pf-menu-search"
            type="search"
            autoFocus
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                onOpenChange(false);
              }
            }}
          />
        )}
        {shown.map((group) => (
          <Fragment key={group.label || 'all'}>
            {group.label && <div className="pf-menu-group">{group.label}</div>}
            {group.programs.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={option === value ? 'profile-select-option is-selected' : 'profile-select-option'}
                onClick={() => {
                  onChange(option);
                  onOpenChange(false);
                }}
              >
                {option}
              </button>
            ))}
          </Fragment>
        ))}
        {!shown.length && <div className="pf-menu-empty">No matches. Try another word, or pick Other.</div>}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, error, wide, children }: { label: string; htmlFor?: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'pf-field pf-wide' : 'pf-field'}>
      <label className="pf-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && <div className="pf-error">{error}</div>}
    </div>
  );
}

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onboarding: Onboarding;
  /** Persist; returns true if the page should reload (university changed). */
  onSave: (profile: Profile, onboarding: Onboarding) => boolean;
}

export function ProfileDialog({ open, onClose, ...props }: ProfileDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} id="profileModal">
      {open && <ProfileForm onClose={onClose} {...props} />}
    </Dialog>
  );
}

function ProfileForm({ onClose, profile, onboarding, onSave }: Omit<ProfileDialogProps, 'open'>) {
  const [picture, setPicture] = useState(() => safePictureUrl(profile.picture));
  const [name, setName] = useState(profile.name || '');
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [email, setEmail] = useState(profile.email || '');
  const [academic, setAcademic] = useState<Onboarding>(() => ({ ...onboarding }));
  const [openMenu, setOpenMenu] = useState<'university' | 'year' | 'program' | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; picture?: string }>({});
  const [status, setStatus] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [updatedAt, setUpdatedAt] = useState(profile.updatedAt);

  useEffect(() => {
    document.body.classList.add('profile-modal-open');
    return () => document.body.classList.remove('profile-modal-open');
  }, []);

  const displayName = nickname.trim() || name.trim() || 'Your name';

  function validate(): boolean {
    const next: typeof errors = {};
    if (name.trim() && name.trim().length < 2) next.name = 'Name should be at least 2 characters.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    setErrors((e) => ({ picture: e.picture, ...next }));
    return !next.name && !next.email;
  }

  function handlePicture(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_PICTURE_BYTES) {
      setErrors((e) => ({ ...e, picture: 'Choose a PNG or JPG under 3MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = safePictureUrl(String(reader.result));
      if (url) setPicture(url);
      setErrors((e) => ({ ...e, picture: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setStatus({ text: 'Fix the highlighted fields to save.', tone: 'error' });
      return;
    }
    const stamp = new Date().toISOString();
    const next: Profile = {
      picture,
      name: name.trim() || profile.name,
      nickname: nickname.trim(),
      email: email.trim() || profile.email,
      updatedAt: stamp,
    };
    const reload = onSave(next, {
      ...onboarding,
      university: academic.university ?? '',
      year: academic.year ?? '',
      program: academic.program ?? '',
    });
    setUpdatedAt(stamp);
    setStatus({ text: 'Saved', tone: 'success' });
    window.setTimeout(() => (reload ? window.location.reload() : onClose()), 550);
  }

  const chips = [
    academic.university && { icon: 'school-outline', text: SHORT_UNIVERSITY[academic.university] ?? academic.university },
    academic.year && { icon: 'calendar-clear-outline', text: academic.year },
    academic.program && { icon: 'book-outline', text: academic.program },
  ].filter(Boolean) as { icon: string; text: string }[];

  return (
    <form className="pf" onSubmit={handleSubmit} noValidate aria-label="Edit profile">
      <button type="button" className="pf-close" aria-label="Close profile" onClick={onClose}>
        <Icon name="close-outline" />
      </button>

      {/* Header and form scroll together; only the footer stays put. */}
      <div className="pf-scroll">
        {/* Live preview: updates as the name, nickname, email and school change. */}
        <div className="pf-identity">
          <div className="pf-avatar-wrap">
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
              <img className="pf-avatar" src={picture} alt="Profile picture" />
            ) : (
              <div className="pf-avatar pf-avatar-initials" aria-hidden="true">
                {initials(nickname || name)}
              </div>
            )}
            <label htmlFor="profilePicInput" className="pf-avatar-edit" title="Change photo">
              <Icon name="camera-outline" aria-label="Change photo" />
            </label>
            <input
              type="file"
              id="profilePicInput"
              accept="image/png,image/jpeg,image/gif,image/webp"
              hidden
              onChange={(e) => {
                handlePicture(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="pf-identity-text">
            <div className="pf-display-name">{displayName}</div>
            <div className="pf-display-email">{email.trim() || 'No email added'}</div>
          </div>

          {chips.length > 0 && (
            <div className="pf-chips">
              {chips.map((chip) => (
                <span className="pf-chip" key={chip.icon}>
                  <Icon name={chip.icon} />
                  {chip.text}
                </span>
              ))}
            </div>
          )}

          <p className={errors.picture ? 'pf-photo-hint is-error' : 'pf-photo-hint'}>
            {errors.picture ?? 'PNG or JPG, up to 3MB'}
            {picture && !errors.picture && (
              <>
                {' · '}
                <button type="button" className="pf-text-btn" onClick={() => setPicture('')}>
                  Remove photo
                </button>
              </>
            )}
          </p>
        </div>

        <div className="pf-body">
          <section className="pf-section">
            <h3 className="pf-section-title">Personal</h3>
            <div className="pf-grid">
              <Field label="Full name" htmlFor="profileNameInput" error={errors.name}>
                <input
                  id="profileNameInput"
                  className={errors.name ? 'pf-input has-error' : 'pf-input'}
                  type="text"
                  placeholder="Full name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={validate}
                />
              </Field>
              <Field label="Nickname" htmlFor="profileNickInput">
                <input
                  id="profileNickInput"
                  className="pf-input"
                  type="text"
                  placeholder="What should we call you?"
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="profileEmailInput" error={errors.email} wide>
                <input
                  id="profileEmailInput"
                  className={errors.email ? 'pf-input has-error' : 'pf-input'}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validate}
                />
              </Field>
            </div>
          </section>

          <section className="pf-section">
            <h3 className="pf-section-title">Academic</h3>
            <div className="pf-grid">
              <Field label="University" wide>
                <ProfileSelect
                  value={academic.university ?? ''}
                  placeholder="Select university"
                  options={UNIVERSITIES}
                  open={openMenu === 'university'}
                  onOpenChange={(o) => setOpenMenu(o ? 'university' : null)}
                  onChange={(university) =>
                    setAcademic((a) => {
                      // A different university has a different program list.
                      const programs = programGroupsFor(university).flatMap((g) => g.programs);
                      return { ...a, university, program: a.program && programs.includes(a.program) ? a.program : '' };
                    })
                  }
                />
              </Field>
              <Field label="Year">
                <ProfileSelect
                  value={academic.year ?? ''}
                  placeholder="Select year"
                  options={YEARS}
                  open={openMenu === 'year'}
                  dropUp
                  onOpenChange={(o) => setOpenMenu(o ? 'year' : null)}
                  onChange={(year) => setAcademic((a) => ({ ...a, year }))}
                />
              </Field>
              <Field label="Program">
                <ProfileSelect
                  value={academic.program ?? ''}
                  placeholder="Select program"
                  groups={programGroupsFor(academic.university)}
                  searchPlaceholder={academic.university === 'University of Toronto' ? 'Search, e.g. Rotman, CS, UTSC' : 'Search programs'}
                  open={openMenu === 'program'}
                  dropUp
                  onOpenChange={(o) => setOpenMenu(o ? 'program' : null)}
                  onChange={(program) => setAcademic((a) => ({ ...a, program }))}
                />
              </Field>
            </div>
          </section>
        </div>
      </div>

      <div className="pf-foot">
        <span className={status ? `pf-status is-${status.tone}` : 'pf-status'} aria-live="polite">
          {status?.tone === 'success' && <Icon name="checkmark-circle" />}
          {status?.text ??
            (updatedAt ? `Updated ${new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : '')}
        </span>
        <div className="pf-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
