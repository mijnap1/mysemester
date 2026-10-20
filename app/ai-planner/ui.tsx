'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { normalizeCourseCode, OFFICIAL_NOTE, type SeedCourse } from '@/lib/ai-planner';
import { useClickOutside, useEscape } from '@/lib/hooks';

// ---- Seed course data (loaded once, lazily, as its own chunk) -------------

let seedPromise: Promise<SeedCourse[]> | null = null;

export function loadSeedCourses(): Promise<SeedCourse[]> {
  seedPromise ??= import('@/data/ai-planner-courses.json')
    .then((m) => (Array.isArray(m.default) ? (m.default as SeedCourse[]) : []))
    .catch(() => []);
  return seedPromise;
}

export function useSeedCourses(): { courses: SeedCourse[]; loaded: boolean } {
  const [state, setState] = useState<{ courses: SeedCourse[]; loaded: boolean }>({ courses: [], loaded: false });
  useEffect(() => {
    let alive = true;
    void loadSeedCourses().then((courses) => alive && setState({ courses, loaded: true }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** POST to the planner API; on any failure use the local rule-based answer instead. */
export async function postWithFallback<T>(path: string, payload: unknown, fallback: () => T | Promise<T>): Promise<T> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback();
  }
}

// ---- Result cards ----------------------------------------------------------

export function Card({ title, full, warning, children }: { title: string; full?: boolean; warning?: boolean; children: ReactNode }) {
  return (
    <article className={['ai-card', full && 'full', warning && 'warning'].filter(Boolean).join(' ')}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export function List({ items }: { items?: string[] }) {
  const safe = (items ?? []).filter(Boolean);
  if (!safe.length) return <p>No items yet.</p>;
  return (
    <ul>
      {safe.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Badges({ items }: { items: string[] }) {
  return (
    <div className="badge-row">
      {items.filter(Boolean).map((item, i) => (
        <span className="badge" key={i}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function CourseBadges({ course }: { course: SeedCourse }) {
  return (
    <div className="badge-row">
      <span className="badge">{course.code}</span>
      <span className={`badge ${String(course.roughDifficulty || '').toLowerCase()}`}>{course.roughDifficulty} difficulty</span>
      <span className="badge">{course.confidenceLevel}</span>
    </div>
  );
}

export function OfficialCard({ note }: { note?: string }) {
  return (
    <Card title="Official verification" full warning>
      <p>{note || OFFICIAL_NOTE}</p>
    </Card>
  );
}

export function LoadingCard({ message }: { message: string }) {
  return <div className="loading-card">{message}</div>;
}

export function ValidationCard({ message }: { message: string }) {
  return (
    <article className="ai-card full validation-card">
      <span className="validation-dot" aria-hidden="true" />
      <div className="validation-copy">
        <h3>{message}</h3>
        <p>
          Try <strong>CSC108, MAT137, STA130</strong> or choose courses from the catalog.
        </p>
      </div>
    </article>
  );
}

// ---- Dropdown select -------------------------------------------------------

export function PlannerSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: readonly { value: string; label?: string }[];
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside([ref], () => setOpen(false), open);
  useEscape(() => setOpen(false), open);
  const current = options.find((o) => o.value === value);
  return (
    <div className={open ? 'planner-select-wrap open' : 'planner-select-wrap'} ref={ref}>
      <button type="button" className="planner-select-button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        {current?.label ?? current?.value ?? value}
      </button>
      <div className="planner-select-menu" role="listbox">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            className={o.value === value ? 'planner-select-option is-selected' : 'planner-select-option'}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label ?? o.value}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Course search with suggestions ----------------------------------------

const FALLBACK_CODES = [
  'CSC108', 'MAT137', 'STA130', 'ECO101', 'MAT135', 'PHL245', 'BIO120', 'CHM135', 'MAT136', 'PSY100', 'SOC100', 'AST101',
  'CSC148', 'CSC165', 'MAT223', 'POL101', 'HIS102', 'ENG100', 'ECO102', 'ANT100', 'LIN101', 'VIC100', 'TRN125',
];

export const PLACEHOLDER_CODES = FALLBACK_CODES;

export function courseMatches(pool: SeedCourse[], query: string, exclude: string[] = []): { code: string; title: string }[] {
  const q = normalizeCourseCode(query);
  if (!q) return [];
  const source = pool.length ? pool : FALLBACK_CODES.map((code) => ({ code, title: '' }));
  return source
    .filter((c) => {
      const code = normalizeCourseCode(c.code);
      return !exclude.includes(code) && code.includes(q);
    })
    .slice(0, 8);
}

interface SuggestionsProps {
  id: string;
  items: { code: string; title: string }[];
  visible: boolean;
  onPick: (code: string) => void;
}

export function Suggestions({ id, items, visible, onPick }: SuggestionsProps) {
  return (
    <div className="course-picker-suggestions" id={id} role="listbox" aria-label="Course suggestions" hidden={!visible || !items.length}>
      {items.map((c) => (
        <button type="button" className="course-picker-option" role="option" aria-selected={false} key={c.code} onClick={() => onPick(c.code)}>
          <span className="course-picker-code">{c.code}</span>
          <span className="course-picker-title">{c.title || 'Course details pending'}</span>
        </button>
      ))}
    </div>
  );
}

export function SearchIcon() {
  return <Icon name="search-outline" />;
}
