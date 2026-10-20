'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';

export function currentTab(pathname: string): string {
  const path = pathname.replace(/\/+$/, '');
  const last = path.split('/').pop();
  return path === '/ai-planner' ? 'planner' : last ?? 'planner';
}

export function PlannerHeader() {
  const tab = currentTab(usePathname());
  const cls = (name: string) => (tab === name ? 'tab-btn active' : 'tab-btn');
  return (
    <header className="planner-header">
      <a className="brand" href="/main/" aria-label="Back to dashboard">
        <Icon name="school-outline" />
        <span>MySemester</span>
      </a>
      <nav className="planner-nav" aria-label="AI Planner sections">
        <Link className={cls('planner')} href="/ai-planner/">
          Course Planner
        </Link>
        <Link className={cls('explainer')} href="/ai-planner/explainer/">
          Course Explainer
        </Link>
        <span className="tab-btn tab-premium tab-disabled" aria-disabled="true" data-tooltip="Coming soon" title="Coming soon">
          <Icon name="sparkles-outline" />
          Ask AI Planner
        </span>
        <Link className={cls('courses')} href="/ai-planner/courses/">
          Course Catalog
        </Link>
      </nav>
    </header>
  );
}
