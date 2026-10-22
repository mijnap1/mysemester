/**
 * Who teaches each lecture section of a UofT St. George course, from the
 * public data UofT's Timetable Builder (ttb.utoronto.ca) runs on.
 *
 * Ratings are deliberately not copied here: Rate My Professors' terms forbid
 * automated access and republishing its content, so each instructor gets a
 * link to their RMP search results instead.
 */

export const TTB_API = 'https://api.easi.utoronto.ca/ttb/getCoursesByCodeAndSectionCode';
export const TTB_SITE = 'https://ttb.utoronto.ca/';
/** Rate My Professors' id for "University of Toronto - St. George Campus". */
const RMP_SCHOOL_ST_GEORGE = 1484;

export interface Meeting {
  /** "Mon" … "Fri". */
  day: string;
  /** "9:00 AM". */
  start: string;
  end: string;
}

export interface LectureSection {
  /** "LEC0101". */
  name: string;
  instructors: string[];
  meetings: Meeting[];
  /** "In person", "Online (live)", … */
  mode: string;
  enrolled: number | null;
  capacity: number | null;
}

export interface Offering {
  /** "CSC148H1". */
  code: string;
  title: string;
  /** "F", "S" or "Y". */
  term: string;
  /** "Fall 2026", "Winter 2027", "Fall–Winter 2026–27". */
  termLabel: string;
  lectures: LectureSection[];
}

export interface CourseTimetable {
  code: string;
  title: string;
  offerings: Offering[];
  /** ISO time the data was fetched from Timetable Builder. */
  fetchedAt: string;
}

// ---------------------------------------------------------------------------

/** "csc 148", "CSC148H1" → "CSC148" or "CSC148H1"; null if it isn't a course code. */
export function normalizeCourseQuery(input: string): string | null {
  const q = input.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{3}[A-Z0-9]\d{2}([HY][1])?$/.test(q) ? q : null;
}

/** Full St. George codes to look up: an exact code as given, or both half- and full-year versions. */
export function candidateCodes(query: string): string[] {
  return query.length === 8 ? [query] : [`${query}H1`, `${query}Y1`];
}

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MODES: Record<string, string> = {
  INPER: 'In person',
  SYNC: 'Online (live)',
  ASYNC: 'Online (recorded)',
  SYNIF: 'Online (live), in-person tests',
  ASYIF: 'Online (recorded), in-person tests',
  HYBR: 'Hybrid',
};

function clock(millisOfDay: number): string {
  const minutes = Math.round(millisOfDay / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "20269" → Fall 2026, "20271" → Winter 2027, "20265" → Summer 2026. */
function sessionLabel(code: string): string {
  const year = code.slice(0, 4);
  const month = code.slice(4);
  return `${month === '9' ? 'Fall' : month === '1' ? 'Winter' : 'Summer'} ${year}`;
}

function termLabel(sessions: string[]): string {
  const sorted = [...sessions].sort();
  if (sorted.length < 2) return sessionLabel(sorted[0] ?? '');
  const [a, b] = [sessionLabel(sorted[0]), sessionLabel(sorted[sorted.length - 1])];
  const [seasonA, yearA] = a.split(' ');
  const [seasonB, yearB] = b.split(' ');
  return `${seasonA}–${seasonB} ${yearA}–${yearB.slice(2)}`;
}

const asString = (v: unknown) => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Turn a Timetable Builder response into offerings with their lecture sections, sorted for display. */
export function parseTimetable(json: unknown): Offering[] {
  const courses = asArray(asObject(asObject(asObject(json).payload).pageableCourse).courses);
  const offerings: Offering[] = [];
  for (const raw of courses) {
    const c = asObject(raw);
    if (asString(c.cancelInd) === 'Y') continue;
    const lectures: LectureSection[] = [];
    for (const rawSection of asArray(c.sections)) {
      const s = asObject(rawSection);
      if (asString(s.teachMethod) !== 'LEC' || asString(s.cancelInd) === 'Y') continue;
      const instructors = asArray(s.instructors)
        .map((i) => `${asString(asObject(i).firstName)} ${asString(asObject(i).lastName)}`.trim())
        .filter(Boolean);
      const meetings = asArray(s.meetingTimes)
        .map((m) => {
          const start = asObject(asObject(m).start);
          const end = asObject(asObject(m).end);
          const day = asNumber(start.day);
          const from = asNumber(start.millisofday);
          const to = asNumber(end.millisofday);
          return day && from !== null && to !== null ? { day: DAYS[day] ?? '', start: clock(from), end: clock(to), sort: day * 1e8 + from } : null;
        })
        .filter((m): m is Meeting & { sort: number } => !!m && !!m.day)
        .sort((a, b) => a.sort - b.sort)
        .map(({ day, start, end }) => ({ day, start, end }));
      const modes = asArray(s.deliveryModes).map((d) => asString(asObject(d).mode));
      lectures.push({
        name: asString(s.name),
        instructors: [...new Set(instructors)],
        meetings,
        mode: MODES[modes[0]] ?? (modes[0] || 'Not listed'),
        enrolled: asNumber(s.currentEnrolment),
        capacity: asNumber(s.maxEnrolment),
      });
    }
    lectures.sort((a, b) => a.name.localeCompare(b.name));
    const sessions = asArray(c.sessions).map(asString).filter(Boolean);
    offerings.push({
      code: asString(c.code),
      title: asString(c.name),
      term: asString(c.sectionCode),
      termLabel: termLabel(sessions),
      lectures,
    });
  }
  const order: Record<string, number> = { F: 0, Y: 1, S: 2 };
  return offerings.sort((a, b) => (order[a.term] ?? 9) - (order[b.term] ?? 9) || a.code.localeCompare(b.code));
}

export interface InstructorGroup {
  /** Instructor name, or null for sections without one yet. */
  name: string | null;
  sections: LectureSection[];
}

/** One card per instructor in an offering; sections without an instructor are grouped last. */
export function groupByInstructor(offering: Offering): InstructorGroup[] {
  const groups = new Map<string | null, LectureSection[]>();
  for (const lecture of offering.lectures) {
    const names = lecture.instructors.length ? lecture.instructors : [null];
    for (const name of names) groups.set(name, [...(groups.get(name) ?? []), lecture]);
  }
  return [...groups]
    .map(([name, sections]) => ({ name, sections }))
    .sort((a, b) => (a.name === null ? 1 : 0) - (b.name === null ? 1 : 0) || (a.name ?? '').localeCompare(b.name ?? ''));
}

/** A link to the instructor's Rate My Professors search results at St. George. */
export function rmpSearchUrl(name: string): string {
  return `https://www.ratemyprofessors.com/search/professors/${RMP_SCHOOL_ST_GEORGE}?q=${encodeURIComponent(name)}`;
}

/** "Mon 10:00 AM–11:00 AM" collapsed to "Mon 10–11 AM" where possible. */
export function meetingLabel(m: Meeting): string {
  const [sTime, sPeriod] = m.start.split(' ');
  const [eTime, ePeriod] = m.end.split(' ');
  const trim = (t: string) => t.replace(/:00$/, '');
  return sPeriod === ePeriod ? `${m.day} ${trim(sTime)}–${trim(eTime)} ${ePeriod}` : `${m.day} ${trim(sTime)} ${sPeriod}–${trim(eTime)} ${ePeriod}`;
}
