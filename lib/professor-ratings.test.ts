import { describe, expect, it } from 'vitest';
import { adjustedScore, confidenceLabel, instructorKey, rankByRatings, ratingCourseCode, validRating, type RatingSummary } from './professor-ratings';

const summary = (instructorKey: string, ratings: number, quality: number, wouldTakeAgain = 80, difficulty = 3): RatingSummary => ({
  instructorKey,
  ratings,
  quality,
  difficulty,
  wouldTakeAgain,
  topTags: [],
});

describe('keys', () => {
  it('matches instructor names across spacing, case and accents', () => {
    expect(instructorKey('  Sadia  Sharmin ')).toBe('sadia sharmin');
    expect(instructorKey('Renée Côté')).toBe('renee cote');
  });

  it('shares ratings across a course’s terms and H1/Y1 versions', () => {
    expect(ratingCourseCode('csc148h1')).toBe('CSC148');
    expect(ratingCourseCode('MAT137Y1')).toBe('MAT137');
  });
});

describe('ranking', () => {
  it('does not let one perfect rating beat many strong ones', () => {
    const one = summary('a', 1, 5, 100, 1);
    const many = summary('b', 40, 4.5, 92, 2.5);
    expect(adjustedScore(many)).toBeGreaterThan(adjustedScore(one));
  });

  it('puts rated instructors first by score, keeping unrated ones in order after', () => {
    const map = new Map([
      ['low', summary('low', 20, 2.5, 30, 4.2)],
      ['high', summary('high', 20, 4.6, 95, 2.2)],
    ]);
    const ranked = rankByRatings(['unrated-1', 'low', 'unrated-2', 'high'], (k) => map.get(k));
    expect(ranked).toEqual(['high', 'low', 'unrated-1', 'unrated-2']);
  });

  it('labels how much to trust a score', () => {
    expect(confidenceLabel(2)).toBe('Light sample');
    expect(confidenceLabel(8)).toBe('Moderate confidence');
    expect(confidenceLabel(30)).toBe('High confidence');
  });
});

it('accepts only whole 1–5 ratings and up to three known tags', () => {
  expect(validRating({ quality: 5, difficulty: 2, tags: ['Helpful', 'Fair exams'] })).toBe(true);
  expect(validRating({ quality: 0, difficulty: 2, tags: [] })).toBe(false);
  expect(validRating({ quality: 4.5, difficulty: 2, tags: [] })).toBe(false);
  expect(validRating({ quality: 4, difficulty: 2, tags: ['Helpful', 'Caring', 'Organized', 'Engaging'] })).toBe(false);
  expect(validRating({ quality: 4, difficulty: 2, tags: ['Made up'] })).toBe(false);
});
