'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { mockSemester, OFFICIAL_NOTE, type SeedCourse, type SemesterPayload, type SemesterResult } from '@/lib/ai-planner';
import { loadState, readAuth } from '@/lib/semester';
import { Card, List, LoadingCard, OfficialCard, postWithFallback } from './ui';

/** The user's saved MySemester courses and assessments, in the planner's shape. */
export function readSemesterPayload(): SemesterPayload {
  const state = loadState(readAuth());
  return {
    courses: state.courses.map((c) => ({
      code: c.code,
      title: c.title,
      grade: c.grade,
      crncr: c.crncr,
      assessments: c.assessments.map((a) => ({ grade: a.grade, weight: a.weight })),
    })),
  };
}

export function SemesterPanel({ active, seed }: { active: boolean; seed: SeedCourse[] }) {
  const [fetched, setFetched] = useState<SemesterResult | 'loading' | null>(null);
  const started = useRef(false);

  const check = () => {
    const payload = readSemesterPayload();
    return postWithFallback<SemesterResult>('/api/ai-planner/semester-check/', payload, () => mockSemester(seed, payload));
  };

  async function refresh() {
    setFetched('loading');
    setFetched(await check());
  }

  // Run the first check the first time the tab is shown.
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    void check().then(setFetched);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, on first activation
  }, [active]);

  const result = fetched ?? (active ? 'loading' : null);

  return (
    <section className={active ? 'panel tab-panel active' : 'panel tab-panel'} id="semesterPanel">
      <div className="panel-head">
        <div>
          <h2>Semester Check</h2>
          <p>Uses your MySemester course and assessment data where available.</p>
        </div>
        <button className="btn-plain" type="button" onClick={() => void refresh()}>
          <Icon name="refresh-outline" /> Refresh
        </button>
      </div>
      <div className="result-grid">
        {result === 'loading' && <LoadingCard message="Checking your MySemester courses..." />}
        {result && result !== 'loading' && result.empty && (
          <Card title="No course data yet" full>
            <p>{result.message}</p>
            <p>{result.officialNote || OFFICIAL_NOTE}</p>
          </Card>
        )}
        {result && result !== 'loading' && !result.empty && (
          <>
            <Card title="Semester snapshot">
              <p>{result.overview}</p>
            </Card>
            <Card title="Workload warnings" warning>
              <List items={result.warnings} />
            </Card>
            <Card title="Assessment clustering">
              <List
                items={
                  result.clustering?.length
                    ? result.clustering
                    : ['No obvious clustering from the available MySemester rows. Add due dates to your calendar for a stronger check.']
                }
              />
            </Card>
            <Card title="Balance suggestions" full>
              <List items={result.suggestions} />
            </Card>
            <OfficialCard note={result.officialNote} />
          </>
        )}
      </div>
    </section>
  );
}

export function EnrolmentPanel({ active }: { active: boolean }) {
  return (
    <section className={active ? 'panel tab-panel active' : 'panel tab-panel'} id="enrolmentPanel">
      <div className="panel-head">
        <div>
          <h2>Enrolment Prep</h2>
          <p>A compact checklist for the days before your enrolment time.</p>
        </div>
      </div>
      <div className="result-grid">
        <Card title="Before enrolment opens">
          <List
            items={[
              'Prepare backup lecture, tutorial, and practical sections.',
              'Check LEC/TUT/PRA requirements for each course.',
              'Check timetable conflicts, commute gaps, and back-to-back tests where possible.',
              'Log in early before your enrolment time.',
              'Verify program requirements in the UofT Calendar and department pages.',
              'Save alternate courses in case a section fills.',
            ]}
          />
        </Card>
        <Card title="Ask officially when" warning>
          <List
            items={[
              'A choice affects POSt, graduation, transfer credit, or program eligibility.',
              'You are considering CR/NCR for a course connected to your intended program.',
              'Calendar wording, exclusions, or prerequisites are unclear.',
            ]}
          />
        </Card>
        <Card title="Reminder" full warning>
          <p>{OFFICIAL_NOTE}</p>
        </Card>
      </div>
    </section>
  );
}
