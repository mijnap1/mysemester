'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { UNIVERSITIES } from '@/lib/grading';
import { useClickOutside } from '@/lib/hooks';
import { PROGRAMS, YEARS } from '@/lib/options';
import { avatarFallback, safePictureUrl } from '@/lib/profile';
import type { Onboarding, Profile } from '@/lib/types';

const LABEL_STYLE = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' } as const;
const MAX_PICTURE_BYTES = 3 * 1024 * 1024;

function ProfileSelect({
  value,
  placeholder,
  options,
  open,
  onOpenChange,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside([ref], () => onOpenChange(false), open);
  return (
    <div className={open ? 'profile-select-wrap open' : 'profile-select-wrap'} ref={ref}>
      <button type="button" className="profile-select-button" aria-haspopup="listbox" aria-expanded={open} onClick={() => onOpenChange(!open)}>
        {value || placeholder}
      </button>
      <div className="profile-select-menu" role="listbox">
        {options.map((option) => (
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
      </div>
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

  function validate(): boolean {
    const next: typeof errors = {};
    if (name.trim() && name.trim().length < 2) next.name = 'Name should be at least 2 characters.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
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
      picture: picture || profile.picture,
      name: name.trim() || profile.name,
      nickname: nickname.trim() || profile.nickname,
      email: email.trim() || profile.email,
      updatedAt: stamp,
    };
    const reload = onSave(next, {
      ...onboarding,
      university: academic.university || onboarding.university || '',
      year: academic.year || onboarding.year || '',
      program: academic.program || onboarding.program || '',
    });
    setUpdatedAt(stamp);
    setStatus({ text: 'Saved', tone: 'success' });
    window.setTimeout(() => (reload ? window.location.reload() : onClose()), 550);
  }

  return (
    <form onSubmit={handleSubmit} style={{ margin: 0, maxWidth: 860 }} noValidate>
        <div className="modal-head">
          <Icon name="person-outline" />
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>Profile</span>
        </div>

        <div className="modal-body" style={{ background: 'var(--bg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL */}
              <img
                src={picture || avatarFallback(name || nickname)}
                alt="Profile Picture"
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--line)', background: '#f3f4f6' }}
              />
              <label
                htmlFor="profilePicInput"
                style={{ position: 'absolute', bottom: -8, right: -8, background: 'var(--blue)', color: 'white', padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              >
                Change
              </label>
              <input
                type="file"
                id="profilePicInput"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  handlePicture(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 13, color: errors.picture ? 'var(--red, #dc2626)' : 'var(--muted)', margin: '4px 0 0' }}>
                {errors.picture ?? 'PNG or JPG, up to ~3MB'}
              </p>
            </div>
          </div>

          <div className="profile-academic">
            <div className="profile-academic-title">Academic Profile</div>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label style={LABEL_STYLE}>University</label>
                <ProfileSelect
                  value={academic.university ?? ''}
                  placeholder="Select university"
                  options={UNIVERSITIES}
                  open={openMenu === 'university'}
                  onOpenChange={(o) => setOpenMenu(o ? 'university' : null)}
                  onChange={(university) => setAcademic((a) => ({ ...a, university }))}
                />
              </div>
              <div className="profile-field">
                <label style={LABEL_STYLE}>Year</label>
                <ProfileSelect
                  value={academic.year ?? ''}
                  placeholder="Select year"
                  options={YEARS}
                  open={openMenu === 'year'}
                  onOpenChange={(o) => setOpenMenu(o ? 'year' : null)}
                  onChange={(year) => setAcademic((a) => ({ ...a, year }))}
                />
              </div>
              <div className="profile-field profile-field-full">
                <label style={LABEL_STYLE}>Program</label>
                <ProfileSelect
                  value={academic.program ?? ''}
                  placeholder="Select program"
                  options={PROGRAMS}
                  open={openMenu === 'program'}
                  onOpenChange={(o) => setOpenMenu(o ? 'program' : null)}
                  onChange={(program) => setAcademic((a) => ({ ...a, program }))}
                />
              </div>
            </div>
          </div>

          <div className="profile-form-grid">
            <div className="profile-field">
              <label style={LABEL_STYLE} htmlFor="profileNameInput">
                Full Name
              </label>
              <input
                id="profileNameInput"
                type="text"
                placeholder="Full Name"
                className={errors.name ? 'input-error' : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={validate}
              />
              <div className="profile-inline">{errors.name}</div>
            </div>
            <div className="profile-field">
              <label style={LABEL_STYLE} htmlFor="profileNickInput">
                Nickname
              </label>
              <input id="profileNickInput" type="text" placeholder="Preferred Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
          </div>

          <div className="profile-form-grid profile-form-grid-tight">
            <div className="profile-field profile-field-full">
              <label style={LABEL_STYLE} htmlFor="profileEmailInput">
                Email
              </label>
              <input
                id="profileEmailInput"
                type="email"
                placeholder="you@example.com"
                className={errors.email ? 'input-error' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validate}
              />
              <div className="profile-inline">{errors.email}</div>
            </div>
          </div>
        </div>

        <div className="modal-actions profile-modal-actions">
          <div className="profile-status-wrap">
            <div className={status ? `profile-status is-${status.tone}` : 'profile-status'} aria-live="polite">
              {status?.text}
            </div>
            <div className="profile-updated">
              {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : 'Not updated yet'}
            </div>
          </div>
          <div className="profile-action-buttons">
            <button type="button" className="btn-plain" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary profile-save-btn">
              Save Changes
            </button>
          </div>
        </div>
    </form>
  );
}
