'use client';

import { Icon } from '@/components/Icon';
import { dueLabel, inGrades, type Deadline, type NextDeadline } from '@/lib/quercus';
import { KEYS, writeString } from '@/lib/storage';
import type { Course } from '@/lib/types';

const SHOWN = 4;

interface CourseDeadlinesProps {
  course: Course;
  items: NextDeadline[];
  /** When the list was computed, for the date labels. */
  now: number;
  onAdd: (deadline: Deadline) => void;
}

/** This course's upcoming Quercus items, above its grade table. */
export function CourseDeadlines({ course, items, now, onAdd }: CourseDeadlinesProps) {
  if (!items.length) return null;
  const shown = items.slice(0, SHOWN);
  return (
    <section className="course-deadlines" aria-labelledby="course-deadlines-title">
      <div className="course-deadlines-head">
        <h2 id="course-deadlines-title">
          <Icon name="calendar-outline" /> On Quercus
        </h2>
        {items.length > SHOWN && (
          <a
            href="/main/"
            onClick={() => writeString(KEYS.dashboardView, 'deadlines')}
            className="course-deadlines-more"
          >
            {items.length - SHOWN} more
          </a>
        )}
      </div>
      <ul>
        {shown.map(({ deadline: d, overdue, when }) => {
          const added = inGrades(d, course);
          return (
            <li key={d.id} className={overdue ? 'is-overdue' : undefined}>
              <div className="course-deadlines-main">
                <span className="course-deadlines-title">
                  {d.title}
                  {d.kind === 'test' && <span className="course-deadlines-test">Test</span>}
                </span>
                <span className="course-deadlines-when">
                  {dueLabel(d, now)} · {when}
                </span>
              </div>
              {d.kind !== 'event' &&
                (added ? (
                  <span className="course-deadlines-added">
                    <Icon name="checkmark-outline" /> In grades
                  </span>
                ) : (
                  <button type="button" className="course-deadlines-add" onClick={() => onAdd(d)}>
                    <Icon name="add-outline" /> Add
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
