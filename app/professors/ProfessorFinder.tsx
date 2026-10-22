'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useClickOutside } from '@/lib/hooks';
import {
  groupByInstructor,
  meetingLabel,
  normalizeCourseQuery,
  rmpSearchUrl,
  TTB_SITE,
  type CourseTimetable,
  type InstructorGroup,
} from '@/lib/timetable';
import {
  adjustedScore,
  confidenceLabel,
  instructorKey,
  loadRatings,
  rankByRatings,
  type LoadResult,
  type MyRating,
  type RatingSummary,
} from '@/lib/professor-ratings';
import { useToast } from '@/components/Toast';
import { RateDialog, type RateTarget } from './RateDialog';

export interface CatalogCourse {
  code: string;
  title: string;
}

type Result =
  | { state: 'idle' }
  | { state: 'loading'; code: string }
  | { state: 'error'; code: string; message: string }
  | { state: 'ready'; data: CourseTimetable };

function matches(catalog: CatalogCourse[], query: string): CatalogCourse[] {
  const q = query.replace(/\s+/g, '').toUpperCase();
  if (!q) return [];
  return catalog.filter((c) => c.code.startsWith(q) || c.code.includes(q) || c.title.toUpperCase().includes(query.trim().toUpperCase())).slice(0, 8);
}

function updatedLabel(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins) || mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="stars" aria-label={rating ? `${rating.toFixed(1)} out of 5 stars` : 'No ratings yet'}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name={i < rounded ? 'star' : 'star-outline'} />
      ))}
    </div>
  );
}

/** Below this many ratings, point students to RMP as well. */
const FEW_RATINGS = 5;

type Ratings = { code: string; result: LoadResult } | null;

interface CardProps {
  group: InstructorGroup;
  rank: number | null;
  summary: RatingSummary | undefined;
  mine: MyRating | undefined;
  ratings: LoadResult | null;
  onRate: () => void;
}

function InstructorCard({ group, rank, summary, mine, ratings, onRate }: CardProps) {
  const { sections } = group;
  const confidence = summary ? confidenceLabel(summary.ratings) : null;
  return (
    <article className="prof-card">
      <div className="prof-top">
        <div className="prof-name">
          <h3>{group.name ?? 'Instructor not announced'}</h3>
          <span>{sections.map((s) => s.name).join(' / ')}</span>
        </div>
        {rank !== null && <div className="rank">#{rank}</div>}
      </div>
      <div className="rating-block">
        <Stars rating={summary?.quality ?? 0} />
        <div className="rating-main">
          <div className="score">{summary ? summary.quality.toFixed(1) : '—'}</div>
          <div className="rating-copy">
            {summary && confidence ? (
              <>
                <div className={`confidence-badge confidence-${confidence.toLowerCase().split(' ')[0]}`}>{confidence}</div>
                <div className="score-meta">
                  <span>
                    {summary.ratings} rating{summary.ratings === 1 ? '' : 's'}
                  </span>
                  <span>Adjusted score {Math.round(adjustedScore(summary))} / 100</span>
                </div>
                {summary.ratings < FEW_RATINGS && group.name && (
                  <a className="meta-link" href={rmpSearchUrl(group.name)} target="_blank" rel="noopener noreferrer">
                    Few ratings so far. Also see RMP <Icon name="open-outline" />
                  </a>
                )}
              </>
            ) : (
              <>
                <div className="confidence-badge confidence-none">No ratings yet</div>
                <div className="score-meta">
                  <span>{!group.name ? 'Rate once an instructor is listed' : ratings?.ok === false ? 'Ratings are unavailable right now' : 'Had them? Be the first to rate'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="metric-row">
        <div className="metric">
          <span>Would take again</span>
          <strong>{summary ? `${Math.round(summary.wouldTakeAgain)}%` : '—'}</strong>
        </div>
        <div className="metric">
          <span>Difficulty</span>
          <strong>{summary ? `${summary.difficulty.toFixed(1)} / 5` : '—'}</strong>
        </div>
      </div>
      {summary && summary.topTags.length > 0 && (
        <div className="tag-row">
          {summary.topTags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="summary">
        {sections.map((s, i) => (
          <span key={s.name}>
            {i > 0 && <br />}
            <b>{s.name}</b> {s.meetings.length ? s.meetings.map(meetingLabel).join(', ') : 'times not listed'}
          </span>
        ))}
      </p>
      {group.name ? (
        <div className="card-actions">
          {ratings?.ok && ratings.signedIn ? (
            <button type="button" className="rate-link" onClick={onRate}>
              <Icon name={mine ? 'create-outline' : 'star-outline'} /> {mine ? 'Edit your rating' : 'Rate this professor'}
            </button>
          ) : ratings?.ok ? (
            <a className="rate-link" href="/login/">
              <Icon name="log-in-outline" /> Sign in to rate
            </a>
          ) : null}
          <a className="source-link" href={rmpSearchUrl(group.name)} target="_blank" rel="noopener noreferrer">
            Open RMP reviews <Icon name="open-outline" />
          </a>
        </div>
      ) : (
        <span className="source-link source-link-disabled">
          Instructor not announced yet <Icon name="time-outline" />
        </span>
      )}
    </article>
  );
}

// Rotating examples for the search box, like the original page.
const POPULAR = ['CSC108', 'CSC148', 'STA130', 'ECO101', 'MAT135', 'PSY100', 'BIO130', 'CHM135', 'ECO102', 'CSC165', 'MAT223', 'STA220'];

function placeholderAt(offset: number): string {
  const examples = [0, 1, 2].map((i) => POPULAR[(offset + i) % POPULAR.length]);
  return `Try ${examples.join(', ')}...`;
}

export function ProfessorFinder({ catalog }: { catalog: CatalogCourse[] }) {
  const [query, setQuery] = useState('');
  const [placeholderOffset, setPlaceholderOffset] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<Result>({ state: 'idle' });
  const [ratings, setRatings] = useState<Ratings>(null);
  const [rateTarget, setRateTarget] = useState<RateTarget | null>(null);
  const { show, toast } = useToast();
  const panelRef = useRef<HTMLElement>(null);
  const requestRef = useRef(0);
  const latestCode = useRef('');

  useClickOutside([panelRef], () => setShowSuggestions(false), showSuggestions);

  useEffect(() => {
    if (query) return;
    const id = window.setInterval(() => setPlaceholderOffset((o) => (o + 3) % POPULAR.length), 3200);
    return () => window.clearInterval(id);
  }, [query]);

  const suggestions = matches(catalog, query);
  const suggestionsVisible = showSuggestions && suggestions.length > 0;

  async function search(raw: string) {
    const code = normalizeCourseQuery(raw);
    setShowSuggestions(false);
    if (!code) {
      setResult({ state: 'error', code: raw.trim().toUpperCase(), message: 'Enter a St. George course code, like CSC148 or MAT137Y1.' });
      return;
    }
    const id = ++requestRef.current;
    latestCode.current = code;
    setRatings(null);
    setResult({ state: 'loading', code });
    try {
      const res = await fetch(`/api/timetable/${encodeURIComponent(code)}/`);
      const body = (await res.json()) as CourseTimetable & { error?: string };
      if (id !== requestRef.current) return;
      if (!res.ok) setResult({ state: 'error', code, message: body.error ?? 'Couldn’t load this course.' });
      else {
        setResult({ state: 'ready', data: body });
        if (body.offerings.length) void refreshRatings(body.code);
      }
    } catch {
      if (id === requestRef.current) setResult({ state: 'error', code, message: 'Couldn’t reach UofT Timetable Builder. Try again in a moment.' });
    }
  }

  async function refreshRatings(code: string) {
    const loaded = await loadRatings(code);
    setRatings((current) => (normalizeCourseQuery(code) === normalizeCourseQuery(latestCode.current) ? { code, result: loaded } : current));
  }

  // Deep links: /professors/?course=CSC148
  useEffect(() => {
    const course = new URLSearchParams(window.location.search).get('course');
    if (course) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL on first load
      setQuery(course);
      void search(course);
    }
  }, []);

  function choose(code: string) {
    setQuery(code);
    window.history.replaceState(null, '', `?course=${encodeURIComponent(code)}`);
    void search(code);
  }

  const data = result.state === 'ready' ? result.data : null;
  const courseRatings = data && ratings?.code === data.code ? ratings.result : null;
  const summaryOf = (group: InstructorGroup) => (group.name && courseRatings?.ok ? courseRatings.summaries.get(instructorKey(group.name)) : undefined);
  const mineOf = (group: InstructorGroup) => (group.name && courseRatings?.ok ? courseRatings.mine.get(instructorKey(group.name)) : undefined);
  const catalogTitle = data ? catalog.find((c) => c.code === data.code.slice(0, 6))?.title : undefined;

  return (
    <>
      <section className="finder-panel" aria-label="Find instructors by course" ref={panelRef}>
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            choose(query.replace(/\s+/g, '').toUpperCase());
          }}
        >
          <label htmlFor="courseSearch">Course code</label>
          <div className="search-box">
            <Icon name="search-outline" />
            <input
              id="courseSearch"
              type="search"
              role="combobox"
              placeholder={placeholderAt(placeholderOffset)}
              autoComplete="off"
              aria-controls="courseSuggestions"
              aria-expanded={suggestionsVisible}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => query && setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
            />
          </div>
          <div className="course-suggestions" id="courseSuggestions" role="listbox" aria-label="Course suggestions" hidden={!suggestionsVisible}>
            {suggestions.map((c) => (
              <button type="button" className="course-suggestion" role="option" aria-selected={false} key={c.code} onClick={() => choose(c.code)}>
                <span className="suggestion-code">{c.code}</span>
                <span className="suggestion-title">{c.title}</span>
              </button>
            ))}
          </div>
        </form>
      </section>

      {data && data.offerings.length > 0 && (
        <section className="results-head">
          <div>
            <h2>
              {data.code} <span className="results-title">{data.title || catalogTitle}</span>
            </h2>
            <p>From UofT Timetable Builder · updated {updatedLabel(data.fetchedAt)}</p>
          </div>
          <a className="source-pill" href={TTB_SITE} target="_blank" rel="noopener noreferrer">
            <Icon name="open-outline" />
            <span>Timetable Builder</span>
          </a>
        </section>
      )}

      <div aria-live="polite">
        {result.state === 'idle' && (
          <div className="professor-grid">
            <div className="empty-state">
              <Icon name="search-circle-outline" />
              <h3>No professor list selected</h3>
              <p>{query ? 'Choose a matching course from the suggestions, or press Enter to search it.' : 'Start typing a UofT course code to see matching suggestions.'}</p>
            </div>
          </div>
        )}

        {result.state === 'loading' && (
          <div className="professor-grid" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div className="prof-card is-loading" key={i} aria-hidden="true">
                <span className="skeleton" style={{ width: '60%' }} />
                <span className="skeleton" style={{ width: '35%' }} />
                <span className="skeleton tall" />
              </div>
            ))}
          </div>
        )}

        {result.state === 'error' && (
          <div className="professor-grid">
            <div className="empty-state">
              <Icon name="alert-circle-outline" />
              <h3>{result.code ? `Couldn’t load ${result.code}` : 'Couldn’t search'}</h3>
              <p>{result.message}</p>
            </div>
          </div>
        )}

        {data && data.offerings.length === 0 && (
          <div className="professor-grid">
            <div className="empty-state">
              <Icon name="calendar-clear-outline" />
              <h3>{data.code} isn’t on the timetable</h3>
              <p>
                Timetable Builder doesn’t list {data.code} at St. George for this year. Check the code, or look it up in{' '}
                <a href={TTB_SITE} target="_blank" rel="noopener noreferrer">
                  Timetable Builder
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {data?.offerings.map((offering) => (
          <section className="term-block" key={`${offering.code}-${offering.term}`} aria-label={offering.termLabel}>
            <h3 className="term-title">
              {offering.termLabel}
              <span>
                {offering.code} · {offering.lectures.length} lecture section{offering.lectures.length === 1 ? '' : 's'}
              </span>
            </h3>
            <div className="professor-grid">
              {offering.lectures.length ? (
                rankByRatings(groupByInstructor(offering), summaryOf).map((group, index) => (
                  <InstructorCard
                    group={group}
                    key={group.name ?? 'tba'}
                    rank={summaryOf(group) ? index + 1 : null}
                    summary={summaryOf(group)}
                    mine={mineOf(group)}
                    ratings={courseRatings}
                    onRate={() => group.name && setRateTarget({ courseCode: offering.code, instructorName: group.name, term: offering.termLabel, existing: mineOf(group) })}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <p>No lecture sections are listed for this term yet.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <RateDialog
        key={rateTarget ? `${rateTarget.courseCode}-${rateTarget.instructorName}` : 'closed'}
        target={rateTarget}
        onClose={() => setRateTarget(null)}
        onSaved={(message) => {
          setRateTarget(null);
          show(message, 'success');
          if (data) void refreshRatings(data.code);
        }}
      />
      {toast}
    </>
  );
}
