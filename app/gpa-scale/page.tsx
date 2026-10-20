import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { ScaleList } from './ScaleList';
import './gpa-scale.css';

export const metadata: Metadata = { title: 'GPA Scaling — MySemester' };

export default function GpaScalePage() {
  return (
    <>
      <header className="page-header">
        <a className="brand" href="/main/">
          <Icon name="school-outline" />
          <span>MySemester</span>
        </a>
      </header>

      <main className="page">
        <section className="hero">
          <span className="kicker">GPA Scaling</span>
          <h1>Understand GPA scales by university.</h1>
          <p>
            Each university can use a different scale. This page explains how grading scales work and provides a clean
            reference you can use while setting up your courses.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="mailto:jamie.mails07@gmail.com">
              Add your university
            </a>
            <a className="ghost-btn" href="#how-it-works">
              How it works
            </a>
          </div>
        </section>

        <section className="grid" id="how-it-works">
          <article className="card">
            <div className="card-icon">
              <Icon name="grid-outline" />
            </div>
            <h2>Scale types</h2>
            <p>
              Some schools use 4.0, others use 4.3, 4.33, 9.0, or percentage-to-letter conversions. MySemester supports
              multiple formats.
            </p>
          </article>
          <article className="card">
            <div className="card-icon">
              <Icon name="stats-chart-outline" />
            </div>
            <h2>Letter mappings</h2>
            <p>
              Letter grades often map to GPA ranges. These mappings vary by faculty and institution, so always confirm the
              official chart.
            </p>
          </article>
          <article className="card">
            <div className="card-icon">
              <Icon name="shield-checkmark-outline" />
            </div>
            <h2>Official sources</h2>
            <p>Use your university’s official policy page for the most accurate and current GPA conversion rules.</p>
          </article>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>University scales</h2>
            <p>
              High-value Canadian universities to start. We will expand this list over time using official academic
              calendars and registrar policies.
            </p>
          </div>
          <ScaleList />
          <div className="panel-note">
            Always verify with your faculty or program: some departments use different scales or special rules.
          </div>
        </section>
      </main>
    </>
  );
}
