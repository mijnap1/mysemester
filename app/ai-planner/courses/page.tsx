import type { Metadata } from 'next';
import { PlannerHeader } from '../PlannerHeader';
import { Catalog } from './Catalog';
import '../ai-planner.css';

export const metadata: Metadata = { title: 'AI Planner Course Catalog | MySemester' };

export default function CoursesPage() {
  return (
    <>
      <PlannerHeader />
      <main className="planner-wrap catalog-wrap">
        <Catalog />
      </main>
    </>
  );
}
