'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { SeedCourse } from '@/lib/ai-planner';
import { PlannerSelect, useSeedCourses } from '../ui';

const PAGE_SIZE = 120;
const DIFFICULTIES = [{ value: '', label: 'All difficulties' }, { value: 'Low' }, { value: 'Medium' }, { value: 'High' }];

const department = (c: SeedCourse) => String(c.code || '').slice(0, 3);

function matches(c: SeedCourse, query: string, dept: string, difficulty: string): boolean {
  if (dept && department(c) !== dept) return false;
  if (difficulty && c.roughDifficulty !== difficulty) return false;
  if (!query) return true;
  return [c.code, c.title, c.roughDifficulty, c.confidenceLevel, ...(c.commonPaths || [])].join(' ').toLowerCase().includes(query);
}

export function Catalog() {
  const { courses: raw, loaded } = useSeedCourses();
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const courses = useMemo(
    () => [...raw].sort((a, b) => a.code.localeCompare(b.code) || a.title.localeCompare(b.title)),
    [raw],
  );
  const departments = useMemo(
    () => [{ value: '', label: 'All departments' }, ...[...new Set(courses.map(department))].filter(Boolean).sort().map((value) => ({ value }))],
    [courses],
  );

  const q = query.trim().toLowerCase();
  const filtered = courses.filter((c) => matches(c, q, dept, difficulty));
  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - visible.length;

  const resetPaging = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setLimit(PAGE_SIZE);
  };

  return (
    <>
      <section className="planner-hero catalog-hero">
        <div>
          <p className="eyebrow">Course Planner Dataset</p>
          <h1>Course Catalog</h1>
          <p>Browse the 800 UofT Arts &amp; Science course records currently used by Course Planner.</p>
        </div>
        <div className="catalog-side">
          <div className="catalog-stats" aria-live="polite">
            <div>
              <span className="catalog-stat-value">{loaded ? courses.length : 800}</span>
              <span className="catalog-stat-label">courses loaded</span>
            </div>
            <div>
              <span className="catalog-stat-value">{visible.length}</span>
              <span className="catalog-stat-label">showing</span>
            </div>
          </div>
          <a className="professor-picks-card" href="/professors/">
            <span className="professor-picks-icon">
              <Icon name="star-outline" />
            </span>
            <span>
              <strong>Professor Picks</strong>
              <small>Test UofT professor rating cards by course</small>
            </span>
            <Icon name="arrow-forward-outline" />
          </a>
        </div>
      </section>

      <section className="panel catalog-panel">
        <div className="panel-head catalog-panel-head">
          <div>
            <h2>Added Courses</h2>
            <p>Search by course code, title, path, or difficulty. This is a planning dataset, not official advising.</p>
          </div>
        </div>

        <div className="catalog-toolbar">
          <label className="field-label catalog-search">
            Search
            <input
              type="search"
              placeholder="Try CSC108, psychology, Life Sci, high"
              value={query}
              onChange={(e) => resetPaging(setQuery)(e.target.value)}
            />
          </label>
          <div className="field-label">
            Department
            <PlannerSelect value={dept} options={departments} onChange={resetPaging(setDept)} label="Department" />
          </div>
          <div className="field-label">
            Difficulty
            <PlannerSelect value={difficulty} options={DIFFICULTIES} onChange={resetPaging(setDifficulty)} label="Difficulty" />
          </div>
        </div>

        <div className="catalog-summary">
          {!loaded
            ? 'Loading courses...'
            : remaining > 0
              ? `Showing ${visible.length} of ${filtered.length} matching courses. Load more or narrow your search to see fewer.`
              : `Showing ${filtered.length} matching course${filtered.length === 1 ? '' : 's'}.`}
        </div>
        <div className="course-catalog-grid">
          {loaded && !filtered.length && <div className="loading-card">No courses match those filters.</div>}
          {visible.map((c) => (
            <article className="catalog-course-card" key={c.code}>
              <div className="catalog-course-top">
                <span className="catalog-code">{c.code}</span>
                <span className={`badge ${String(c.roughDifficulty || '').toLowerCase()}`}>{c.roughDifficulty}</span>
              </div>
              <h3>{c.title}</h3>
              <div className="badge-row">
                {(c.commonPaths || []).slice(0, 4).map((p) => (
                  <span className="badge" key={p}>
                    {p}
                  </span>
                ))}
              </div>
              <p>{c.notes}</p>
            </article>
          ))}
        </div>
        <div className="catalog-actions">
          <button className="btn-primary catalog-load-more" type="button" hidden={remaining <= 0} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            <Icon name="add-circle-outline" /> Load more courses ({Math.min(PAGE_SIZE, Math.max(0, remaining))} more)
          </button>
        </div>
      </section>
    </>
  );
}
