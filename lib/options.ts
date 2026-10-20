/** Choices offered in onboarding and the profile editor. */
export const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'] as const;

export interface ProgramGroup {
  /** Heading shown above the group; empty for an ungrouped list. */
  label: string;
  programs: string[];
}

/** General list for universities without their own catalogue. */
export const PROGRAMS = [
  'Accounting',
  'Architecture',
  'Biology',
  'Biomedical Engineering',
  'Business Administration',
  'Chemical Engineering',
  'Chemistry',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science',
  'Economics',
  'Electrical Engineering',
  'Engineering',
  'English',
  'Finance',
  'History',
  'Industrial Engineering',
  'International Relations',
  'Life Sciences',
  'Marketing',
  'Mathematics',
  'Mechanical Engineering',
  'Neuroscience',
  'Nursing',
  'Philosophy',
  'Physics',
  'Political Science',
  'Psychology',
  'Public Health',
  'Sociology',
  'Software Engineering',
  'Statistics',
  'Urban Planning',
  'Other',
] as const;

/**
 * University of Toronto programs, grouped by faculty and campus. Names follow
 * UofT's own program names; UTM and UTSC entries carry the campus so they
 * stay distinct from the St. George programs of the same name.
 */
export const UOFT_PROGRAM_GROUPS: ProgramGroup[] = [
  {
    label: 'Arts & Science · Computing & Math',
    programs: ['Computer Science', 'Data Science', 'Mathematics', 'Applied Mathematics', 'Statistics', 'Actuarial Science'],
  },
  {
    label: 'Arts & Science · Life Sciences',
    programs: [
      'Life Sciences (undeclared)',
      'Biochemistry',
      'Cell & Molecular Biology',
      'Ecology & Evolutionary Biology',
      'Human Biology',
      'Global Health',
      'Immunology',
      'Molecular Genetics',
      'Neuroscience',
      'Nutritional Sciences',
      'Pharmacology & Toxicology',
      'Physiology',
      'Psychology',
    ],
  },
  {
    label: 'Arts & Science · Physical Sciences',
    programs: ['Physics', 'Chemistry', 'Astronomy & Astrophysics', 'Earth Science', 'Environmental Science'],
  },
  {
    label: 'Arts & Science · Social Sciences',
    programs: [
      'Economics',
      'Political Science',
      'International Relations',
      'Public Policy',
      'Sociology',
      'Criminology & Sociolegal Studies',
      'Anthropology',
      'Geography & Planning',
      'Urban Studies',
      'Cognitive Science',
      'Peace, Conflict & Justice',
      'Environmental Studies',
    ],
  },
  {
    label: 'Arts & Science · Humanities',
    programs: [
      'English',
      'History',
      'Philosophy',
      'Linguistics',
      'Cinema Studies',
      'Classics',
      'Art History',
      'East Asian Studies',
      'Religion',
      'Writing & Rhetoric',
    ],
  },
  {
    label: 'Rotman Commerce',
    programs: [
      'Rotman Commerce (undeclared)',
      'Rotman Commerce · Accounting',
      'Rotman Commerce · Finance & Economics',
      'Rotman Commerce · Management',
    ],
  },
  {
    label: 'Engineering',
    programs: [
      'Track One (General First Year)',
      'Engineering Science',
      'Chemical Engineering',
      'Civil Engineering',
      'Computer Engineering',
      'Electrical Engineering',
      'Industrial Engineering',
      'Materials Engineering',
      'Mechanical Engineering',
      'Mineral Engineering',
    ],
  },
  {
    label: 'Other St. George Faculties',
    programs: ['Architecture (Daniels)', 'Kinesiology & Physical Education', 'Music', 'Nursing', 'Pharmacy'],
  },
  {
    label: 'UTM (Mississauga)',
    programs: [
      'Commerce (UTM)',
      'Management (UTM)',
      'Computer Science (UTM)',
      'Communication, Culture & Technology (UTM)',
      'Forensic Science (UTM)',
      'Life Sciences (UTM)',
      'Psychology (UTM)',
      'Social Sciences (UTM)',
    ],
  },
  {
    label: 'UTSC (Scarborough)',
    programs: [
      'Management (UTSC)',
      'Computer Science (UTSC)',
      'Health Studies (UTSC)',
      'International Development Studies (UTSC)',
      'Life Sciences (UTSC)',
      'Neuroscience (UTSC)',
      'Psychology (UTSC)',
      'Social Sciences (UTSC)',
    ],
  },
  {
    label: 'Not sure yet',
    programs: ['Undeclared', 'Other'],
  },
];

/** Program choices for a university: UofT gets its own grouped list. */
export function programGroupsFor(university: string | undefined): ProgramGroup[] {
  if (university === 'University of Toronto') return UOFT_PROGRAM_GROUPS;
  return [{ label: '', programs: [...PROGRAMS] }];
}

/** Groups narrowed to programs matching `query` (case-insensitive); empty groups are dropped. */
export function filterProgramGroups(groups: ProgramGroup[], query: string): ProgramGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      programs: g.programs.filter((p) => p.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)),
    }))
    .filter((g) => g.programs.length);
}
