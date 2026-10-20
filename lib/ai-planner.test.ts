import { describe, expect, it } from 'vitest';
import {
  answerAskQuestion,
  buildAskAnalysis,
  mockExplain,
  mockPlan,
  mockSemester,
  parsePlanPayload,
  parseSemesterPayload,
  tierFromScore,
  type SeedCourse,
} from './ai-planner';

const seed: SeedCourse[] = [
  { code: 'MAT137', title: 'Calculus', commonPaths: ['Math'], roughDifficulty: 'High', notes: '', warnings: [], confidenceLevel: 'x' },
  { code: 'CSC148', title: 'Intro CS II', commonPaths: ['CS'], roughDifficulty: 'High', notes: '', warnings: [], confidenceLevel: 'x' },
  { code: 'PSY100', title: 'Psych', commonPaths: ['Psychology'], roughDifficulty: 'Low', notes: '', warnings: [], confidenceLevel: 'x' },
];

describe('mock responses', () => {
  it('flags two high-difficulty courses and POSt concerns', () => {
    const plan = mockPlan(seed, { path: 'CS', courses: ['MAT137', 'CSC148', 'ZZZ999'], workload: 'Balanced', concerns: ['POSt'] });
    expect(plan.courses.map((c) => c.title)).toEqual(['Calculus', 'Intro CS II', 'Course title unavailable in MVP dataset']);
    expect(plan.riskWarnings).toHaveLength(2);
  });

  it('explains unknown courses with a verify-officially note', () => {
    expect(mockExplain(seed, { courseCode: 'abc123' }).course.confidenceLevel).toBe('Verify officially');
  });

  it('reports an empty semester', () => {
    expect(mockSemester(seed, { courses: [] }).empty).toBe(true);
  });
});

describe('ask analysis', () => {
  const semester = {
    courses: [
      { code: 'MAT137', title: '', grade: null, crncr: false, assessments: [{ grade: 65, weight: 50 }, { grade: null, weight: 50 }] },
      { code: 'PSY100', title: '', grade: 88, crncr: false, assessments: [] },
    ],
  };

  it('classifies risk and scores a tier', () => {
    const a = buildAskAnalysis(seed, semester);
    expect(a.courses.map((c) => c.risk)).toEqual(['at-risk', 'safe']);
    expect(a.average).toBeCloseTo(76.5);
    expect(a.topPriority?.code).toBe('MAT137');
    // 76.5 - 7 (at-risk) - 1.5 (one missing) - 5 (spread 23) = 63
    expect(a.score).toBeCloseTo(63);
    expect(a.tier.label).toBe('C Tier');
  });

  it('answers focus questions from the analysis', () => {
    expect(answerAskQuestion('what should I focus on this week?', buildAskAnalysis(seed, semester))).toMatch(/^Focus this week on MAT137/);
    expect(answerAskQuestion('anything', null)).toMatch(/^I need saved MySemester/);
  });

  it('tiers by score boundaries', () => {
    expect(tierFromScore(94).label).toBe('S Tier');
    expect(tierFromScore(59.9).label).toBe('Recovery Tier');
  });
});

describe('payload validation', () => {
  it('keeps only real course codes and caps the list', () => {
    const p = parsePlanPayload({ courses: ['csc108', 'DROP TABLE', ...Array(20).fill('MAT137')], concerns: ['POSt'] })!;
    expect(p.courses[0]).toBe('CSC108');
    expect(p.courses).toHaveLength(12);
    expect(parsePlanPayload({ courses: ['nope'] })).toBeNull();
  });

  it('coerces semester data to plain numbers', () => {
    const s = parseSemesterPayload({ courses: [{ code: 'csc108', grade: '90', assessments: [{ grade: 80, weight: 'x' }] }, 'junk'] });
    expect(s.courses).toEqual([{ code: 'CSC108', title: '', grade: null, crncr: false, assessments: [{ grade: 80, weight: 0 }] }]);
  });
});
