'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { AskPanel } from '../AskPanel';
import { ExplainerPanel } from '../ExplainerPanel';
import { currentTab } from '../PlannerHeader';
import { PlannerPanel } from '../PlannerPanel';
import { EnrolmentPanel, SemesterPanel } from '../SemesterPanels';
import { useSeedCourses } from '../ui';

/**
 * All planner tabs stay mounted; the URL only chooses which one is visible,
 * so switching tabs keeps what you typed.
 */
export function PlannerWorkspace() {
  const tab = currentTab(usePathname());
  const { courses: seed } = useSeedCourses();
  return (
    <main className="planner-wrap">
      <section className="planner-hero">
        <div>
          <p className="eyebrow">Unofficial UofT Arts &amp; Science planning helper</p>
          <h1>AI Planner</h1>
          <p>Plan first-year courses, spot workload risks, and prepare better questions before enrolment.</p>
          <a className="hero-link" href="/ai-planner/courses/">
            <Icon name="list-outline" /> View 800-course catalog
          </a>
        </div>
        <div className="official-note">
          <Icon name="alert-circle-outline" />
          <span>
            This is not official advising. Verify important decisions with the UofT Calendar, department pages, your
            registrar, or an academic advisor.
          </span>
        </div>
      </section>

      <PlannerPanel active={tab === 'planner'} seed={seed} />
      <ExplainerPanel active={tab === 'explainer'} seed={seed} />
      <SemesterPanel active={tab === 'semester'} seed={seed} />
      <EnrolmentPanel active={tab === 'enrolment'} />
      <AskPanel active={tab === 'ask'} seed={seed} />
    </main>
  );
}
