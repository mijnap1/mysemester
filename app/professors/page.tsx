import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { PROFESSOR_DATA_UPDATED } from '@/lib/professors';
import { ProfessorFinder } from './ProfessorFinder';
import './professors.css';

export const metadata: Metadata = { title: 'Professor Picks — MySemester' };

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
            <span className="kicker">UofT professor guide</span>
            <h1>Professor Picks</h1>
            <p>
              Search a UofT course and compare instructor options with clean rating cards, star scores, difficulty, and
              short student-vibe summaries.
            </p>
          </div>
          <div className="hero-note">
            <Icon name="information-circle-outline" />
            <span>
              Ratings are a snapshot from {PROFESSOR_DATA_UPDATED}. Double-check current instructors in UofT Timetable
              Builder and ratings on RMP before enrolment.
            </span>
          </div>
        </section>
        <ProfessorFinder />
      </main>
    </>
  );
}
