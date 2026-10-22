/** Icons offered in the Add Course picker. */
export const COURSE_ICONS = [
  { value: 'book-outline', label: 'Book' },
  { value: 'calculator-outline', label: 'Math' },
  { value: 'stats-chart-outline', label: 'Statistics' },
  { value: 'laptop-outline', label: 'Computing' },
  { value: 'hardware-chip-outline', label: 'Electrical' },
  { value: 'construct-outline', label: 'Engineering' },
  { value: 'flask-outline', label: 'Chemistry' },
  { value: 'leaf-outline', label: 'Biology' },
  { value: 'magnet-outline', label: 'Physics' },
  { value: 'planet-outline', label: 'Astronomy' },
  { value: 'earth-outline', label: 'Earth science' },
  { value: 'map-outline', label: 'Geography' },
  { value: 'medkit-outline', label: 'Health' },
  { value: 'fitness-outline', label: 'Kinesiology' },
  { value: 'bulb-outline', label: 'Psychology' },
  { value: 'cash-outline', label: 'Economics' },
  { value: 'briefcase-outline', label: 'Business' },
  { value: 'wallet-outline', label: 'Finance' },
  { value: 'people-outline', label: 'Sociology' },
  { value: 'flag-outline', label: 'Politics' },
  { value: 'scale-outline', label: 'Law' },
  { value: 'hourglass-outline', label: 'History' },
  { value: 'chatbubbles-outline', label: 'Philosophy' },
  { value: 'language-outline', label: 'Languages' },
  { value: 'color-palette-outline', label: 'Art' },
  { value: 'musical-notes-outline', label: 'Music' },
  { value: 'film-outline', label: 'Film' },
  { value: 'globe-outline', label: 'Globe' },
  { value: 'library-outline', label: 'Library' },
  { value: 'school-outline', label: 'School' },
] as const;

/** The icon a course gets until the student picks one. */
export const DEFAULT_COURSE_ICON = 'book-outline';

export function iconLabel(value: string): string {
  return COURSE_ICONS.find((i) => i.value === value)?.label ?? value;
}

/**
 * Subject prefixes → icon. Covers UofT St. George and UTSC/UTM codes (CSC148,
 * MATA31, STA256) and common codes elsewhere (COMP 1405, MATH 135, ECON 101).
 * Longer prefixes are checked first, so "PHL" wins over "PH".
 */
const SUBJECTS: [string, string[]][] = [
  ['laptop-outline', ['CSC', 'CS', 'COMP', 'CPSC', 'CMPT', 'CSCI', 'CIS', 'SE', 'INF', 'ITM', 'DATA']],
  ['hardware-chip-outline', ['ECE', 'ELEC', 'EE', 'ELE']],
  ['construct-outline', ['APS', 'ESC', 'MIE', 'CIV', 'CIVE', 'CIVL', 'MSE', 'MECH', 'ENGR', 'ENGG', 'CHE', 'AER', 'BME']],
  ['calculator-outline', ['MAT', 'MATH', 'APM', 'MAM', 'AMATH', 'PMATH', 'CO']],
  ['stats-chart-outline', ['STA', 'STAT', 'STATS', 'ACT', 'ACTSC']],
  ['flask-outline', ['CHM', 'CHEM', 'BCH', 'BIOC', 'PCL', 'PHC']],
  ['leaf-outline', ['BIO', 'BIOL', 'EEB', 'CSB', 'MGY', 'ENV', 'ENVS', 'EES', 'FOR', 'PLB', 'BIOA', 'BIOB', 'ECOL']],
  ['magnet-outline', ['PHY', 'PHYS', 'PHYA', 'PHYB']],
  ['planet-outline', ['AST', 'ASTR', 'ASTRO']],
  ['earth-outline', ['ESS', 'GLG', 'GEOL', 'EART']],
  ['map-outline', ['GGR', 'GEOG', 'GGRA', 'GGRB', 'JGE']],
  ['medkit-outline', ['HMB', 'PSL', 'ANA', 'IMM', 'LMP', 'NUR', 'NURS', 'PHM', 'HLTH', 'HLT', 'NFS', 'PUB', 'MED']],
  ['fitness-outline', ['KPE', 'KIN', 'KINE', 'PHE', 'HMS']],
  ['bulb-outline', ['PSY', 'PSYC', 'PSYCH', 'COG', 'PSYA', 'PSYB']],
  ['cash-outline', ['ECO', 'ECON', 'ECN', 'ECMA', 'ECMB']],
  ['briefcase-outline', ['RSM', 'MGT', 'MGMT', 'MGEA', 'MGEB', 'MGAB', 'MGHA', 'COMM', 'BUS', 'BUSI', 'ACC', 'ACCT', 'MKTG', 'MKT', 'ADMS']],
  ['wallet-outline', ['FIN', 'FINA', 'MGFB']],
  ['people-outline', ['SOC', 'SOCI', 'ANT', 'ANTH', 'WGS', 'GSWS', 'IRE', 'SDS', 'CRI', 'CRIM']],
  ['flag-outline', ['POL', 'POLI', 'POLS', 'PPG', 'PSCI', 'POLA', 'POLB']],
  ['scale-outline', ['LAW', 'LAWS', 'LGL']],
  ['hourglass-outline', ['HIS', 'HIST', 'CLA', 'CLAS', 'HISA', 'HISB', 'NMC', 'ARH']],
  ['chatbubbles-outline', ['PHL', 'PHI', 'PHIL', 'PHLA', 'PHLB']],
  ['language-outline', ['FRE', 'FREN', 'FSL', 'SPA', 'SPAN', 'GER', 'GERM', 'ITA', 'ITAL', 'EAS', 'JPN', 'JAPA', 'KOR', 'CHI', 'CHIN', 'LIN', 'LING', 'ARA', 'RUS', 'SLA', 'LGGA', 'LGGB', 'FREA', 'FREB']],
  ['color-palette-outline', ['FAH', 'VIS', 'FINE', 'ART', 'ARTH', 'VPAB', 'VPHA', 'DES', 'ARC', 'ARCH']],
  ['musical-notes-outline', ['MUS', 'MUSI', 'MUSC', 'PMU', 'TMU', 'VPMA']],
  ['film-outline', ['CIN', 'FILM', 'FLM', 'MDS', 'MEDIA']],
  ['book-outline', ['ENG', 'ENGL', 'LIT', 'CLT', 'ENGA', 'ENGB', 'WRI', 'WRIT']],
];

const BY_PREFIX = new Map<string, string>();
for (const [icon, prefixes] of SUBJECTS) for (const p of prefixes) if (!BY_PREFIX.has(p)) BY_PREFIX.set(p, icon);

/** The icon for a course code's subject, or null when the subject isn't known. */
export function subjectIcon(code: string): string | null {
  const letters = code.trim().toUpperCase().match(/^[A-Z]+/)?.[0];
  if (!letters) return null;
  // "CSC148" → "CSC"; "MATA31" → "MATA", then "MAT"; "COMP1405" → "COMP".
  // Two-letter subjects ("CS 135") only match exactly, so "SES" isn't read as "SE".
  for (let len = Math.min(letters.length, 5); len >= (letters.length === 2 ? 2 : 3); len--) {
    const icon = BY_PREFIX.get(letters.slice(0, len));
    if (icon) return icon;
  }
  return null;
}

/** Subject-based icon for a course code, used when adding and importing courses. */
export function autoIcon(code: string, fallback = DEFAULT_COURSE_ICON): string {
  return subjectIcon(code) ?? fallback;
}

/** What a course card shows: the student's pick, or its subject's icon if it still has the default. */
export function courseIcon(course: { code: string; icon: string }): string {
  return course.icon === DEFAULT_COURSE_ICON ? autoIcon(course.code) : course.icon;
}
