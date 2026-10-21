import type { IcsEvent } from './ics';
import { KEYS, readJson, removeKey, writeJson } from './storage';
import type { Assessment, Course } from './types';

/**
 * Quercus (UofT's Canvas) deadlines, read from the student's calendar feed.
 *
 * The feed URL is a private, read-only link (Quercus → Calendar → Calendar
 * Feed). It is kept on this device only; the server route that fetches it is
 * stateless and never stores or logs it.
 */

export const QUERCUS_HOST = 'q.utoronto.ca';

export type DeadlineKind = 'assignment' | 'test' | 'event';

export interface Deadline {
  /** The feed's UID, stable across refreshes. */
  id: string;
  title: string;
  /** Quercus course name, e.g. "CSC148H1 F LEC0101 20259:Introduction to Computer Science". */
  courseName: string;
  /** Parsed UofT code, e.g. "CSC148H1", or null for non-course calendars. */
  courseCode: string | null;
  dueAt: string;
  allDay: boolean;
  kind: DeadlineKind;
  /** Link back to Quercus, or '' when the feed gave none on q.utoronto.ca. */
  url: string;
}

export interface QuercusLink {
  feedUrl: string;
  syncedAt: string;
  deadlines: Deadline[];
  /** Deadline ids the student ticked off. */
  done: string[];
  /** Course keys (see `courseKey`) the student hid from their lists, e.g. orientation modules. */
  hidden: string[];
}

/**
 * Accept what students paste (https/http/webcal, stray spaces) and return the
 * canonical feed URL, or null if it is not a Quercus calendar feed.
 */
export function normalizeFeedUrl(input: string): string | null {
  const trimmed = input.trim().replace(/^webcals?:\/\//i, 'https://');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname.toLowerCase() !== QUERCUS_HOST || (url.port && url.port !== '443')) return null;
  if (url.username || url.password) return null;
  if (!/^\/feeds\/calendars\/[A-Za-z0-9_-]+\.ics$/.test(url.pathname)) return null;
  return `https://${QUERCUS_HOST}${url.pathname}`;
}

// Quercus often appends the session letter: "CSC148H1F", "MAT137Y1Y".
const COURSE_CODE = /\b([A-Z]{3}[A-Z0-9]\d{2}[HY]\d)[FSY]?\b/;
// A test is an item whose title starts with the test word ("Midterm 1", "Term Test 2", "Final Exam"),
// not one that merely mentions it ("Prep 6: Midterm Review").
const TEST_TITLE = /^(mid-?term|term test|test|exam|final exam|final assessment)s?\b/i;
const NOT_A_TEST = /\b(review|prep|practice|solutions?|reflection|survey|sign-?up|seating)\b/i;

/** Canvas puts the course name in brackets at the end of each SUMMARY. */
function splitSummary(summary: string): { title: string; courseName: string } {
  const m = /^(.*?)\s*\[([^\[\]]+)\]\s*$/.exec(summary);
  return m ? { title: m[1] || summary, courseName: m[2].trim() } : { title: summary, courseName: '' };
}

export function parseCourseCode(text: string): string | null {
  return COURSE_CODE.exec(text.toUpperCase())?.[1] ?? null;
}

function safeQuercusUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === QUERCUS_HOST ? url.toString() : '';
  } catch {
    return '';
  }
}

export function eventToDeadline(event: IcsEvent): Deadline | null {
  if (!event.uid || !event.start) return null;
  const { title, courseName } = splitSummary(event.summary);
  const isAssignment = /^event-assignment-/i.test(event.uid);
  const looksLikeTest = TEST_TITLE.test(title.trim()) && !NOT_A_TEST.test(title);
  const kind: DeadlineKind = looksLikeTest ? 'test' : isAssignment ? 'assignment' : 'event';
  return {
    id: event.uid,
    title: title || 'Untitled',
    courseName,
    courseCode: parseCourseCode(courseName),
    dueAt: event.start,
    allDay: event.allDay,
    kind,
    url: safeQuercusUrl(event.url),
  };
}

/** Feed events as deadlines, oldest first, dropping anything older than `keepPastDays`. */
export function eventsToDeadlines(events: IcsEvent[], now = Date.now(), keepPastDays = 30): Deadline[] {
  const cutoff = now - keepPastDays * 86_400_000;
  const seen = new Set<string>();
  const out: Deadline[] = [];
  for (const event of events) {
    const d = eventToDeadline(event);
    if (!d || seen.has(d.id) || Date.parse(d.dueAt) < cutoff) continue;
    seen.add(d.id);
    out.push(d);
  }
  return out.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

/** "CSC148H1", "csc148", "CSC 148" all share the base "CSC148". */
function codeBase(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase().slice(0, 6);
}

/** The student's MySemester course for a deadline, matched by course code. */
export function matchCourse(deadline: Deadline, courses: Course[]): Course | null {
  if (!deadline.courseCode) return null;
  const full = deadline.courseCode;
  const base = codeBase(full);
  return (
    courses.find((c) => c.code.replace(/\s+/g, '') === full) ??
    courses.find((c) => codeBase(c.code) === base) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Courses in the feed, and hiding the ones that aren't real classes.

/** Groups a deadline by course: the parsed code when there is one, else the Quercus course name. */
export function courseKey(d: Deadline): string {
  return d.courseCode ?? (d.courseName || 'Other');
}

/** Deadlines from courses the student hasn't hidden. */
export function visibleDeadlines(link: QuercusLink): Deadline[] {
  const hidden = new Set(link.hidden);
  return link.deadlines.filter((d) => !hidden.has(courseKey(d)));
}

export interface FeedCourse {
  key: string;
  count: number;
  hidden: boolean;
}

/** Every course that appears in the feed, for the show/hide menu. */
export function feedCourses(link: QuercusLink): FeedCourse[] {
  const counts = new Map<string, number>();
  for (const d of link.deadlines) counts.set(courseKey(d), (counts.get(courseKey(d)) ?? 0) + 1);
  const hidden = new Set(link.hidden);
  return [...counts]
    .map(([key, count]) => ({ key, count, hidden: hidden.has(key) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function toggleHidden(link: QuercusLink, key: string): QuercusLink {
  return { ...link, hidden: link.hidden.includes(key) ? link.hidden.filter((k) => k !== key) : [...link.hidden, key] };
}

// ---------------------------------------------------------------------------
// Grouping for the Upcoming panel.

export type Bucket = 'overdue' | 'today' | 'week' | 'later';

export interface DeadlineGroups {
  overdue: Deadline[];
  today: Deadline[];
  week: Deadline[];
  later: Deadline[];
}

function endOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Overdue holds unfinished assignments and tests from the last two weeks;
 * past calendar events simply drop off.
 */
export function groupDeadlines(deadlines: Deadline[], done: ReadonlySet<string>, now = Date.now()): DeadlineGroups {
  const groups: DeadlineGroups = { overdue: [], today: [], week: [], later: [] };
  const todayEnd = endOfLocalDay(now);
  const weekEnd = todayEnd + 7 * 86_400_000;
  const overdueFrom = now - 14 * 86_400_000;
  for (const d of deadlines) {
    const due = Date.parse(d.dueAt);
    if (due < now) {
      if (d.kind !== 'event' && due >= overdueFrom && !done.has(d.id)) groups.overdue.push(d);
    } else if (due <= todayEnd) groups.today.push(d);
    else if (due <= weekEnd) groups.week.push(d);
    else groups.later.push(d);
  }
  return groups;
}

/** How many unfinished items are overdue or due within a week (the Deadlines tab badge). */
export function countDueSoon(link: QuercusLink | null, now = Date.now()): number {
  if (!link) return 0;
  const done = new Set(link.done);
  const g = groupDeadlines(visibleDeadlines(link), done, now);
  return [...g.overdue, ...g.today, ...g.week].filter((d) => d.kind !== 'event' && !done.has(d.id)).length;
}

export interface NextDeadline {
  deadline: Deadline;
  overdue: boolean;
  /** "in 3 days" / "2 days ago", as of when this was computed. */
  when: string;
}

/**
 * What a course card shows: its most pressing unfinished item. Overdue work
 * (from the last two weeks) comes first, then the next thing due.
 */
export function nextDeadlineFor(course: Course, link: QuercusLink | null, courses: Course[], now = Date.now()): NextDeadline | null {
  if (!link) return null;
  const done = new Set(link.done);
  const mine = visibleDeadlines(link).filter((d) => d.kind !== 'event' && !done.has(d.id) && matchCourse(d, courses)?.id === course.id);
  const g = groupDeadlines(mine, done, now);
  const latestOverdue = g.overdue[g.overdue.length - 1];
  const pick = latestOverdue ?? g.today[0] ?? g.week[0] ?? g.later[0];
  return pick ? { deadline: pick, overdue: pick === latestOverdue, when: relativeDue(Date.parse(pick.dueAt), now) } : null;
}

/** Unfinished deadlines for one course, overdue first, for the grade page. */
export function courseDeadlines(course: Course, link: QuercusLink | null, courses: Course[], now = Date.now()): NextDeadline[] {
  if (!link) return [];
  const done = new Set(link.done);
  const mine = visibleDeadlines(link).filter((d) => !done.has(d.id) && matchCourse(d, courses)?.id === course.id);
  const g = groupDeadlines(mine, done, now);
  const when = (d: Deadline) => relativeDue(Date.parse(d.dueAt), now);
  return [
    ...g.overdue.map((deadline) => ({ deadline, overdue: true, when: when(deadline) })),
    ...[...g.today, ...g.week, ...g.later].map((deadline) => ({ deadline, overdue: false, when: when(deadline) })),
  ];
}

export interface HeavyWeek {
  /** Monday 00:00 local time. */
  start: Date;
  /** Sunday of the same week. */
  end: Date;
  tests: number;
  assignments: number;
}

/** Thresholds for "heavy": two or more tests, or five or more items in one week. */
const HEAVY_TESTS = 2;
const HEAVY_ITEMS = 5;

/** The first of the next three calendar weeks (Mon–Sun) with a heavy load, if any. */
export function findHeavyWeek(link: QuercusLink | null, now = Date.now()): HeavyWeek | null {
  if (!link) return null;
  const done = new Set(link.done);
  const items = visibleDeadlines(link).filter((d) => d.kind !== 'event' && !done.has(d.id));
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let w = 0; w < 3; w++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + w * 7);
    const next = new Date(start);
    next.setDate(start.getDate() + 7);
    const inWeek = items.filter((d) => {
      const due = Date.parse(d.dueAt);
      return due >= Math.max(start.getTime(), now) && due < next.getTime();
    });
    const tests = inWeek.filter((d) => d.kind === 'test').length;
    if (tests >= HEAVY_TESTS || inWeek.length >= HEAVY_ITEMS) {
      const end = new Date(next);
      end.setDate(next.getDate() - 1);
      return { start, end, tests, assignments: inWeek.length - tests };
    }
  }
  return null;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today, 4:49 PM", "Tomorrow", "Fri, Oct 23, 11:59 PM" (all-day items drop the time). */
export function dueLabel(d: Deadline, now: number): string {
  const due = new Date(d.dueAt);
  const day = sameDay(due, new Date(now))
    ? 'Today'
    : sameDay(due, new Date(now + 86_400_000))
      ? 'Tomorrow'
      : due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (d.allDay) return day;
  return `${day}, ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/** "in 3 days", "5 hrs ago". */
export function relativeDue(due: number, now: number): string {
  const diff = due - now;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < 3_600_000) text = `${Math.max(1, Math.round(abs / 60_000))} min`;
  else if (abs < 86_400_000) {
    const hrs = Math.round(abs / 3_600_000);
    text = `${hrs} hr${hrs === 1 ? '' : 's'}`;
  } else {
    const days = Math.round(abs / 86_400_000);
    text = `${days} day${days === 1 ? '' : 's'}`;
  }
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

// ---------------------------------------------------------------------------
// Deadlines → grade rows.

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** True when the course already has an assessment with this deadline's name. */
export function inGrades(deadline: Deadline, course: Course): boolean {
  return course.assessments.some((a) => sameName(a.name, deadline.title));
}

/** A new, unweighted grade row named after the deadline; the student fills in the weight. */
export function assessmentFromDeadline(deadline: Deadline, id: string): Assessment {
  return { id, name: deadline.title.slice(0, 80), weight: 0, grade: null, estimate: null };
}

// ---------------------------------------------------------------------------
// Device storage.

function normalizeLink(raw: unknown): QuercusLink | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const feedUrl = normalizeFeedUrl(typeof r.feedUrl === 'string' ? r.feedUrl : '');
  if (!feedUrl) return null;
  const deadlines = Array.isArray(r.deadlines)
    ? r.deadlines.filter(
        (d): d is Deadline =>
          !!d && typeof d === 'object' && typeof (d as Deadline).id === 'string' && Number.isFinite(Date.parse((d as Deadline).dueAt)),
      )
    : [];
  return {
    feedUrl,
    syncedAt: typeof r.syncedAt === 'string' ? r.syncedAt : '',
    deadlines,
    done: Array.isArray(r.done) ? r.done.filter((x): x is string => typeof x === 'string') : [],
    hidden: Array.isArray(r.hidden) ? r.hidden.filter((x): x is string => typeof x === 'string') : [],
  };
}

export function readQuercusLink(user: string): QuercusLink | null {
  return normalizeLink(readJson<unknown>(KEYS.quercus(user)));
}

export function writeQuercusLink(user: string, link: QuercusLink | null): void {
  if (link) writeJson(KEYS.quercus(user), link);
  else removeKey(KEYS.quercus(user));
}

/** Replace the deadlines with a fresh fetch, keeping ticks only for items still in the feed. */
export function applyRefresh(link: QuercusLink, deadlines: Deadline[], syncedAt: string): QuercusLink {
  const ids = new Set(deadlines.map((d) => d.id));
  return { ...link, deadlines, syncedAt, done: link.done.filter((id) => ids.has(id)) };
}

export function toggleDone(link: QuercusLink, id: string): QuercusLink {
  return { ...link, done: link.done.includes(id) ? link.done.filter((x) => x !== id) : [...link.done, id] };
}

/** Ask our server route to fetch and parse the feed (Quercus blocks direct browser requests). */
export async function fetchDeadlines(feedUrl: string): Promise<Deadline[]> {
  const res = await fetch('/api/quercus/feed/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: feedUrl }),
  });
  const body = (await res.json().catch(() => null)) as { deadlines?: Deadline[]; error?: string } | null;
  if (!res.ok || !body?.deadlines) throw new Error(body?.error || "Couldn't reach Quercus. Try again in a moment.");
  return body.deadlines;
}
