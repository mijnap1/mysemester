import { describe, expect, it } from 'vitest';
import { expandItems, itemsTotal, parseSyllabusText, sanitizeItems } from './syllabus';

const TABLE = `
CSC148H1 Introduction to Computer Science — Fall 2026
Instructor: Dr. Example
Office hours: Mondays 2-4 PM

Marking Scheme
Assessment Due date Weight
Weekly preps (10 × 1%) Fridays 10%
Exercises (4 x 5%) see Quercus 20%
Assignment 1 Oct 3 10%
Assignment 2 Nov 14 10%
Midterm test Oct 21 15%
Final exam TBA 35%

Late policy: 10% per day, up to 3 days.
Grading scale: A+ 90–100%, A 85–89%, A- 80–84%
Your lowest exercise mark will be dropped.
`;

describe('parseSyllabusText', () => {
  it('reads a typical marking scheme table', () => {
    const { items, notes } = parseSyllabusText(TABLE);
    expect(items.map((i) => [i.name, i.weight, i.count])).toEqual([
      ['Weekly preps', 10, 10],
      ['Exercises', 20, 4],
      ['Assignment 1', 10, 1],
      ['Assignment 2', 10, 1],
      ['Midterm test', 15, 1],
      ['Final exam', 35, 1],
    ]);
    expect(itemsTotal(items)).toBe(100);
    expect(notes).toEqual(['Your lowest exercise mark will be dropped.']);
  });

  it('handles prose, "% each" and the percent first', () => {
    const text = `
Evaluation
There will be five quizzes worth 2% each.
Problem sets: 30%
40% Final examination
The midterm is worth 20% of your final grade.
Participation 0%
`;
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight, i.count])).toEqual([
      ['Quizzes', 10, 5],
      ['Problem sets', 30, 1],
      ['Final examination', 40, 1],
      ['Midterm', 20, 1],
    ]);
  });

  it('prefers the run that adds to 100 over stray percentages elsewhere', () => {
    const text = `
About 60% of students take this course in first year.
Course policies mention a 5% bonus for surveys.

Grade breakdown
Labs 25%
Term test 1 20%
Term test 2 20%
Final project 35%
`;
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => i.name)).toEqual(['Labs', 'Term test 1', 'Term test 2', 'Final project']);
  });

  it('reads text extracted from a PDF table', () => {
    const text =
      'MAT223H1 Linear Algebra I — Fall 2026\nEvaluation\nComponent Date Weight\nWebwork (best 9 of 10) Weekly 10%\nQuizzes (5 × 2%) In tutorial 10%\nTerm Test 1 October 8 20%\nTerm Test 2 November 12 20%\nFinal Exam December exam period 40%\nIf your final exam mark is higher than your lowest term test, the term test weight is shifted to the final exam.\nLate Webwork receives a penalty of 20% per day.';
    const { items, notes } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight, i.count])).toEqual([
      ['Webwork (best 9 of 10)', 10, 1],
      ['Quizzes', 10, 5],
      ['Term Test 1', 20, 1],
      ['Term Test 2', 20, 1],
      ['Final Exam', 40, 1],
    ]);
    expect(notes).toEqual(['If your final exam mark is higher than your lowest term test, the term test weight is shifted to the final exam.']);
  });

  it('returns nothing useful rather than guessing when there is no scheme', () => {
    expect(parseSyllabusText('Welcome to the course! Office hours are on Mondays.').items).toEqual([]);
  });
});

describe('rows', () => {
  it('splits grouped components into numbered rows that still add up', () => {
    expect(expandItems([{ name: 'Quizzes', weight: 10, count: 3 }])).toEqual([
      { name: 'Quiz 1', weight: 3.33 },
      { name: 'Quiz 2', weight: 3.33 },
      { name: 'Quiz 3', weight: 3.34 },
    ]);
    expect(expandItems([{ name: 'Exercises', weight: 20, count: 4 }]).map((r) => r.name)).toEqual(['Exercise 1', 'Exercise 2', 'Exercise 3', 'Exercise 4']);
    expect(expandItems([{ name: 'Final exam', weight: 40, count: 1 }])).toEqual([{ name: 'Final exam', weight: 40 }]);
  });

  it('keeps only well-formed items from model output', () => {
    expect(sanitizeItems([{ name: 'Midterm', weight: 25 }, { name: '', weight: 10 }, { name: 'Final', weight: 150 }, { name: 'Labs', weight: '20', count: 4 }, null])).toEqual([
      { name: 'Midterm', weight: 25, count: 1 },
      { name: 'Labs', weight: 20, count: 4 },
    ]);
  });
});
