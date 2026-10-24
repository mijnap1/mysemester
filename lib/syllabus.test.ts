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

  it('reads "total% (each% each)" rows with the count spelled out', () => {
    const text = `
Evaluation:
There will be four 50-minute tests during the semester that will always be during the one-hour timeslot.
Four In-Class Tests 55% (13.75% each)
12 Weekly Online Quizzes 10% (0.83% each)
Final Exam 35%
We will automatically accept all quiz questions submitted within 50% of the time limit.
`;
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight, i.count])).toEqual([
      ['In-Class Tests', 55, 4],
      ['Weekly Online Quizzes', 10, 12],
      ['Final Exam', 35, 1],
    ]);
  });

  it('keeps ordinals in names and skips the total row', () => {
    const text = `
Evaluation components Value Due date
1st Written Test 10% Wed Oct 21, 2026
Reading Test 10% Wed Nov 25, 2026
5
Dictation Test 15% Wed Jan 27, 2027
2nd Written Test 15% Wed Mar 24, 2027
Attendance & Participation 10% Wed Mar 31, 2027
Final Exam 40% TBA
TOTAL 100%
`;
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight])).toEqual([
      ['1st Written Test', 10],
      ['Reading Test', 10],
      ['Dictation Test', 15],
      ['2nd Written Test', 15],
      ['Attendance & Participation', 10],
      ['Final Exam', 40],
    ]);
  });

  it('reads rules that wrap across lines, and ignores "must obtain consent"', () => {
    const text = `
Grading
Midterm 35%
Final exam 65%
If a student misses the mid-term with acceptable documentation, the weight
of the mid-term is transferred to the final exam.
Students who wish to record lectures must obtain written consent beforehand.
`;
    expect(parseSyllabusText(text).notes).toEqual([
      'If a student misses the mid-term with acceptable documentation, the weight of the mid-term is transferred to the final exam.',
    ]);
  });

  it('skips accommodation boilerplate and policy examples', () => {
    const text = `
Grading
Midterm 40%
Final exam 60%
For example, if a student misses a mid-term, the weight of the mid-term is transferred to the final.
A test scheduled for the morning may need to be moved to the afternoon, or written in an alternate exam location.
`;
    expect(parseSyllabusText(text).notes).toEqual([]);
  });

  it('reads a weight column without % signs', () => {
    const text = `
Assessment Weight Due
Problem sets 20 Weekly
Assignment 1 10 Oct 3
Midterm 25 Oct 15
Final exam 45 TBA
`;
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight])).toEqual([
      ['Problem sets', 20],
      ['Assignment 1', 10],
      ['Midterm', 25],
      ['Final exam', 45],
    ]);
  });

  it('joins a name and its percent split onto separate lines', () => {
    const text = 'Grading\nAssignments\n30%\nMidterm\n25%\nFinal Exam\n45%\n';
    const { items } = parseSyllabusText(text);
    expect(items.map((i) => [i.name, i.weight])).toEqual([
      ['Assignments', 30],
      ['Midterm', 25],
      ['Final Exam', 45],
    ]);
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
