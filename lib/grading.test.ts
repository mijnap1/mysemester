import { describe, expect, it } from 'vitest';
import {
  applyEstimates,
  assessmentAverage,
  courseGrade,
  getUniversityRules,
  gpaFromPct,
  letterForSchool,
  letterFromPct,
  neededAverage,
  semesterOverview,
} from './grading';
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

  it('collapses letters a school does not use', () => {
    expect(letterForSchool(92, 'McGill University')).toBe('A');
    expect(letterForSchool(71, 'University of Ottawa')).toBe('B');
  });

  it('uses each school table', () => {
    expect(gpaFromPct(86, 'University of Toronto')).toBe(4.0);
    expect(gpaFromPct(86, 'McMaster University')).toBe(3.9);
    expect(gpaFromPct(86, 'University of Ottawa')).toBe(9);
    expect(gpaFromPct(51, 'University of British Columbia')).toBe(1.0);
  });

  it('falls back to the 4.0 table instead of 0.00 for schools without one', () => {
    expect(gpaFromPct(86, '')).toBe(4.0);
    expect(gpaFromPct(86, 'York University')).toBe(4.0);
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
