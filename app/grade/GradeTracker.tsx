'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, IconButton } from '@/components/Icon';
import { MiniCalc } from '@/components/MiniCalc';
import {
  applyEstimates,
  assessmentAverage,
  getUniversityRules,
  gpaFromPct,
  isLowLetter,
  letterForSchool,
  totalWeight,
} from '@/lib/grading';
import { newId, normalizeCode, readEstimateTarget, readUniversity, setAssessments } from '@/lib/semester';
import { KEYS } from '@/lib/storage';
import { useTheme } from '@/lib/theme';
import type { Assessment } from '@/lib/types';
import { useSemester } from '@/lib/use-semester';
import { AssessmentRow } from './AssessmentRow';

const SAVE_NOTICE_DELAY_MS = 650;
const WEIGHT_NOTICE_MS = 1800;

export function GradeTracker() {
  const params = useSearchParams();
  const { state, update, initialSyncing } = useSemester();
  const { isDark, toggle } = useTheme();
  const [university, setUniversity] = useState(readUniversity);
  const [estimateTarget, setEstimateTarget] = useState(readEstimateTarget);
  const [saveNotice, setSaveNotice] = useState(false);
  const [weightNotice, setWeightNotice] = useState(false);
  const [undo, setUndo] = useState<{ row: Assessment; index: number } | null>(null);
  const noticeTimer = useRef<number | null>(null);

  // Links from the dashboard use ?id=; older bookmarks use ?course=CODE.
  const idParam = params.get('id');
  const codeParam = normalizeCode(params.get('course'));
  const course = useMemo(
    () =>
      state.courses.find((c) => c.id === idParam) ??
      (codeParam ? state.courses.find((c) => c.code === codeParam) : undefined),
    [state.courses, idParam, codeParam],
  );

  useEffect(() => {
    const refresh = () => {
      setUniversity(readUniversity());
      setEstimateTarget(readEstimateTarget());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.settings || e.key === KEYS.estimateTarget || e.key === KEYS.onboarding) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    if (!undo) return;
    const id = window.setTimeout(() => setUndo(null), 4500);
    return () => window.clearTimeout(id);
  }, [undo]);

  useEffect(() => {
    document.title = course ? `${course.code} — Grade Tracker` : 'Grade Tracker';
  }, [course]);

  const assessments = course?.assessments ?? [];
  const rules = getUniversityRules(university);
  const isCredit = !!(rules.creditAllowed && course?.crncr);
  const goal = isCredit ? 50 : estimateTarget;
  const average = assessmentAverage(assessments);
  const letter = average == null ? null : letterForSchool(average, university);
  const used = totalWeight(assessments);

  if (!course && initialSyncing) return null;

  if (!course) {
    return (
      <>
        <header>
          <IconButton name="arrow-back-outline" label="Back to dashboard" onActivate={() => window.location.assign('/main/')} />
          <div style={{ marginLeft: 10 }}>
            <h1 id="courseTitle">
              <span id="courseCodeText">Course not found</span>
            </h1>
            <p>This course isn’t on your dashboard. It may have been removed.</p>
          </div>
        </header>
        <div className="actions">
          <button type="button" className="add" onClick={() => window.location.assign('/main/')}>
            Back to dashboard
          </button>
        </div>
      </>
    );
  }

  const courseId = course.id;

  function save(next: Assessment[], notify: boolean) {
    update((s) => setAssessments(s, courseId, next));
    // Warn once each time the total goes over 100%.
    const nextTotal = totalWeight(next);
    if (nextTotal > 100 && used <= 100) {
      setWeightNotice(true);
      window.setTimeout(() => setWeightNotice(false), WEIGHT_NOTICE_MS);
    } else if (nextTotal <= 100) {
      setWeightNotice(false);
    }
    if (notify) {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => {
        setSaveNotice(true);
        window.setTimeout(() => setSaveNotice(false), 1600);
      }, SAVE_NOTICE_DELAY_MS);
    }
  }

  function addAssessment() {
    const remaining = Math.max(0, 100 - used);
    save(
      [
        ...assessments,
        { id: newId(), name: `Assessment ${assessments.length + 1}`, weight: Math.min(10, Math.round(remaining * 100) / 100), grade: null, estimate: null },
      ],
      false,
    );
  }

  function removeAssessment(index: number) {
    setUndo({ row: assessments[index], index });
    save(assessments.filter((_, i) => i !== index), false);
  }

  function undoRemove() {
    if (!undo) return;
    const at = Math.min(Math.max(undo.index, 0), assessments.length);
    const next = [...assessments];
    next.splice(at, 0, undo.row);
    save(next, false);
    setUndo(null);
  }

  const estimateLabel = isCredit
    ? `Estimate for ${(rules.creditLabel || 'CR/NCR').split('/')[0]} (50%)`
    : `Estimate for ${estimateTarget}`;
  const showGpa = !isCredit && rules.showGpa;

  return (
    <>
      <header>
        <IconButton name="arrow-back-outline" label="Back to dashboard" onActivate={() => window.location.assign('/main/')} />
        <div style={{ marginLeft: 10 }}>
          <h1 id="courseTitle">
            <span id="courseCodeText">{course.code}</span>
            {isCredit && (
              <span className="course-crncr-tag" style={{ display: 'inline-flex' }}>
                {rules.creditLabel || 'CR/NCR'}
              </span>
            )}
          </h1>
          <p>{course.title}</p>
        </div>
        <IconButton
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          label="Toggle theme"
          style={{ marginLeft: 'auto', cursor: 'pointer' }}
          onActivate={toggle}
        />
      </header>

      <div className={saveNotice ? 'notification show' : 'notification'} role="status">
        Grades saved successfully!
      </div>
      <div className={weightNotice ? 'notification error show' : 'notification error'} role="alert">
        Total weight cannot exceed 100%.
      </div>
      <div className={undo ? 'undo-toast show' : 'undo-toast'} role="status" aria-live="polite">
        <span>{undo?.row.name || 'Assessment'} removed.</span>
        <button type="button" onClick={undoRemove}>
          Undo
        </button>
      </div>

      <table className={assessments.length === 0 ? 'empty' : undefined}>
        <thead>
          <tr>
            <th>
              Assessment{' '}
              <span className="help-tip" data-tip="Double-click a cell to edit.">
                <Icon name="help-circle-outline" />
              </span>
            </th>
            <th>
              Weight (%){' '}
              <span className="help-tip" data-tip="Double-click a cell to edit.">
                <Icon name="help-circle-outline" />
              </span>
            </th>
            <th>Your Grade</th>
            <th>
              Estimate <span style={{ color: 'var(--muted)', fontSize: 13 }}>(optional)</span>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {assessments.length === 0 ? (
            <tr>
              <td className="empty-msg" colSpan={5}>
                <div className="empty-state">
                  <Icon name="clipboard-outline" />
                  <strong>No assessments yet</strong>
                  <span>Add your first assessment to start calculating this course.</span>
                  <button type="button" className="empty-cta" onClick={addAssessment}>
                    + Add Assessment
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            assessments.map((a, i) => (
              <AssessmentRow
                key={a.id}
                assessment={a}
                maxWeight={Math.max(0, 100 - (used - a.weight))}
                onChange={(patch, notify) => save(assessments.map((row, j) => (j === i ? { ...row, ...patch } : row)), notify)}
                onRemove={() => removeAssessment(i)}
              />
            ))
          )}
        </tbody>
      </table>

      <div className="actions">
        <button
          type="button"
          className="estimate"
          onClick={() => assessments.length && save(applyEstimates(assessments, goal), false)}
        >
          {estimateLabel}
        </button>
        <button type="button" className="add" onClick={addAssessment}>
          + Add Assessment
        </button>
      </div>

      <div className="summary">
        {showGpa && (
          <span style={{ display: 'inline' }}>
            GPA:{' '}
            <span style={{ color: letter == null ? undefined : isLowLetter(letter) ? '#dc2626' : '#22c55e' }}>
              {average == null ? '—' : gpaFromPct(average, university).toFixed(2)}
            </span>{' '}
            (<span>{letter ?? '—'}</span>) |{' '}
          </span>
        )}
        Average: <span>{average == null ? '—' : `${average.toFixed(1)}%`}</span>
      </div>

      <MiniCalc />
    </>
  );
}
