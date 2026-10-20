'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { COURSE_CODE_PATTERN, mockPlan, normalizeCourseCode, type PlanResult, type SeedCourse } from '@/lib/ai-planner';
import { useClickOutside } from '@/lib/hooks';
import {
  Card,
  CourseBadges,
  List,
  LoadingCard,
  OfficialCard,
  PLACEHOLDER_CODES,
  PlannerSelect,
  SearchIcon,
  Suggestions,
  ValidationCard,
  courseMatches,
  postWithFallback,
} from './ui';

const PATHS = [
  'CS', 'Data Science', 'Stats', 'Math', 'Actuarial Science', 'Econ', 'Commerce / Management', 'Life Sci', 'Psychology',
  'Neuroscience', 'Cognitive Science', 'Health Studies', 'Physics', 'Chemistry', 'Astronomy', 'Earth Sciences',
  'Environmental Studies', 'Geography', 'Urban Studies', 'Political Science', 'International Relations', 'Public Policy',
  'Sociology', 'Criminology', 'Anthropology', 'Linguistics', 'Philosophy', 'History', 'English', 'Classics', 'Art History',
  'Cinema Studies', 'Music', 'Architecture', 'Education', 'Law', 'Medicine', 'Unsure', 'Other',
].map((value) => ({ value }));

const WORKLOADS = ['Light', 'Balanced', 'Ambitious'].map((value) => ({ value }));
const CONCERNS = ['difficulty', 'timetable', 'POSt', 'breadth', 'CR/NCR', 'tutorials', 'enrolment'];

/** A random 1–3 course example that changes every few seconds while the field is idle. */
function useRotatingPlaceholder(paused: boolean) {
  const [placeholder, setPlaceholder] = useState('CSC108');
  const [swapping, setSwapping] = useState(false);
  useEffect(() => {
    if (paused) return;
    let last = '';
    let swapTimer = 0;
    const id = window.setInterval(() => {
      const size = [1, 1, 2, 2, 3][Math.floor(Math.random() * 5)];
      const shuffled = [...PLACEHOLDER_CODES].sort(() => Math.random() - 0.5);
      let next = shuffled.slice(0, size).join(', ');
      if (next === last) next = shuffled.slice(size, size * 2).join(', ');
      last = next;
      setSwapping(true);
      swapTimer = window.setTimeout(() => {
        setPlaceholder(next);
        setSwapping(false);
      }, 160);
    }, 2300);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, [paused]);
  return { placeholder, swapping };
}

type Result = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'plan'; data: PlanResult } | null;

export function PlannerPanel({ active, seed }: { active: boolean; seed: SeedCourse[] }) {
  const [path, setPath] = useState('Unsure');
  const [workload, setWorkload] = useState('Balanced');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { placeholder, swapping } = useRotatingPlaceholder(focused || !!query.trim());

  useClickOutside([pickerRef], () => setShowSuggestions(false), showSuggestions);

  const suggestions = courseMatches(seed, query, selected);

  function add(code: string): boolean {
    const normalized = normalizeCourseCode(code);
    if (!normalized || selected.includes(normalized)) return false;
    setSelected((s) => [...s, normalized]);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let courses = selected;
    const pending = normalizeCourseCode(query);
    if (pending && COURSE_CODE_PATTERN.test(pending) && !courses.includes(pending)) {
      courses = [...courses, pending];
      setSelected(courses);
      setQuery('');
      setShowSuggestions(false);
    }
    if (!courses.length) {
      setResult({ kind: 'error', message: 'Enter at least one course code.' });
      return;
    }
    const payload = { path, courses, workload, concerns };
    setResult({ kind: 'loading' });
    const data = await postWithFallback<PlanResult>('/api/ai-planner/plan/', payload, () => mockPlan(seed, payload));
    setResult({ kind: 'plan', data });
  }

  return (
    <section className={active ? 'panel tab-panel active' : 'panel tab-panel'} id="plannerPanel">
      <div className="panel-head">
        <div>
          <h2>Course Planner</h2>
          <p>Compare a possible first-year schedule against your path, workload, and concerns.</p>
        </div>
      </div>
      <form className="planner-form" onSubmit={handleSubmit}>
        <div className="field-label">
          Intended path
          <PlannerSelect value={path} options={PATHS} onChange={setPath} label="Intended path" />
        </div>
        <div className="field-label">
          Courses being considered
          <div className="course-picker" ref={pickerRef}>
            <div className="course-chip-row" aria-label="Selected courses">
              {selected.map((code) => (
                <span className="course-chip" key={code}>
                  {code}
                  <button type="button" aria-label={`Remove ${code}`} onClick={() => setSelected((s) => s.filter((c) => c !== code))}>
                    <Icon name="close-outline" />
                  </button>
                </span>
              ))}
            </div>
            <div className="course-picker-search">
              <SearchIcon />
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                className={swapping ? 'placeholder-swapping' : undefined}
                placeholder={placeholder}
                autoComplete="off"
                aria-label="Search courses"
                aria-controls="plannerCourseSuggestions"
                aria-expanded={showSuggestions && suggestions.length > 0}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setFocused(true);
                  if (query) setShowSuggestions(true);
                }}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                  if (e.key !== 'Enter') return;
                  const code = suggestions[0]?.code || query;
                  if (!normalizeCourseCode(code)) return;
                  e.preventDefault();
                  if (add(code)) {
                    setQuery('');
                    setShowSuggestions(false);
                  }
                }}
              />
            </div>
            <Suggestions
              id="plannerCourseSuggestions"
              items={suggestions}
              visible={showSuggestions}
              onPick={(code) => {
                if (add(code)) {
                  setQuery('');
                  setShowSuggestions(false);
                  searchRef.current?.focus();
                }
              }}
            />
          </div>
        </div>
        <div className="field-label">
          Preferred workload
          <PlannerSelect value={workload} options={WORKLOADS} onChange={setWorkload} label="Preferred workload" />
        </div>
        <fieldset>
          <legend>Concerns</legend>
          <div className="check-grid">
            {CONCERNS.map((concern) => (
              <label key={concern}>
                <input
                  type="checkbox"
                  name="concerns"
                  value={concern}
                  checked={concerns.includes(concern)}
                  onChange={(e) => setConcerns((c) => (e.target.checked ? [...c, concern] : c.filter((x) => x !== concern)))}
                />{' '}
                {concern}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary" type="submit">
          <Icon name="sparkles-outline" /> Build plan
        </button>
      </form>
      <div className="result-grid">
        {result?.kind === 'loading' && <LoadingCard message="Building a first-pass plan..." />}
        {result?.kind === 'error' && <ValidationCard message={result.message} />}
        {result?.kind === 'plan' && (
          <>
            <Card title="Risk warnings" warning>
              <List items={result.data.riskWarnings} />
            </Card>
            <Card title="Suggested checklist">
              <List items={result.data.checklist} />
            </Card>
            <Card title="Questions to verify" full>
              <List items={result.data.verifyQuestions} />
            </Card>
            {result.data.courses.map((course) => (
              <Card key={course.code} title={`${course.code}: ${course.title}`}>
                <CourseBadges course={course} />
                <p>{course.notes}</p>
                <List items={course.warnings} />
              </Card>
            ))}
            <OfficialCard note={result.data.officialNote} />
          </>
        )}
      </div>
    </section>
  );
}
