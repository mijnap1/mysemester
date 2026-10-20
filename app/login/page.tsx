import type { Metadata } from 'next';
import { ThemeIconButton } from '@/components/AuthBits';
import { Icon } from '@/components/Icon';
import { LoginForm } from './LoginForm';
import './login.css';

export const metadata: Metadata = { title: 'Sign in — MySemester' };

const PREVIEW_COURSES = [
  { icon: 'laptop-outline', code: 'CSC108', title: 'Intro to Programming', mark: '88%' },
  { icon: 'calculator-outline', code: 'MAT137', title: 'Calculus with Proofs', mark: 'A-' },
  { icon: 'school-outline', code: 'PSY100', title: 'Intro to Psychology', mark: '79%' },
];

/** A static, decorative glimpse of the dashboard shown beside the form. */
function DashboardPreview() {
  return (
    <aside className="lg-preview" aria-hidden="true">
      <div className="lg-preview-top">
        <span className="lg-kicker">Your semester at a glance</span>
        <h2>Grades, GPA, and planning in one calm place.</h2>
        <p>Track weighted assessments, see what you need on the final, and plan next term.</p>
      </div>

      <div className="lg-mock">
        {PREVIEW_COURSES.map((c) => (
          <div className="lg-mock-course" key={c.code}>
            <span className="lg-mock-icon">
              <Icon name={c.icon} />
            </span>
            <span className="lg-mock-text">
              <strong>{c.code}</strong>
              <small>{c.title}</small>
            </span>
            <span className="lg-mock-mark">{c.mark}</span>
          </div>
        ))}
        <div className="lg-mock-stats">
          <div>
            <small>GPA</small>
            <strong>3.70</strong>
          </div>
          <div>
            <small>Average</small>
            <strong>84%</strong>
          </div>
          <div>
            <small>Needed on final</small>
            <strong>76%</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <div className="lg-page">
      <div className="lg-topbar">
        <div className="lg-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
          <img src="/mysemesterlogo.png" alt="" />
          MySemester
        </div>
        <ThemeIconButton className="lg-icon-btn" />
      </div>

      <main className="lg-shell">
        <section className="lg-card">
          <LoginForm />
          <DashboardPreview />
        </section>
      </main>

      <p className="lg-legal">© 2026 MySemester</p>
    </div>
  );
}
