import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PlannerHeader } from '../PlannerHeader';
import { PlannerWorkspace } from './PlannerWorkspace';
import '../ai-planner.css';

export const metadata: Metadata = { title: 'Course Planner | MySemester' };

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlannerHeader />
      <PlannerWorkspace />
      {children}
    </>
  );
}
