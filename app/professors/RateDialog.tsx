'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { deleteRating, MAX_TAGS, RATING_TAGS, saveRating, type MyRating } from '@/lib/professor-ratings';
import type { CourseTimetable } from '@/lib/timetable';
import './rate-dialog.css';

export interface RateTarget {
  courseCode: string;
  /** Empty when opened from a course card: the dialog then asks who taught it. */
  instructorName: string;
  term: string;
  existing: MyRating | undefined;
}

const DIFFICULTY = ['Very easy', 'Easy', 'Average', 'Hard', 'Very hard'];
const SOMEONE_ELSE = '__other__';

/** This year's instructors for a course, from Timetable Builder. Empty if it isn't listed. */
async function fetchInstructors(code: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/timetable/${encodeURIComponent(code)}/`);
    if (!res.ok) return [];
    const data = (await res.json()) as CourseTimetable;
    const names = data.offerings.flatMap((o) => o.lectures.flatMap((l) => l.instructors));
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Rendered with a fresh `key` per target, so the form starts from that instructor's saved rating. */
export function RateDialog({
  target,
  onClose,
  onSaved,
  onDismiss,
}: {
  target: RateTarget | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  /** Shown as "Don't ask for this course" when opened from a course card. */
  onDismiss?: () => void;
}) {
  const existing = target?.existing;
  const asksWho = !!target && !target.instructorName;
  const [choices, setChoices] = useState<string[] | null>(null);
  const [picked, setPicked] = useState('');
  const [otherName, setOtherName] = useState('');
  const [quality, setQuality] = useState(existing?.quality ?? 0);
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 0);
  const [again, setAgain] = useState<boolean | null>(existing ? existing.wouldTakeAgain : null);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!asksWho || !target) return;
    let live = true;
    void fetchInstructors(target.courseCode).then((names) => live && setChoices(names));
    return () => {
      live = false;
    };
  }, [asksWho, target]);

  const otherChosen = picked === SOMEONE_ELSE || (choices !== null && choices.length === 0);
  const name = (asksWho ? (otherChosen ? otherName : picked) : (target?.instructorName ?? '')).replace(/\s+/g, ' ').trim();
  const ready = quality > 0 && difficulty > 0 && again !== null && name.length >= 2 && name.length <= 80;

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : t.length < MAX_TAGS ? [...t, tag] : t));
  }

  async function submit() {
    if (!target || !ready || busy) return;
    setBusy(true);
    setError('');
    const res = await saveRating(target.courseCode, name, target.term, { quality, difficulty, wouldTakeAgain: again, tags });
    setBusy(false);
    if (res.ok) onSaved(existing ? 'Rating updated' : `Thanks, your rating for ${name} is in`);
    else setError(res.error);
  }

  async function remove() {
    if (!target || busy) return;
    setBusy(true);
    const res = await deleteRating(target.courseCode, target.instructorName);
    setBusy(false);
    if (res.ok) onSaved('Rating removed');
    else setError(res.error);
  }

  return (
    <Dialog open={!!target} onClose={onClose} className="rate-dialog">
      {target && (
        <form
          className="rate-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <button type="button" className="rate-close" aria-label="Close" onClick={onClose}>
            <Icon name="close-outline" />
          </button>
          <div className="rate-head">
            <h2>{asksWho ? `Rate your ${target.courseCode.slice(0, 6)} professor` : `Rate ${target.instructorName}`}</h2>
            <p>
              {target.courseCode.slice(0, 6)} · Only the averages are shown. No one sees who rated what.
            </p>
          </div>

          {asksWho && (
            <fieldset className="rate-field">
              <legend>Who taught it?</legend>
              {choices === null ? (
                <p className="rate-loading">Loading this year’s instructors…</p>
              ) : (
                <div className="rate-tags" role="radiogroup" aria-label="Instructor">
                  {[...choices, ...(choices.length ? [SOMEONE_ELSE] : [])].map((choice) => (
                    <button type="button" key={choice} role="radio" aria-checked={picked === choice} className={picked === choice ? 'on' : ''} onClick={() => setPicked(choice)}>
                      {choice === SOMEONE_ELSE ? 'Someone else' : choice}
                    </button>
                  ))}
                </div>
              )}
              {otherChosen && (
                <input
                  className="rate-input"
                  type="text"
                  maxLength={80}
                  placeholder="Instructor’s full name"
                  aria-label="Instructor’s full name"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  autoFocus={picked === SOMEONE_ELSE}
                />
              )}
            </fieldset>
          )}

          <fieldset className="rate-field">
            <legend>Overall</legend>
            <div className="rate-stars" role="radiogroup" aria-label="Overall rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={quality === n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  className={n <= quality ? 'on' : ''}
                  onClick={() => setQuality(n)}
                >
                  <Icon name="star" />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="rate-field">
            <legend>Difficulty</legend>
            <div className="rate-segments" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY.map((label, i) => (
                <button type="button" key={label} role="radio" aria-checked={difficulty === i + 1} className={difficulty === i + 1 ? 'on' : ''} onClick={() => setDifficulty(i + 1)}>
                  <strong>{i + 1}</strong>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="rate-field">
            <legend>Would you take them again?</legend>
            <div className="rate-segments two" role="radiogroup" aria-label="Would take again">
              {[true, false].map((v) => (
                <button type="button" key={String(v)} role="radio" aria-checked={again === v} className={again === v ? 'on' : ''} onClick={() => setAgain(v)}>
                  <strong>{v ? 'Yes' : 'No'}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="rate-field">
            <legend>
              Tags <span>Up to {MAX_TAGS}</span>
            </legend>
            <div className="rate-tags">
              {RATING_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button type="button" key={tag} aria-pressed={on} className={on ? 'on' : ''} disabled={!on && tags.length >= MAX_TAGS} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="rate-error">{error}</p>}

          <div className="rate-actions">
            {existing && (
              <button type="button" className="rate-btn rate-btn-quiet" disabled={busy} onClick={() => void remove()}>
                Remove my rating
              </button>
            )}
            {!existing && onDismiss && (
              <button type="button" className="rate-btn rate-btn-quiet" disabled={busy} onClick={onDismiss}>
                Don’t ask for this course
              </button>
            )}
            <button type="submit" className="rate-btn rate-btn-primary" disabled={!ready || busy}>
              {busy ? 'Saving…' : existing ? 'Update rating' : 'Submit rating'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
