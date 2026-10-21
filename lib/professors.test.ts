import { expect, it } from 'vitest';
import { PROFESSOR_DATA, professorRankDetails, rankProfessors, reviewConfidenceLabel } from './professors';

it('ranks CSC108 professors by confidence-adjusted score', () => {
  const csc108 = PROFESSOR_DATA.find((course) => course.courseCode === 'CSC108')!;
  const ranked = rankProfessors(csc108.professors);
  const angelaIndex = ranked.findIndex((prof) => prof.name === 'Angela Bernuy');
  const sadiaIndex = ranked.findIndex((prof) => prof.name === 'Sadia Sharmin');

  expect(ranked[0].name).toBe('Sadia Sharmin');
  expect(sadiaIndex).toBeLessThan(angelaIndex);
  expect(professorRankDetails(ranked[0]).score).toBeGreaterThan(professorRankDetails(ranked[1]).score);
});

it('labels small review samples', () => {
  expect(reviewConfidenceLabel(5)).toBe('Light sample');
  expect(reviewConfidenceLabel(20)).toBe('Moderate confidence');
  expect(reviewConfidenceLabel(80)).toBe('High confidence');
});
