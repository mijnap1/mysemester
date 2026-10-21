'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useClickOutside } from '@/lib/hooks';
import {
  PROFESSOR_DATA,
  normalizeCourse,
  professorRankDetails,
  rankProfessors,
  reviewConfidenceLabel,
  type CourseProfessors,
} from '@/lib/professors';

const SORTED_CODES = PROFESSOR_DATA.map((c) => c.courseCode).sort();

function placeholderAt(offset: number): string {
  const examples = [0, 1, 2].map((i) => SORTED_CODES[(offset + i) % SORTED_CODES.length]);
  return `Try ${examples.join(', ')}...`;
}

function courseMatches(query: string): CourseProfessors[] {
  const q = normalizeCourse(query);
  if (!q) return [];
  return PROFESSOR_DATA.filter(
    (c) => c.courseCode.startsWith(q) || c.courseCode.includes(q) || c.courseTitle.toUpperCase().includes(q),
  ).slice(0, 8);
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name={i < rounded ? 'star' : 'star-outline'} />
      ))}
    </div>
  );
}

function CourseResults({ course }: { course: CourseProfessors }) {
  return (
    <>
      {rankProfessors(course.professors).map((prof, index) => {
        const rank = professorRankDetails(prof);
        const confidence = reviewConfidenceLabel(prof.ratingsCount);
        return (
          <article className="prof-card" key={prof.name}>
            <div className="prof-top">
              <div className="prof-name">
                <h3>{prof.name}</h3>
                <span>{prof.section}</span>
              </div>
              <div className="rank">#{index + 1}</div>
            </div>
            <div className="rating-block">
              <Stars rating={prof.rating} />
              <div className="rating-main">
                <div className="score">{prof.rating.toFixed(1)}</div>
                <div className="rating-copy">
                  <div className={`confidence-badge confidence-${confidence.toLowerCase().split(' ')[0]}`}>{confidence}</div>
                  <div className="score-meta">
                    <span>{prof.ratingsCount} ratings</span>
                    <span>Adjusted score {Math.round(rank.score)} / 100</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric">
                <span>Would take again</span>
                <strong>{prof.wouldTakeAgain}%</strong>
              </div>
              <div className="metric">
                <span>Difficulty</span>
                <strong>{prof.difficulty.toFixed(1)} / 5</strong>
              </div>
            </div>
            <div className="tag-row">
              {prof.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="summary">{prof.summary}</p>
            {prof.sourceUrl ? (
              <a className="source-link" href={prof.sourceUrl} target="_blank" rel="noopener noreferrer">
                Open RMP profile <Icon name="open-outline" />
              </a>
            ) : (
              <span className="source-link source-link-disabled">
                RMP profile pending <Icon name="lock-closed-outline" />
              </span>
            )}
          </article>
        );
      })}
    </>
  );
}

export function ProfessorFinder() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeholderOffset, setPlaceholderOffset] = useState(0);
  const panelRef = useRef<HTMLElement>(null);

  useClickOutside([panelRef], () => setShowSuggestions(false), showSuggestions);

  useEffect(() => {
    if (query) return;
    const id = window.setInterval(() => setPlaceholderOffset((o) => (o + 3) % SORTED_CODES.length), 3200);
    return () => window.clearInterval(id);
  }, [query]);

  const code = normalizeCourse(query);
  const course = PROFESSOR_DATA.find((c) => c.courseCode === code);
  const suggestions = courseMatches(query);
  const suggestionsVisible = showSuggestions && suggestions.length > 0;

  function choose(courseCode: string) {
    setQuery(courseCode);
    setShowSuggestions(false);
  }

  let emptyMessage = 'Start typing a UofT course code to see matching suggestions.';
  if (code && suggestions.length) emptyMessage = 'Choose a matching course from the suggestions to see professor picks.';
  else if (code) emptyMessage = `No professor info for ${code} yet. More course matches can be added as we verify them.`;

  return (
    <>
      <section className="finder-panel" aria-label="Find professors by course" ref={panelRef}>
        <div className="search-row">
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
              <button type="button" className="course-suggestion" role="option" aria-selected={false} key={c.courseCode} onClick={() => choose(c.courseCode)}>
                <span className="suggestion-code">{c.courseCode}</span>
                <span className="suggestion-title">{c.courseTitle}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="results-head">
        <div>
          <h2>{course ? `${course.courseCode} professor picks` : 'Popular picks'}</h2>
          <p>
            {course
              ? `${course.courseTitle} · Ranked by adjusted rating, review count, would-take-again, and difficulty`
              : 'Choose a course to see professor info.'}
          </p>
        </div>
        <div className="source-pill">
          <Icon name="shield-checkmark-outline" />
          <span>Review guide</span>
        </div>
      </section>

      <section className="professor-grid" aria-live="polite">
        {course ? (
          <CourseResults course={course} />
        ) : (
          <div className="empty-state">
            <Icon name="search-circle-outline" />
            <h3>No professor list selected</h3>
            <p>{emptyMessage}</p>
          </div>
        )}
      </section>
    </>
  );
}
