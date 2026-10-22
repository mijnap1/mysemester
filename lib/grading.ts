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
  gpaScale: number | null;
}

export function getUniversityRules(university = ''): UniversityRules {
  const base: UniversityRules = {
    university,
    showGpa: true,
    showLetter: true,
    creditAllowed: false,
    creditLabel: '',
    gpaScale: 4.0,
  };
  switch (university) {
    case 'University of Toronto':
      return { ...base, creditAllowed: true, creditLabel: 'CR/NCR' };
    case 'University of British Columbia':
      return { ...base, creditAllowed: true, creditLabel: 'CR/D/F' };
    case 'McGill University':
      return { ...base, creditAllowed: true, creditLabel: 'S/U' };
    case 'University of Waterloo':
      return { ...base, showGpa: false, showLetter: false, gpaScale: null };
    case 'University of Ottawa':
      return { ...base, gpaScale: 10 };
    default:
      return base;
  }
}

const UOFT_SCALE: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, 'D-': 0.7,
  F: 0.0,
};

const GPA_MAPS: Record<string, Record<string, number>> = {
  'University of Toronto': UOFT_SCALE,
  'University of British Columbia': {
    'A+': 4.0, A: 4.0, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7,
    D: 1.0,
    F: 0.0,
  },
  'McGill University': {
    A: 4.0, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0,
    D: 1.0,
    F: 0.0,
  },
  'McMaster University': {
    'A+': 4.0, A: 3.9, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7,
    'D+': 1.3, D: 1.0,
    F: 0.0,
  },
  'University of Ottawa': {
    'A+': 10, A: 9, 'A-': 8,
    'B+': 7, B: 6,
    'C+': 5, C: 4,
    'D+': 3, D: 2,
    E: 1,
    F: 0,
  },
  'University of Alberta': {
    'A+': 4.0, A: 4.0, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7,
    'D+': 1.3, D: 1.0,
    F: 0.0,
  },
};

export function letterFromPct(p: number): string {
  if (p >= 90) return 'A+';
  if (p >= 85) return 'A';
  if (p >= 80) return 'A-';
  if (p >= 77) return 'B+';
  if (p >= 73) return 'B';
  if (p >= 70) return 'B-';
  if (p >= 67) return 'C+';
  if (p >= 63) return 'C';
  if (p >= 60) return 'C-';
  if (p >= 57) return 'D+';
  if (p >= 53) return 'D';
  if (p >= 50) return 'D-';
  return 'F';
}

/** Collapse letters a school does not use onto the nearest one it does. */
export function letterForSchool(p: number, school: string): string {
  const letter = letterFromPct(p);
  if (school === 'McGill University') {
    if (letter === 'A+') return 'A';
    if (letter === 'D+' || letter === 'D-') return 'D';
    if (letter === 'C-') return 'C';
  }
  if (school === 'University of British Columbia') {
    if (letter === 'D+' || letter === 'D-') return 'D';
  }
  if (school === 'McMaster University') {
    if (letter === 'D-') return 'D';
  }
  if (school === 'University of Ottawa') {
    if (letter === 'B-') return 'B';
    if (letter === 'C-') return 'C';
    if (letter === 'D-') return 'D';
  }
  return letter;
}

/**
 * GPA points for a percentage. Schools without their own table use the
 * UofT 4.0 table rather than reporting 0.00.
 */
export function gpaFromPct(p: number, school: string): number {
  const map = GPA_MAPS[school] ?? UOFT_SCALE;
  const letter = letterForSchool(p, school);
  if (letter in map) return map[letter];
  const base = letter.slice(0, -1);
  if (base in map) return map[base];
  return map.F ?? 0;
}

/** True for letters the grade page shows in red. */
export function isLowLetter(letter: string): boolean {
  return letter.startsWith('C') || letter.startsWith('D') || letter === 'E' || letter === 'F';
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
