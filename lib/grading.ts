import { GPA_SCALES, type GpaScale } from './gpa-scales';
import type { Assessment, Course } from './types';

export const UNIVERSITIES = [
  'University of Toronto',
  'University of British Columbia',
  'McGill University',
  'University of Waterloo',
  'University of Alberta',
  'McMaster University',
  'University of Ottawa',
  'York University',
] as const;

export interface UniversityRules {
  university: string;
  showGpa: boolean;
  showLetter: boolean;
  creditAllowed: boolean;
  /** Pass/fail option name, e.g. "CR/NCR". Empty when not offered. */
  creditLabel: string;
  /** Top of the GPA scale (4, 9, 10, 12), or null when the school has no GPA points. */
  gpaScale: number | null;
  /** The scale's name from the reference, e.g. "4.0" or "12-point". */
  scaleLabel: string;
}

interface Band {
  letter: string;
  /** Lowest percentage that earns this letter. */
  min: number;
  points: number | null;
}

interface SchoolScale {
  type: string;
  bands: Band[];
  letters: boolean;
}

const minOf = (percent?: string | null): number | null => {
  const m = percent?.match(/^\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

const pointsOf = (points?: string | null): number | null => (points == null || points === '' ? null : Number(points));

const UOFT_REF = GPA_SCALES.find((s) => s.name === 'University of Toronto')!;

/**
 * Letter bands for a school, built from the reference table on the GPA scales
 * page so the calculator and that page can never disagree. Schools that list
 * points but no percentages (Alberta) borrow UofT's percentage cut-offs, with
 * letters they do not use folded onto the nearest one they do (D- onto D).
 */
function buildScale(ref: GpaScale): SchoolScale {
  const own = ref.mappings.map((m) => ({ letter: m.letter, min: minOf(m.percent), points: pointsOf(m.points) }));
  let bands: Band[];
  if (own.every((b) => b.min != null)) {
    bands = own.map((b) => ({ ...b, min: b.min as number }));
  } else {
    const have = new Map(own.map((b) => [b.letter, b]));
    const mins = new Map<string, number>();
    for (const u of UOFT_REF.mappings) {
      const target = have.has(u.letter) ? u.letter : have.has(u.letter[0]) ? u.letter[0] : 'F';
      const min = minOf(u.percent) ?? 0;
      mins.set(target, Math.min(mins.get(target) ?? Infinity, min));
    }
    bands = own.filter((b) => mins.has(b.letter)).map((b) => ({ ...b, min: mins.get(b.letter)! }));
  }
  bands.sort((a, b) => b.min - a.min);
  bands[bands.length - 1] = { ...bands[bands.length - 1], min: 0 };
  return { type: ref.scaleType, bands, letters: ref.reportsLetters !== false };
}

const SCALES = new Map(GPA_SCALES.map((ref) => [ref.name, buildScale(ref)]));
const UOFT = SCALES.get('University of Toronto')!;

/** A school's scale, or UofT's for schools the reference does not list. */
function scaleFor(school: string): SchoolScale {
  return SCALES.get(school) ?? UOFT;
}

function bandFor(p: number, scale: SchoolScale): Band {
  return scale.bands.find((b) => p >= b.min) ?? scale.bands[scale.bands.length - 1];
}

const CREDIT: Record<string, string> = {
  'University of Toronto': 'CR/NCR',
  'University of British Columbia': 'CR/D/F',
  'McGill University': 'S/U',
};

export function getUniversityRules(university = ''): UniversityRules {
  const scale = scaleFor(university);
  const points = scale.bands.map((b) => b.points).filter((x): x is number => x != null);
  return {
    university,
    showGpa: points.length > 0,
    showLetter: scale.letters,
    creditAllowed: university in CREDIT,
    creditLabel: CREDIT[university] ?? '',
    gpaScale: points.length ? Math.max(...points) : null,
    scaleLabel: scale.type,
  };
}

/** UofT's letter for a percentage (the scale used when no school is set). */
export function letterFromPct(p: number): string {
  return bandFor(p, UOFT).letter;
}

/** The letter a school gives for a percentage, from its own cut-offs. */
export function letterForSchool(p: number, school: string): string {
  return bandFor(p, scaleFor(school)).letter;
}

/**
 * GPA points for a percentage on the school's own scale (12 at McMaster for
 * an A+, 9 at York). Schools without GPA points use UofT's 4.0 table rather
 * than reporting 0.00; the dashboard hides GPA for them anyway.
 */
export function gpaFromPct(p: number, school: string): number {
  return bandFor(p, scaleFor(school)).points ?? bandFor(p, UOFT).points ?? 0;
}

/** True for letters the grade page shows in red. */
export function isLowLetter(letter: string): boolean {
  return /^[CDEF]/.test(letter);
}

/** Weighted average over graded rows, or null when nothing weighted is graded. */
export function assessmentAverage(assessments: Assessment[]): number | null {
  let weighted = 0;
  let weight = 0;
  for (const a of assessments) {
    if (a.grade == null || !Number.isFinite(a.grade)) continue;
    const w = Number.isFinite(a.weight) ? a.weight : 0;
    weighted += a.grade * w;
    weight += w;
  }
  return weight > 0 ? weighted / weight : null;
}

export function totalWeight(assessments: Assessment[]): number {
  return assessments.reduce((sum, a) => sum + (Number.isFinite(a.weight) ? a.weight : 0), 0);
}

/**
 * The grade shown for a course: computed from assessments once any exist,
 * otherwise the grade entered when the course was created.
 */
export function courseGrade(course: Course): number | null {
  if (course.assessments.length > 0) return assessmentAverage(course.assessments);
  return course.grade;
}

/**
 * True once a course has its final mark: every assessment graded and the
 * weights adding up to 100%, or a grade entered with no assessments.
 */
export function isCourseFinished(course: Course): boolean {
  if (course.assessments.length === 0) return course.grade != null;
  return course.assessments.every((a) => a.grade != null) && totalWeight(course.assessments) >= 99.5;
}

/**
 * Average needed on every ungraded row to finish at `goal`, clamped to
 * 0–100 and rounded to 2 decimals. Null when nothing is left to grade.
 */
export function neededAverage(assessments: Assessment[], goal: number): number | null {
  let weightedTotal = 0;
  let completedWeight = 0;
  let remainingWeight = 0;
  for (const a of assessments) {
    const w = Number.isFinite(a.weight) ? a.weight : 0;
    if (a.grade != null && Number.isFinite(a.grade)) {
      weightedTotal += a.grade * w;
      completedWeight += w;
    } else {
      remainingWeight += w;
    }
  }
  if (remainingWeight <= 0) return null;
  const needed = (goal * (completedWeight + remainingWeight) - weightedTotal) / remainingWeight;
  return Math.max(0, Math.min(100, Math.round(needed * 100) / 100));
}

/** Fill every ungraded row's estimate with the average needed to reach `goal`. */
export function applyEstimates(assessments: Assessment[], goal: number): Assessment[] {
  const needed = neededAverage(assessments, goal);
  if (needed == null) return assessments;
  return assessments.map((a) => (a.grade == null ? { ...a, estimate: needed } : a));
}

export interface Overview {
  average: number;
  gpa: number;
  letter: string;
}

/** Semester summary over courses that count toward GPA (pass/fail courses excluded). */
export function semesterOverview(courses: Course[], rules: UniversityRules): Overview | null {
  const grades = courses
    .filter((c) => !(rules.creditAllowed && c.crncr))
    .map(courseGrade)
    .filter((g): g is number => g != null && Number.isFinite(g));
  if (!grades.length) return null;
  const average = grades.reduce((s, g) => s + g, 0) / grades.length;
  return {
    average,
    gpa: gpaFromPct(average, rules.university),
    letter: letterForSchool(average, rules.university),
  };
}
