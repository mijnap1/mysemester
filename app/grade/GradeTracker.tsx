'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, IconButton } from '@/components/Icon';
import { MiniCalc } from '@/components/MiniCalc';
import { useToast } from '@/components/Toast';
import {
  applyEstimates,
  assessmentAverage,
  getUniversityRules,
  gpaFromPct,
  isLowLetter,
  letterForSchool,
  totalWeight,
} from '@/lib/grading';
import { assessmentFromDeadline, courseDeadlines, inGrades, readQuercusLink, type Deadline } from '@/lib/quercus';
import { newId, normalizeCode, readEstimateTarget, readUniversity, setAssessments, storageUser } from '@/lib/semester';
import { KEYS, readString, removeKey } from '@/lib/storage';
import { useTheme } from '@/lib/theme';
import type { Assessment } from '@/lib/types';
import { useSemester } from '@/lib/use-semester';
import { AssessmentRow } from './AssessmentRow';
import { CourseDeadlines } from './CourseDeadlines';
import { TourFinale } from './TourFinale';

const SAVE_NOTICE_DELAY_MS = 650;
const WEIGHT_NOTICE_MS = 1800;
const UNDO_MS = 4500;

export function GradeTracker() {
  const params = useSearchParams();
  const { auth, state, update, initialSyncing } = useSemester();
  // Quercus deadlines are cached on this device by the dashboard; read-only here.
  const [quercus] = useState(() => readQuercusLink(storageUser(auth)));
  const [openedAt] = useState(() => Date.now());
  const [finale, setFinale] = useState(() => readString(KEYS.tutorialFinale) === '1');
  const { isDark, toggle } = useTheme();
  const [university, setUniversity] = useState(readUniversity);
  const [estimateTarget, setEstimateTarget] = useState(readEstimateTarget);
  const noticeTimer = useRef<number | null>(null);
  const { show: showToast, toast } = useToast();

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
    document.title = course ? `${course.code} — Grade Tracker` : 'Grade Tracker';
  }, [course]);

  const assessments = course?.assessments ?? [];
  const rules = getUniversityRules(university);
  const deadlineList = useMemo(() => {
    const items = course && university === 'University of Toronto' ? courseDeadlines(course, quercus, state.courses, openedAt) : [];
    return { items, now: openedAt };
  }, [course, quercus, state.courses, university, openedAt]);
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
      showToast('Total weight cannot exceed 100%.', 'error', WEIGHT_NOTICE_MS);
    }
    if (notify) {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => showToast('Grades saved successfully!', 'success', 1600), SAVE_NOTICE_DELAY_MS);
    }
  }

  function addFromDeadline(deadline: Deadline) {
    if (!course || inGrades(deadline, course)) return;
    save([...assessments, assessmentFromDeadline(deadline, newId())], false);
    showToast(`Added “${deadline.title}”. Set its weight in the table.`, 'success', 3200);
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
    const row = assessments[index];
    save(assessments.filter((_, i) => i !== index), false);
    showToast(`${row.name || 'Assessment'} removed.`, 'info', UNDO_MS, {
      label: 'Undo',
      // Put the row back into whatever the list is by then, at its old position.
      onClick: () =>
        update((s) => {
          const current = s.courses.find((c) => c.id === courseId)?.assessments ?? [];
          if (current.some((a) => a.id === row.id)) return s;
          const next = [...current];
          next.splice(Math.min(Math.max(index, 0), next.length), 0, row);
          return setAssessments(s, courseId, next);
        }),
    });
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

      {toast}
      <TourFinale
        open={finale}
        onDone={() => {
          removeKey(KEYS.tutorialFinale);
          setFinale(false);
        }}
      />

      <CourseDeadlines course={course} items={deadlineList.items} now={deadlineList.now} onAdd={addFromDeadline} />

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
