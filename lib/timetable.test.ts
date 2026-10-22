import { describe, expect, it } from 'vitest';
import { candidateCodes, groupByInstructor, meetingLabel, normalizeCourseQuery, parseTimetable, rmpSearchUrl } from './timetable';

const HOUR = 3_600_000;
const meeting = (day: number, from: number, to: number) => ({ start: { day, millisofday: from * HOUR }, end: { day, millisofday: to * HOUR }, repetition: 'WEEKLY' });
const section = (name: string, teachMethod: string, instructors: [string, string][], meetings: ReturnType<typeof meeting>[], extra = {}) => ({
  name,
  teachMethod,
  instructors: instructors.map(([firstName, lastName]) => ({ firstName, lastName })),
  meetingTimes: meetings,
  deliveryModes: [{ session: '20269', mode: 'INPER' }],
  currentEnrolment: 178,
  maxEnrolment: 196,
  cancelInd: 'N',
  ...extra,
});

// Shaped like a real getCoursesByCodeAndSectionCode response (trimmed).
const RESPONSE = {
  payload: {
    pageableCourse: {
      courses: [
        {
          code: 'CSC148H1',
          name: 'Introduction to Computer Science',
          sectionCode: 'S',
          sessions: ['20271'],
          cancelInd: 'N',
          sections: [
            section('LEC0201', 'LEC', [], [meeting(2, 15, 17), meeting(4, 15, 16)]),
            section('LEC0101', 'LEC', [['Jonathan', 'Calver']], [meeting(2, 9, 11), meeting(4, 10, 11)]),
            section('LEC5101', 'LEC', [['Sophia', 'Huynh']], [meeting(2, 18, 21)], { deliveryModes: [{ session: '20271', mode: 'SYNC' }] }),
          ],
        },
        {
          code: 'CSC148H1',
          name: 'Introduction to Computer Science',
          sectionCode: 'F',
          sessions: ['20269'],
          cancelInd: 'N',
          sections: [
            section('TUT0101', 'TUT', [], [meeting(4, 9, 11)]),
            section('LEC0201', 'LEC', [['Sadia', 'Sharmin']], [meeting(3, 13, 15), meeting(1, 13, 14)]),
            section('LEC0101', 'LEC', [['Sadia', 'Sharmin']], [meeting(3, 9, 11), meeting(1, 10, 11)]),
            section('LEC9901', 'LEC', [['Gone', 'Away']], [meeting(5, 9, 10)], { cancelInd: 'Y' }),
          ],
        },
      ],
    },
  },
};

describe('course codes', () => {
  it('accepts St. George codes in the forms students type', () => {
    expect(normalizeCourseQuery(' csc 148 ')).toBe('CSC148');
    expect(normalizeCourseQuery('CSC148H1')).toBe('CSC148H1');
    expect(normalizeCourseQuery('MAT137Y1')).toBe('MAT137Y1');
    expect(normalizeCourseQuery('CSCA08H3')).toBeNull(); // UTSC
    expect(normalizeCourseQuery('hello')).toBeNull();
  });

  it('looks up both half- and full-year versions of a short code', () => {
    expect(candidateCodes('CSC148')).toEqual(['CSC148H1', 'CSC148Y1']);
    expect(candidateCodes('MAT137Y1')).toEqual(['MAT137Y1']);
  });
});

describe('parseTimetable', () => {
  const offerings = parseTimetable(RESPONSE);

  it('orders terms Fall, then Winter, and keeps only active lecture sections', () => {
    expect(offerings.map((o) => [o.term, o.termLabel])).toEqual([
      ['F', 'Fall 2026'],
      ['S', 'Winter 2027'],
    ]);
    expect(offerings[0].lectures.map((l) => l.name)).toEqual(['LEC0101', 'LEC0201']);
  });

  it('reads instructors, meeting times, delivery mode and enrolment', () => {
    const lec = offerings[0].lectures[0];
    expect(lec.instructors).toEqual(['Sadia Sharmin']);
    expect(lec.meetings.map(meetingLabel)).toEqual(['Mon 10–11 AM', 'Wed 9–11 AM']);
    expect(lec).toMatchObject({ mode: 'In person', enrolled: 178, capacity: 196 });
    expect(offerings[1].lectures.find((l) => l.name === 'LEC5101')!.mode).toBe('Online (live)');
  });

  it('labels full-year sessions', () => {
    const year = parseTimetable({ payload: { pageableCourse: { courses: [{ code: 'MAT137Y1', name: 'Calculus', sectionCode: 'Y', sessions: ['20271', '20269'], sections: [] }] } } });
    expect(year[0].termLabel).toBe('Fall–Winter 2026–27');
  });

  it('survives empty or malformed responses', () => {
    expect(parseTimetable(null)).toEqual([]);
    expect(parseTimetable({ payload: {} })).toEqual([]);
  });
});

describe('groupByInstructor', () => {
  it('gives each instructor one card, with unassigned sections last', () => {
    const [fall, winter] = parseTimetable(RESPONSE);
    expect(groupByInstructor(fall).map((g) => [g.name, g.sections.map((s) => s.name)])).toEqual([['Sadia Sharmin', ['LEC0101', 'LEC0201']]]);
    expect(groupByInstructor(winter).map((g) => g.name)).toEqual(['Jonathan Calver', 'Sophia Huynh', null]);
  });
});

it('links to Rate My Professors search at St. George', () => {
  expect(rmpSearchUrl('Sadia Sharmin')).toBe('https://www.ratemyprofessors.com/search/professors/1484?q=Sadia%20Sharmin');
});
