'use client';

import { useMemo, useState } from 'react';
import { GPA_SCALES, type GpaMapping } from '@/lib/gpa-scales';

const SCALE_TAGS: Record<string, { label: string; className: string }> = {
  '4.0': { label: '4.0', className: 'four' },
  '4.33': { label: '4.33', className: 'fourthree' },
  '4.3': { label: '4.3', className: 'fourthree' },
  '9-point': { label: '9-point', className: 'ten' },
  '10-point': { label: '10-point', className: 'ten' },
  '12-point': { label: '12-point', className: 'twelve' },
  Percent: { label: 'Percent', className: 'pct' },
};

const SORTED = [...GPA_SCALES].sort(
  (a, b) => (a.province || '').localeCompare(b.province || '') || (a.name || '').localeCompare(b.name || ''),
);

export function ScaleList() {
  const [term, setTerm] = useState('');

  const items = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return SORTED;
    return SORTED.filter((uni) => `${uni.name} ${uni.province} ${uni.scaleType}`.toLowerCase().includes(q));
  }, [term]);

  return (
    <>
      <div className="scale-controls">
        <input
          id="scaleSearch"
          type="search"
          placeholder="Search university..."
          aria-label="Search university"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="scale-legend">
          <span className="legend-item"><span className="dot dot-4" /> 4.0 scale</span>
          <span className="legend-item"><span className="dot dot-43" /> 4.33 scale</span>
          <span className="legend-item"><span className="dot dot-10" /> 10-point</span>
          <span className="legend-item"><span className="dot dot-12" /> 12-point</span>
          <span className="legend-item"><span className="dot dot-pct" /> Percent only</span>
        </div>
      </div>
      <div className="scale-list" aria-live="polite">
        {items.length === 0 && <div className="scale-card">No universities match that search.</div>}
        {items.map((uni) => {
          const mappings = uni.mappings || [];
          const hasPct = mappings.some((m) => m.percent);
          const hasPts = mappings.some((m) => m.points);
          const tag = SCALE_TAGS[uni.scaleType] ?? SCALE_TAGS.Percent;
          const columns: { label: string; key: keyof GpaMapping }[] = [{ label: 'Letter', key: 'letter' }];
          if (hasPct) columns.push({ label: 'Percent', key: 'percent' });
          if (hasPts) columns.push({ label: 'Points', key: 'points' });
          return (
            <div className="scale-card" key={uni.name}>
              <div className="scale-head">
                <div className="scale-title">
                  <h3>{uni.name}</h3>
                  <span>{uni.province || ''}</span>
                </div>
                <div className="scale-tags">
                  <span className={`scale-tag ${tag.className}`}>{tag.label}</span>
                  {hasPct && !hasPts && <span className="scale-tag pct">Percent only</span>}
                  {hasPts && !hasPct && <span className="scale-tag four">Points only</span>}
                </div>
              </div>
              <div className="scale-table">
                {columns.map((col) => (
                  <div className="scale-col" key={col.key}>
                    <h4>{col.label}</h4>
                    <ul>
                      {mappings.map((m, i) => (
                        <li key={i}>
                          <span className="label">{m.letter || '—'}</span>
                          <span className="value">{m[col.key] || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="scale-links">
                {uni.sourceUrl && (
                  <a href={uni.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Official policy
                  </a>
                )}
                {uni.note && <span className="scale-note">{uni.note}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
