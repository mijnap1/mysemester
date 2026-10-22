import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import catalogData from '@/data/ai-planner-courses.json';
import { ProfessorFinder, type CatalogCourse } from './ProfessorFinder';
import './professors.css';

export const metadata: Metadata = { title: 'Professor Picks — MySemester' };

// Only codes and titles reach the browser, for search suggestions.
const CATALOG: CatalogCourse[] = (catalogData as CatalogCourse[]).map(({ code, title }) => ({ code, title }));

export default function ProfessorsPage() {
  return (
    <>
      <header className="page-header">
        <a className="brand" href="/main/" aria-label="MySemester home">
          <Icon name="school-outline" />
          <span>MySemester</span>
        </a>
      </header>

      <main className="page">
        <section className="hero">
          <div>
            <span className="kicker">UofT St. George</span>
            <h1>Professor Picks</h1>
            <p>
              Search a course to see who’s teaching each lecture section this year, straight from UofT Timetable Builder,
              ranked by MySemester students’ ratings. Had one of them? Rate them for the next person.
            </p>
          </div>
          <div className="hero-note">
            <Icon name="information-circle-outline" />
            <span>
              Instructors can change before term starts, and some sections list theirs late. Timetable Builder and ACORN have
              the final word.
            </span>
          </div>
        </section>
        <ProfessorFinder catalog={CATALOG} />
      </main>
    </>
  );
}
