'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { COURSE_CODE_PATTERN, mockExplain, normalizeCourseCode, type ExplainResult, type SeedCourse } from '@/lib/ai-planner';
import { useClickOutside } from '@/lib/hooks';
import { Badges, Card, CourseBadges, List, LoadingCard, SearchIcon, Suggestions, ValidationCard, courseMatches, postWithFallback } from './ui';

type Result = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'explain'; data: ExplainResult } | null;

export function ExplainerPanel({ active, seed }: { active: boolean; seed: SeedCourse[] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside([pickerRef], () => setShowSuggestions(false), showSuggestions);
  const suggestions = courseMatches(seed, query, selected ? [selected] : []);

  function choose(code: string) {
    const normalized = normalizeCourseCode(code);
    if (!normalized) return;
    setSelected(normalized);
    setQuery(normalized);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let code = selected;
    const pending = normalizeCourseCode(query);
    if (pending && COURSE_CODE_PATTERN.test(pending)) {
      code = pending;
      choose(pending);
    }
    if (!code) {
      setResult({ kind: 'error', message: 'Enter a course code like CSC108.' });
      return;
    }
    const payload = { courseCode: code };
    setResult({ kind: 'loading' });
    const data = await postWithFallback<ExplainResult>('/api/ai-planner/explain/', payload, () => mockExplain(seed, payload));
    setResult({ kind: 'explain', data });
  }

  const course = result?.kind === 'explain' ? result.data.course : null;

  return (
    <section className={active ? 'panel tab-panel active' : 'panel tab-panel'} id="explainerPanel">
      <div className="panel-head">
        <div>
          <h2>Course Explainer</h2>
          <p>Get a plain-English snapshot of common first-year courses.</p>
        </div>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <label>
          Course code
          <div className="course-picker" ref={pickerRef}>
            <div className="course-picker-search explain-course-search">
              <SearchIcon />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                placeholder="Type CSC, MAT, BIO..."
                autoComplete="off"
                aria-controls="explainCourseSuggestions"
                aria-expanded={showSuggestions && suggestions.length > 0}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected('');
                  setShowSuggestions(true);
                }}
                onFocus={() => query && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSuggestions(false);
                  if (e.key !== 'Enter') return;
                  const code = suggestions[0]?.code || query;
                  if (!normalizeCourseCode(code)) return;
                  e.preventDefault();
                  choose(code);
                }}
              />
              <button
                type="button"
                className="course-clear-btn"
                aria-label="Clear selected course"
                hidden={!selected}
                onClick={() => {
                  setSelected('');
                  setQuery('');
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                <Icon name="close-outline" />
              </button>
            </div>
            <Suggestions
              id="explainCourseSuggestions"
              items={suggestions}
              visible={showSuggestions}
              onPick={(code) => {
                choose(code);
                inputRef.current?.focus();
              }}
            />
          </div>
        </label>
        <button className="btn-primary" type="submit">
          <Icon name="search-outline" /> Explain
        </button>
        <div className="explainer-hint" aria-hidden="true">
          <Icon name="book-outline" />
          <span>Shows difficulty, common paths, warnings, and what to verify officially.</span>
        </div>
      </form>
      <div className="result-grid">
        {result?.kind === 'loading' && <LoadingCard message="Explaining the course..." />}
        {result?.kind === 'error' && <ValidationCard message={result.message} />}
        {result?.kind === 'explain' && course && (
          <>
            <Card title={`${course.code}: ${course.title}`}>
              <CourseBadges course={course} />
              <p>{course.notes}</p>
            </Card>
            <Card title="Common misunderstandings">
              <List items={result.data.misunderstandings} />
            </Card>
            <Card title="Relevant paths">
              <Badges items={course.commonPaths?.length ? course.commonPaths : ['Verify officially']} />
            </Card>
            <Card title="Warnings" warning>
              <List items={course.warnings} />
            </Card>
            <Card title="Difficulty note" full warning>
              <p>
                Difficulty estimate: <strong>{course.roughDifficulty}</strong>. Difficulty is subjective and depends on your
                background, instructor, assessments, and other courses.
              </p>
              <p>{result.data.officialNote}</p>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
