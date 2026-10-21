import { describe, expect, it } from 'vitest';
import { parseIcs, parseIcsDate } from './ics';
import {
  applyRefresh,
  assessmentFromDeadline,
  countDueSoon,
  feedCourses,
  findHeavyWeek,
  inGrades,
  nextDeadlineFor,
  toggleHidden,
  eventsToDeadlines,
  groupDeadlines,
  matchCourse,
  normalizeFeedUrl,
  parseCourseCode,
  type Deadline,
  type QuercusLink,
} from './quercus';
import type { Course } from './types';

// Shaped like a real Canvas feed: CRLF endings, folded lines, escaped text.
const FEED = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:icalendar-ruby',
  'BEGIN:VEVENT',
  'DTSTAMP:20261020T120000Z',
  'UID:event-assignment-111',
  'DTSTART:20261024T035900Z',
  'SUMMARY:Lab 3: Linked Lists [CSC148H1 F LEC0101 20269:Introduction to Comp',
  ' uter Science]',
  'URL;VALUE=URI:https://q.utoronto.ca/calendar?include_contexts=course_123#assignment_111',
  'BEGIN:VALARM',
  'SUMMARY:ignored',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-calendar-event-222',
  'DTSTART;VALUE=DATE:20261030',
  'SUMMARY:Midterm 1\\, Room EX100 [MAT137Y1 Y LEC0201 20269:Calculus]',
  'URL:javascript:alert(1)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-calendar-event-333',
  'DTSTART;TZID=America/Toronto:20261102T140000',
  'SUMMARY:Office hours',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:no-date',
  'SUMMARY:Broken',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('parseIcs', () => {
  it('reads events, unfolds lines, unescapes text and skips nested components', () => {
    const events = parseIcs(FEED);
    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({
      uid: 'event-assignment-111',
      summary: 'Lab 3: Linked Lists [CSC148H1 F LEC0101 20269:Introduction to Computer Science]',
      start: '2026-10-24T03:59:00.000Z',
      allDay: false,
    });
    expect(events[1].summary).toBe('Midterm 1, Room EX100 [MAT137Y1 Y LEC0201 20269:Calculus]');
  });

  it('reads zoned and all-day times as Toronto local time', () => {
    // 2pm EST (after the Nov 1 DST change) is 19:00 UTC.
    expect(parseIcsDate('20261102T140000', { TZID: 'America/Toronto' }).iso).toBe('2026-11-02T19:00:00.000Z');
    // 2pm EDT is 18:00 UTC.
    expect(parseIcsDate('20261015T140000').iso).toBe('2026-10-15T18:00:00.000Z');
    expect(parseIcsDate('20261030', { VALUE: 'DATE' })).toEqual({ iso: '2026-10-31T03:59:00.000Z', allDay: true });
    expect(parseIcsDate('garbage').iso).toBeNull();
  });
});

describe('eventsToDeadlines', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');

  it('maps feed events to deadlines with course codes and kinds', () => {
    const deadlines = eventsToDeadlines(parseIcs(FEED), now);
    expect(deadlines.map((d) => [d.title, d.courseCode, d.kind])).toEqual([
      ['Lab 3: Linked Lists', 'CSC148H1', 'assignment'],
      ['Midterm 1, Room EX100', 'MAT137Y1', 'test'],
      ['Office hours', null, 'event'],
    ]);
  });

  it('keeps only q.utoronto.ca links', () => {
    const [lab, midterm] = eventsToDeadlines(parseIcs(FEED), now);
    expect(lab.url).toMatch(/^https:\/\/q\.utoronto\.ca\/calendar/);
    expect(midterm.url).toBe('');
  });

  it('drops events older than the cutoff', () => {
    expect(eventsToDeadlines(parseIcs(FEED), Date.parse('2027-01-01T00:00:00Z'))).toHaveLength(0);
  });
});

describe('test detection', () => {
  const kindOf = (summary: string, uid = 'event-assignment-1') =>
    eventsToDeadlines([{ uid, summary, description: '', url: '', start: '2026-12-01T00:00:00.000Z', allDay: false }], Date.parse('2026-10-20T00:00:00Z'))[0].kind;

  it('tags titles that start with a test word', () => {
    expect(kindOf('Midterm 1 [CSC148H1F 20269]')).toBe('test');
    expect(kindOf('Term Test 2 [MAT137Y1Y 20269]')).toBe('test');
    expect(kindOf('Final Exam [STA130H1F 20269]', 'event-calendar-event-9')).toBe('test');
  });

  it('leaves prep, review and other items that only mention a test', () => {
    expect(kindOf('Prep 6: Midterm Review [CSC148H1F 20269 (All Lectures)]')).toBe('assignment');
    expect(kindOf('Midterm Review Session [CSC148H1F 20269]', 'event-calendar-event-3')).toBe('event');
    expect(kindOf('Writing Assignment One [ENG140Y1Y 20269]')).toBe('assignment');
  });
});

describe('normalizeFeedUrl', () => {
  it('accepts Quercus feed links in the forms students paste', () => {
    const canonical = 'https://q.utoronto.ca/feeds/calendars/user_AbC123xyz.ics';
    expect(normalizeFeedUrl(canonical)).toBe(canonical);
    expect(normalizeFeedUrl('  webcal://q.utoronto.ca/feeds/calendars/user_AbC123xyz.ics ')).toBe(canonical);
    expect(normalizeFeedUrl('http://Q.UTORONTO.CA/feeds/calendars/user_AbC123xyz.ics?x=1')).toBe(canonical);
  });

  it('rejects anything that is not a Quercus feed', () => {
    expect(normalizeFeedUrl('https://evil.com/feeds/calendars/user_a.ics')).toBeNull();
    expect(normalizeFeedUrl('https://q.utoronto.ca.evil.com/feeds/calendars/user_a.ics')).toBeNull();
    expect(normalizeFeedUrl('https://q.utoronto.ca:8080/feeds/calendars/user_a.ics')).toBeNull();
    expect(normalizeFeedUrl('https://user:pw@q.utoronto.ca/feeds/calendars/user_a.ics')).toBeNull();
    expect(normalizeFeedUrl('https://q.utoronto.ca/api/v1/users/self')).toBeNull();
    expect(normalizeFeedUrl('https://q.utoronto.ca/feeds/calendars/../../x.ics')).toBeNull();
    expect(normalizeFeedUrl('not a url')).toBeNull();
  });
});

describe('course matching', () => {
  it('parses UofT codes across campuses', () => {
    expect(parseCourseCode('CSC148H1 F LEC0101 20269:Intro')).toBe('CSC148H1');
    // Real Quercus course names glue the session letter on.
    expect(parseCourseCode('CSC148H1F 20269 (All Lectures)')).toBe('CSC148H1');
    expect(parseCourseCode('MAT137Y1Y 20259')).toBe('MAT137Y1');
    expect(parseCourseCode('CSCA08H3 F LEC01')).toBe('CSCA08H3');
    expect(parseCourseCode('MAT135H5 F')).toBe('MAT135H5');
    expect(parseCourseCode('UofT Libraries Orientation')).toBeNull();
  });

  it('matches by full code first, then by the 6-character base', () => {
    const course = (id: string, code: string) => ({ id, code }) as Course;
    const d = { courseCode: 'CSC148H1' } as Deadline;
    expect(matchCourse(d, [course('a', 'CSC148'), course('b', 'CSC148H1')])?.id).toBe('b');
    expect(matchCourse(d, [course('a', 'csc 148')].map((c) => ({ ...c, code: c.code.toUpperCase() })))?.id).toBe('a');
    expect(matchCourse(d, [course('a', 'CSC108')])).toBeNull();
  });
});

describe('groupDeadlines', () => {
  const now = new Date(2026, 9, 20, 12, 0).getTime(); // local noon
  const at = (id: string, ms: number, kind: Deadline['kind'] = 'assignment') =>
    ({ id, dueAt: new Date(now + ms).toISOString(), kind }) as Deadline;
  const H = 3_600_000;
  const D = 24 * H;

  it('buckets by due time and hides finished or stale past items', () => {
    const items = [
      at('late', -2 * D),
      at('late-done', -1 * D),
      at('ancient', -20 * D),
      at('past-event', -1 * H, 'event'),
      at('tonight', 6 * H),
      at('in3', 3 * D),
      at('in10', 10 * D),
    ];
    const g = groupDeadlines(items, new Set(['late-done']), now);
    expect(g.overdue.map((d) => d.id)).toEqual(['late']);
    expect(g.today.map((d) => d.id)).toEqual(['tonight']);
    expect(g.week.map((d) => d.id)).toEqual(['in3']);
    expect(g.later.map((d) => d.id)).toEqual(['in10']);
  });
});

describe('countDueSoon', () => {
  it('counts unfinished assignments and tests that are overdue or due this week', () => {
    const now = new Date(2026, 9, 20, 12, 0).getTime();
    const at = (id: string, days: number, kind: Deadline['kind'] = 'assignment') =>
      ({ id, dueAt: new Date(now + days * 86_400_000).toISOString(), kind }) as Deadline;
    const link: QuercusLink = {
      feedUrl: 'x',
      syncedAt: '',
      done: ['done'],
      hidden: [],
      deadlines: [at('late', -2), at('done', 1), at('soon', 3, 'test'), at('event', 2, 'event'), at('far', 20)],
    };
    expect(countDueSoon(link, now)).toBe(2);
    expect(countDueSoon(null, now)).toBe(0);
  });
});

describe('applyRefresh', () => {
  it('drops ticks for deadlines no longer in the feed', () => {
    const link: QuercusLink = { feedUrl: 'x', syncedAt: '', deadlines: [], done: ['keep', 'gone'], hidden: [] };
    const next = applyRefresh(link, [{ id: 'keep' } as Deadline], 'now');
    expect(next.done).toEqual(['keep']);
    expect(next.syncedAt).toBe('now');
  });
});

describe('course cards and hiding', () => {
  const now = new Date(2026, 9, 21, 12, 0).getTime(); // Wed Oct 21, local noon
  const D = 86_400_000;
  const course = (id: string, code: string, names: string[] = []) =>
    ({ id, code, assessments: names.map((name, i) => ({ id: `${id}${i}`, name, weight: 10, grade: null, estimate: null })) }) as unknown as Course;
  const dl = (id: string, code: string | null, days: number, kind: Deadline['kind'] = 'assignment', title = id) =>
    ({ id, title, courseCode: code, courseName: code ?? 'UofT Library Orientation', dueAt: new Date(now + days * D).toISOString(), kind }) as Deadline;
  const link = (deadlines: Deadline[], done: string[] = [], hidden: string[] = []): QuercusLink => ({ feedUrl: 'x', syncedAt: '', deadlines, done, hidden });
  const csc = course('c1', 'CSC148', ['Midterm 1']);
  const mat = course('m1', 'MAT137');

  it('picks overdue work first, then the next thing due, per course', () => {
    const l = link([dl('lab4', 'CSC148H1', -2), dl('lab5', 'CSC148H1', 1), dl('ps', 'MAT137Y1', 3), dl('ps0', 'MAT137Y1', -1)], ['ps0']);
    expect(nextDeadlineFor(csc, l, [csc, mat], now)).toMatchObject({ deadline: { id: 'lab4' }, overdue: true });
    expect(nextDeadlineFor(mat, l, [csc, mat], now)).toMatchObject({ deadline: { id: 'ps' }, overdue: false });
    expect(nextDeadlineFor(mat, null, [csc, mat], now)).toBeNull();
  });

  it('lists feed courses and hides the ones the student turns off', () => {
    const l = link([dl('a', 'CSC148H1', 1), dl('b', null, 1), dl('c', 'CSC148H1', 2)]);
    expect(feedCourses(l)).toEqual([
      { key: 'CSC148H1', count: 2, hidden: false },
      { key: 'UofT Library Orientation', count: 1, hidden: false },
    ]);
    const hidden = toggleHidden(l, 'CSC148H1');
    expect(nextDeadlineFor(csc, hidden, [csc], now)).toBeNull();
    expect(countDueSoon(hidden, now)).toBe(1);
    expect(toggleHidden(hidden, 'CSC148H1').hidden).toEqual([]);
  });

  it('flags a week with two tests or five items', () => {
    // Oct 21 is a Wednesday, so this week runs Oct 19 to Oct 25 and next week Oct 26 to Nov 1.
    const calm = link([dl('t1', 'CSC148H1', 1, 'test'), dl('a1', 'MAT137Y1', 2)]);
    expect(findHeavyWeek(calm, now)).toBeNull();
    const busy = link([dl('t1', 'CSC148H1', 6, 'test'), dl('t2', 'MAT137Y1', 7, 'test'), dl('a1', 'MAT137Y1', 8)]);
    const week = findHeavyWeek(busy, now)!;
    expect(week).toMatchObject({ tests: 2, assignments: 1 });
    expect(week.start.getDate()).toBe(26);
    expect(week.end.getDate()).toBe(1);
  });

  it('turns a deadline into an unweighted grade row and spots duplicates', () => {
    const midterm = dl('t1', 'CSC148H1', 2, 'test', 'Midterm 1');
    expect(inGrades(midterm, csc)).toBe(true);
    expect(inGrades(dl('x', 'CSC148H1', 2, 'assignment', 'Lab 6'), csc)).toBe(false);
    expect(assessmentFromDeadline(midterm, 'id1')).toEqual({ id: 'id1', name: 'Midterm 1', weight: 0, grade: null, estimate: null });
  });
});
