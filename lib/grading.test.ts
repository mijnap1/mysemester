import { describe, expect, it } from 'vitest';
import {
  applyEstimates,
  assessmentAverage,
  courseGrade,
  getUniversityRules,
  gpaFromPct,
  isCourseFinished,
  isLowLetter,
  letterForSchool,
  letterFromPct,
  neededAverage,
  semesterOverview,
  UNIVERSITIES,
} from './grading';
import { GPA_SCALES } from './gpa-scales';
import type { Assessment, Course } from './types';

const row = (weight: number, grade: number | null): Assessment => ({ id: 'r', name: 'x', weight, grade, estimate: null });

const course = (overrides: Partial<Course> = {}): Course => ({
  id: 'id',
  code: 'CSC108',
  title: '',
  icon: 'book-outline',
  grade: null,
  crncr: false,
  folderId: null,
  assessments: [],
  updatedAt: '',
  ...overrides,
});

describe('letters and GPA', () => {
  it('maps percentage boundaries to letters', () => {
    expect(letterFromPct(90)).toBe('A+');
    expect(letterFromPct(84.99)).toBe('A-');
    expect(letterFromPct(73)).toBe('B');
    expect(letterFromPct(49.9)).toBe('F');
  });

  // One row per school: [percent, letter, points], straight from its reference table.
  const cases: Record<string, [number, string, number][]> = {
    'University of Toronto': [[92, 'A+', 4.0], [86, 'A', 4.0], [82, 'A-', 3.7], [78, 'B+', 3.3], [51, 'D-', 0.7], [40, 'F', 0]],
    'McMaster University': [[92, 'A+', 12], [86, 'A', 11], [80, 'A-', 10], [78, 'B+', 9], [51, 'D-', 1], [49, 'F', 0]],
    'York University': [[95, 'A+', 9], [80, 'A', 8], [79, 'B+', 7], [72, 'B', 6], [45, 'E', 1], [39, 'F', 0]],
    'University of Ottawa': [[90, 'A+', 10], [86, 'A', 9], [75, 'B+', 7], [71, 'B', 6], [62, 'C', 4], [45, 'E', 1]],
    'McGill University': [[95, 'A', 4.0], [82, 'A-', 3.7], [77, 'B+', 3.3], [66, 'B-', 2.7], [57, 'C', 2.0], [52, 'D', 1.0]],
    'University of Alberta': [[92, 'A+', 4.0], [86, 'A', 4.0], [61, 'C-', 1.7], [51, 'D', 1.0], [45, 'F', 0]],
  };
  for (const [school, rows] of Object.entries(cases)) {
    it(`uses ${school}'s own cut-offs and points`, () => {
      for (const [pct, letter, points] of rows) {
        expect(letterForSchool(pct, school), `${pct}%`).toBe(letter);
        expect(gpaFromPct(pct, school), `${pct}%`).toBe(points);
      }
    });
  }

  it("uses UBC's own letter cut-offs, which differ from UofT's", () => {
    expect(letterForSchool(76, 'University of British Columbia')).toBe('B+');
    expect(letterForSchool(72, 'University of British Columbia')).toBe('B');
    expect(letterForSchool(56, 'University of British Columbia')).toBe('C-');
    expect(letterForSchool(51, 'University of British Columbia')).toBe('D');
  });

  it('labels and tops each GPA scale like the reference page', () => {
    expect(getUniversityRules('McMaster University')).toMatchObject({ showGpa: true, gpaScale: 12, scaleLabel: '12-point' });
    expect(getUniversityRules('York University')).toMatchObject({ showGpa: true, gpaScale: 9, scaleLabel: '9-point' });
    expect(getUniversityRules('University of Ottawa')).toMatchObject({ showGpa: true, gpaScale: 10, scaleLabel: '10-point' });
    expect(getUniversityRules('University of Toronto')).toMatchObject({ showGpa: true, gpaScale: 4, scaleLabel: '4.0' });
  });

  it('hides GPA where the school defines no points, and letters where it reports numbers', () => {
    expect(getUniversityRules('University of British Columbia')).toMatchObject({ showGpa: false, showLetter: true, gpaScale: null });
    expect(getUniversityRules('University of Waterloo')).toMatchObject({ showGpa: false, showLetter: false, gpaScale: null });
  });

  it('keeps pass/fail options per school', () => {
    expect(getUniversityRules('University of Toronto').creditLabel).toBe('CR/NCR');
    expect(getUniversityRules('University of British Columbia').creditLabel).toBe('CR/D/F');
    expect(getUniversityRules('McGill University').creditLabel).toBe('S/U');
    expect(getUniversityRules('York University').creditAllowed).toBe(false);
  });

  it('has a reference scale covering 0–100 for every school in the picker', () => {
    for (const school of UNIVERSITIES) {
      expect(GPA_SCALES.some((s) => s.name === school), school).toBe(true);
      expect(letterForSchool(0, school), school).toMatch(/^[EF]/);
      expect(letterForSchool(100, school), school).toMatch(/^A/);
    }
  });

  it('falls back to the UofT 4.0 table instead of 0.00 for an unknown school', () => {
    expect(gpaFromPct(86, '')).toBe(4.0);
    expect(getUniversityRules('')).toMatchObject({ showGpa: true, showLetter: true, scaleLabel: '4.0' });
  });

  it('flags C, D, E and every F as low', () => {
    for (const l of ['C+', 'D-', 'E', 'F', 'F+', 'F-']) expect(isLowLetter(l), l).toBe(true);
    for (const l of ['A', 'B-']) expect(isLowLetter(l), l).toBe(false);
  });
});

describe('course averages', () => {
  it('weights graded rows only', () => {
    expect(assessmentAverage([row(20, 80), row(30, 90), row(50, null)])).toBeCloseTo(86);
  });

  it('is null when nothing is graded', () => {
    expect(assessmentAverage([row(50, null)])).toBeNull();
    expect(assessmentAverage([])).toBeNull();
  });

  it('prefers assessments over the initial grade once any exist', () => {
    expect(courseGrade(course({ grade: 70 }))).toBe(70);
    expect(courseGrade(course({ grade: 70, assessments: [row(100, 90)] }))).toBe(90);
    expect(courseGrade(course({ grade: 70, assessments: [row(100, null)] }))).toBeNull();
  });

  it('counts a course as finished once its final mark is in', () => {
    expect(isCourseFinished(course({ grade: 82 }))).toBe(true);
    expect(isCourseFinished(course())).toBe(false);
    expect(isCourseFinished(course({ assessments: [row(40, 80), row(60, 75)] }))).toBe(true);
    expect(isCourseFinished(course({ assessments: [row(40, 80), row(60, null)] }))).toBe(false);
    expect(isCourseFinished(course({ assessments: [row(40, 80), row(30, 75)] }))).toBe(false);
  });
});

describe('estimates', () => {
  it('finds the average needed on remaining work', () => {
    // 40% done at 70; need 85 overall → (85*100 - 70*40) / 60 = 95
    expect(neededAverage([row(40, 70), row(60, null)], 85)).toBe(95);
  });

  it('clamps to 0–100 and returns null when nothing remains', () => {
    expect(neededAverage([row(90, 20), row(10, null)], 85)).toBe(100);
    expect(neededAverage([row(100, 90)], 85)).toBeNull();
  });

  it('only fills ungraded rows', () => {
    const result = applyEstimates([row(40, 70), row(60, null)], 85);
    expect(result[0].estimate).toBeNull();
    expect(result[1].estimate).toBe(95);
  });
});

describe('semester overview', () => {
  it('excludes pass/fail courses where the school allows them', () => {
    const rules = getUniversityRules('University of Toronto');
    const overview = semesterOverview(
      [course({ grade: 90 }), course({ grade: 50, crncr: true }), course({ grade: null })],
      rules,
    );
    expect(overview).toEqual({ average: 90, gpa: 4.0, letter: 'A+' });
  });

  it('is null with no graded courses', () => {
    expect(semesterOverview([course()], getUniversityRules(''))).toBeNull();
  });
});
