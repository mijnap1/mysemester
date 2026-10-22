'use client';

import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';

interface Feature {
  icon: string;
  title: string;
  body: string;
  href?: string;
}

const FEATURES: Feature[] = [
  { icon: 'book-outline', title: 'Courses and folders', body: 'Keep each semester’s classes together.' },
  { icon: 'calculator-outline', title: 'Grades', body: 'Weighted assessments, averages, and what you need to hit a target.' },
  { icon: 'school-outline', title: 'GPA scales', body: 'Your university’s scale, applied automatically.', href: '/gpa-scale/' },
  { icon: 'cloud-done-outline', title: 'Sync', body: 'Sign in to use it on any device. Signed out, data stays on this one.' },
];

const UOFT_TOOLS: Feature[] = [
  { icon: 'calendar-outline', title: 'Quercus deadlines', body: 'Due dates from your Quercus calendar on the dashboard.' },
  { icon: 'sparkles-outline', title: 'AI Planner', body: 'Course plans and explanations for Arts & Science.', href: '/ai-planner/' },
  { icon: 'star-outline', title: 'Professor Picks', body: 'Who’s teaching each section this year, ranked by student ratings.', href: '/professors/' },
];

function FeatureList({ items }: { items: Feature[] }) {
  return (
    <ul className="about-list">
      {items.map((item) => {
        const content = (
          <>
            <Icon name={item.icon} className="about-list-icon" />
            <span className="about-list-text">
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
            {item.href && <Icon name="chevron-forward-outline" className="about-list-chevron" />}
          </>
        );
        return (
          <li key={item.title}>
            {item.href ? (
              <a className="about-list-row is-link" href={item.href}>
                {content}
              </a>
            ) : (
              <div className="about-list-row">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} id="aboutModal">
      <div className="modal-head">
        <Icon name="information-circle-outline" />
        <span>About</span>
      </div>
      <div className="about-body">
        <div className="about-intro">
          {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
          <img src="/mysemesterlogo.png" alt="" width={48} height={48} />
          <div>
            <h2>MySemester</h2>
            <p>A simple place to track your courses, grades, and GPA.</p>
          </div>
        </div>

        <section>
          <h3 className="about-label">Features</h3>
          <FeatureList items={FEATURES} />
        </section>

        <section>
          <h3 className="about-label">
            For UofT students <span className="about-beta">Beta</span>
          </h3>
          <FeatureList items={UOFT_TOOLS} />
          <p className="about-fineprint">
            These tools are unofficial helpers. Always confirm enrolment and grading decisions with the university.
          </p>
        </section>
      </div>
      <div className="modal-actions about-actions">
        <span className="about-version">Version 2.0 · © 2026</span>
        <button type="button" className="btn-plain" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
