/** Icons offered in the Add Course picker, two pages of six. */
export const COURSE_ICONS = [
  { value: 'book-outline', label: 'Book' },
  { value: 'calculator-outline', label: 'Calculator' },
  { value: 'flask-outline', label: 'Flask' },
  { value: 'globe-outline', label: 'Globe' },
  { value: 'laptop-outline', label: 'Laptop' },
  { value: 'library-outline', label: 'Library' },
  { value: 'medkit-outline', label: 'Medkit' },
  { value: 'musical-notes-outline', label: 'Music' },
  { value: 'planet-outline', label: 'Planet' },
  { value: 'school-outline', label: 'School' },
  { value: 'stats-chart-outline', label: 'Statistics' },
  { value: 'wallet-outline', label: 'Wallet' },
] as const;

export const ICONS_PER_PAGE = 6;

export function iconLabel(value: string): string {
  return COURSE_ICONS.find((i) => i.value === value)?.label ?? value;
}

/** Subject-based icon for a course code, used by CSV and JSON imports. */
export function autoIcon(code: string, fallback = 'book-outline'): string {
  if (/^CSC/i.test(code)) return 'laptop-outline';
  if (/^MAT/i.test(code)) return 'calculator-outline';
  if (/^STA/i.test(code)) return 'stats-chart-outline';
  if (/^AST/i.test(code)) return 'planet-outline';
  if (/^(PHL|PHI)/i.test(code)) return 'school-outline';
  return fallback;
}
