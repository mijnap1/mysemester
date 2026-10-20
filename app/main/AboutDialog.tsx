'use client';

import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';

const HANDLES = [
  { icon: 'folder-open-outline', title: 'Courses and folders', body: 'Create courses, group them into folders, and see folder counts at a glance.' },
  { icon: 'calculator-outline', title: 'Grade tracking', body: 'Add weighted assessments, estimate target scores, and track GPA plus course average.' },
  { icon: 'school-outline', title: 'University settings', body: 'Choose or change your university anytime and use school-specific GPA scale references.' },
  { icon: 'document-attach-outline', title: 'Notes and files', body: 'Keep course notes, links, files, and details close to the class they belong to.' },
];

const TOOLS = [
  { icon: 'sparkles-outline', title: 'AI Planner', body: 'Build course plans, explain courses, browse the catalog, and prepare smarter semester decisions.' },
  { icon: 'star-outline', title: 'Professor Picks', body: 'Test feature for UofT course searches with RMP (Rate My Professors) rating cards and clean comparisons.' },
  { icon: 'phone-portrait-outline', title: 'Mobile polish', body: 'Inputs stay readable on phones without unwanted zoom, and empty states are built for small screens.' },
  { icon: 'cloud-done-outline', title: 'Account sync', body: 'Sign in to keep your semester workspace available across devices.' },
];

function Cards({ items }: { items: typeof HANDLES }) {
  return (
    <div className="about-grid">
      {items.map((item) => (
        <div className="about-card" key={item.title}>
          <div className="about-card-icon">
            <Icon name={item.icon} />
          </div>
          <div>
            <h4>{item.title}</h4>
            <p>{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} id="aboutModal">
      <div className="modal-head about-modal-head">
        <Icon name="information-circle-outline" />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
          About MySemester
        </span>
      </div>
      <div className="modal-body about-modal-body" style={{ padding: 0 }}>
        <div className="about-content">
          <div className="about-hero">
            <span className="about-kicker">Student Workspace</span>
            <h2>Everything for your semester, kept in one clean dashboard.</h2>
            <p>
              MySemester helps students organize courses, folders, grades, assessments, files, GPA scales, and planning
              tools without turning school tracking into another messy spreadsheet.
            </p>
            <div className="about-actions">
              <a className="about-link" href="/gpa-scale/" target="_blank" rel="noopener">
                <Icon name="school-outline" />
                GPA scale guide
              </a>
              <a className="about-link" href="/ai-planner/" target="_blank" rel="noopener">
                <Icon name="sparkles-outline" />
                AI Planner
              </a>
            </div>
          </div>

          <div className="about-summary">
            <div className="about-metric">
              <div className="about-metric-value">Dashboard</div>
              <div className="about-metric-label">Courses, folders, grades, files, and progress together</div>
            </div>
            <div className="about-metric">
              <div className="about-metric-value">Grades</div>
              <div className="about-metric-label">Assessment weights, estimates, GPA, and averages</div>
            </div>
            <div className="about-metric">
              <div className="about-metric-value">Planning</div>
              <div className="about-metric-label">AI Planner, course catalog, and professor test tools</div>
            </div>
          </div>

          <div className="about-section">
            <h3>What It Handles</h3>
            <Cards items={HANDLES} />
          </div>

          <div className="about-section">
            <h3>Planning Tools</h3>
            <Cards items={TOOLS} />
          </div>

          <div className="about-note">
            <Icon name="flask-outline" />
            <div>
              <h3>Some tools are still experimental.</h3>
              <p>
                AI Planner and Professor Picks are meant as helpers. Always verify enrolment, graduation, instructor, and
                GPA decisions with official university sources.
              </p>
            </div>
          </div>

          <div className="about-footer-note">
            <span>MySemester</span>
            <span>Built for cleaner semester tracking</span>
          </div>
        </div>
      </div>
      <div className="modal-actions about-modal-actions">
        <button type="button" className="btn-plain" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
