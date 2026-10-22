import { describe, expect, it } from 'vitest';
import { COURSE_ICONS, courseIcon, subjectIcon } from './icons';

describe('subjectIcon', () => {
  it('matches UofT and other universities’ subject codes', () => {
    expect(subjectIcon('CSC148')).toBe('laptop-outline');
    expect(subjectIcon('MATA31')).toBe('calculator-outline');
    expect(subjectIcon('STA256H1')).toBe('stats-chart-outline');
    expect(subjectIcon('COMP 1405')).toBe('laptop-outline');
    expect(subjectIcon('CS 135')).toBe('laptop-outline');
    expect(subjectIcon('ECON 101')).toBe('cash-outline');
    expect(subjectIcon('PSY100')).toBe('bulb-outline');
    expect(subjectIcon('EAS101')).toBe('language-outline');
    expect(subjectIcon('ECOL 203')).toBe('leaf-outline');
    expect(subjectIcon('PHL100')).toBe('chatbubbles-outline');
  });

  it('returns null for unknown subjects and loose two-letter matches', () => {
    expect(subjectIcon('XYZ101')).toBeNull();
    expect(subjectIcon('SES200')).toBeNull();
    expect(subjectIcon('')).toBeNull();
  });

  it('only ever picks icons the picker offers', () => {
    const offered = new Set<string>(COURSE_ICONS.map((i) => i.value));
    for (const code of ['CSC1', 'ECE2', 'APS1', 'MAT1', 'STA1', 'CHM1', 'BIO1', 'PHY1', 'AST1', 'ESS1', 'GGR1', 'HMB1', 'KPE1', 'PSY1', 'ECO1', 'RSM1', 'FIN1', 'SOC1', 'POL1', 'LAW1', 'HIS1', 'PHL1', 'FRE1', 'FAH1', 'MUS1', 'CIN1', 'ENG1']) {
      expect(offered.has(subjectIcon(code) ?? '')).toBe(true);
    }
  });
});

it('keeps a picked icon and fills in the default one', () => {
  expect(courseIcon({ code: 'CSC148', icon: 'book-outline' })).toBe('laptop-outline');
  expect(courseIcon({ code: 'CSC148', icon: 'musical-notes-outline' })).toBe('musical-notes-outline');
  expect(courseIcon({ code: 'XYZ101', icon: 'book-outline' })).toBe('book-outline');
});
