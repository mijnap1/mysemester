/**
 * Course Planner logic shared by the API route (server) and the pages (client
 * fallback when the API is unavailable). The "mock" answers are rule-based
 * and deterministic; the API route asks OpenAI when a key is configured.
 */

export const OFFICIAL_NOTE =
  'Unofficial planning help only. Verify important decisions with the UofT Calendar, department pages, your registrar, or an academic advisor.';

export type Difficulty = 'Low' | 'Medium' | 'High';

export interface SeedCourse {
  code: string;
  title: string;
  commonPaths: string[];
  roughDifficulty: Difficulty | string;
  notes: string;
  warnings: string[];
  confidenceLevel: string;
}

export interface PlanPayload {
  path: string;
  courses: string[];
  workload: string;
  concerns: string[];
}

export interface ExplainPayload {
  courseCode: string;
}

export interface SemesterCourse {
  code: string;
  title: string;
  grade: number | null;
  crncr: boolean;
  assessments: { grade: number | null; weight: number }[];
}

export interface SemesterPayload {
  courses: SemesterCourse[];
}

export interface PlanResult {
  source?: string;
  officialNote: string;
  courses: SeedCourse[];
  riskWarnings: string[];
  checklist: string[];
  verifyQuestions: string[];
}

export interface ExplainResult {
  source?: string;
  officialNote: string;
  course: SeedCourse;
  misunderstandings: string[];
}

export type SemesterResult =
  | { source?: string; empty: true; officialNote: string; message: string }
  | {
      source?: string;
      empty: false;
      officialNote: string;
      overview: string;
      warnings: string[];
      clustering: string[];
      suggestions: string[];
    };

export interface AskResult {
  source?: string;
  officialNote: string;
  answer: string;
  nextSteps: string[];
}

export function normalizeCourseCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export const COURSE_CODE_PATTERN = /^[A-Z]{3,4}\d{3}[A-Z0-9]*$/;

function findCourse(seed: SeedCourse[], code: string): SeedCourse | undefined {
  const normalized = normalizeCourseCode(code);
  return seed.find((c) => c.code === normalized);
}

function unknownCourse(code: string, notes = 'This course is not in the local MVP seed list yet.'): SeedCourse {
  return {
    code: normalizeCourseCode(code),
    title: 'Course title unavailable in MVP dataset',
    commonPaths: [],
    roughDifficulty: 'Medium',
    notes,
    warnings: ['Verify prerequisites, exclusions, breadth, meeting sections, and program requirements officially.'],
    confidenceLevel: 'Verify officially',
  };
}

export function mockPlan(seed: SeedCourse[], payload: PlanPayload): PlanResult {
  const courses = payload.courses.map((code) => findCourse(seed, code) ?? unknownCourse(code));
  const highCount = courses.filter((c) => c.roughDifficulty === 'High').length;
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    courses,
    riskWarnings: [
      highCount >= 2 ? 'Two or more high-difficulty courses can make the term feel tight, especially during midterms.' : '',
      payload.workload === 'Ambitious' ? 'Ambitious schedules need backup sections and a realistic weekly study plan.' : '',
      payload.concerns.includes('POSt') ? 'Do not rely on AI for POSt rules. Check current program admission pages directly.' : '',
      payload.concerns.includes('CR/NCR') ? 'CR/NCR can affect program requirements. Verify before choosing it.' : '',
    ].filter(Boolean),
    checklist: [
      'Confirm prerequisites, exclusions, breadth category, and program fit in official UofT sources.',
      'Build a backup list with alternate lecture, tutorial, and practical sections.',
      'Map weekly assessments once syllabi are released.',
      'Ask an advisor which requirements are strict and which choices are flexible.',
    ],
    verifyQuestions: [
      `Does this set of courses support my intended ${payload.path || 'program'} path?`,
      'Are any of these courses required for POSt, and are there minimum grade rules?',
      'Do any lecture, tutorial, or practical sections conflict?',
      'Would CR/NCR change how this course counts for my goals?',
    ],
  };
}

export function mockExplain(seed: SeedCourse[], payload: ExplainPayload): ExplainResult {
  const course = findCourse(seed, payload.courseCode);
  if (!course) {
    return {
      source: 'mock',
      officialNote: OFFICIAL_NOTE,
      course: {
        ...unknownCourse(payload.courseCode, 'This course is not in the local Course Planner seed dataset yet.'),
        warnings: ['Search the current UofT Calendar and department page for exact details.'],
      },
      misunderstandings: [
        'A course code alone does not confirm prerequisites, exclusions, breadth, or program fit.',
        'Difficulty depends on background, instructor, assessment style, and term workload.',
      ],
    };
  }
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    course,
    misunderstandings: [
      'Introductory does not always mean low workload.',
      'A course can be useful for a path without satisfying a formal requirement.',
      'Difficulty is subjective and changes with background and assessment format.',
    ],
  };
}

export function mockSemester(seed: SeedCourse[], payload: SemesterPayload): SemesterResult {
  const courses = payload.courses;
  if (!courses.length) {
    return {
      source: 'mock',
      empty: true,
      officialNote: OFFICIAL_NOTE,
      message: 'Add courses in MySemester first, then come back for a workload check.',
    };
  }
  const highCourses = courses.filter((c) => findCourse(seed, c.code)?.roughDifficulty === 'High');
  const counts = courses.map((c) => ({
    code: normalizeCourseCode(c.code),
    count: c.assessments.length,
    incomplete: c.assessments.filter((a) => a.grade == null).length,
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return {
    source: 'mock',
    empty: false,
    officialNote: OFFICIAL_NOTE,
    overview: `${courses.length} course${courses.length === 1 ? '' : 's'} found with ${total} tracked assessment${total === 1 ? '' : 's'}.`,
    warnings: [
      highCourses.length >= 2 ? `${highCourses.length} locally flagged high-difficulty courses are in this semester.` : '',
      courses.length >= 5 ? 'Five or more courses can be demanding if several have labs, tutorials, or weekly problem sets.' : '',
      total === 0 ? 'No assessments are tracked yet, so clustering analysis is limited.' : '',
    ].filter(Boolean),
    clustering: counts
      .filter((c) => c.count >= 4 || c.incomplete >= 3)
      .map((c) => `${c.code}: ${c.count} assessment rows, ${c.incomplete} still missing grades.`),
    suggestions: [
      'Once syllabi are released, add due dates in your own calendar to catch true clustering.',
      'Pair high-difficulty technical courses with at least one steadier or lighter course when possible.',
      'Keep backup plans for courses that depend on POSt or enrolment priority.',
      'Use office hours early for courses with proofs, programming, or cumulative problem sets.',
    ],
  };
}

export function mockAsk(): AskResult {
  return {
    source: 'mock',
    officialNote: OFFICIAL_NOTE,
    answer:
      'I would treat this as a planning question, not a rule lookup. Check course difficulty, prerequisites, timetable sections, and POSt relevance before committing. If your question involves requirements or eligibility, verify it in official UofT sources.',
    nextSteps: [
      'Name the exact courses and term if you want a more useful workload read.',
      'Check the UofT Calendar for prerequisites, exclusions, breadth, and program rules.',
      'Ask your registrar or academic advisor about anything that affects graduation, POSt, or enrolment eligibility.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Ask AI Planner: tier analysis of the user's saved grades (runs in the browser).

export type Risk = 'safe' | 'watch' | 'at-risk' | 'unknown';

export interface AnalyzedCourse extends SemesterCourse {
  grade: number | null;
  missing: number;
  difficulty: string;
  paths: string[];
  risk: Risk;
}

export interface Tier {
  label: string;
  className: string;
  headline: string;
}

export interface AskAnalysis {
  major: string;
  courses: AnalyzedCourse[];
  average: number | null;
  score: number;
  tier: Tier;
  strongest: AnalyzedCourse | null;
  weakest: AnalyzedCourse | null;
  topPriority: AnalyzedCourse | null;
  counts: { total: number; graded: number; safe: number; watch: number; atRisk: number; unknown: number; missing: number };
  groups: { safe: AnalyzedCourse[]; watch: AnalyzedCourse[]; atRisk: AnalyzedCourse[]; unknown: AnalyzedCourse[] };
}

function weightedAverage(assessments: SemesterCourse['assessments']): number | null {
  let total = 0;
  let weight = 0;
  for (const a of assessments) {
    if (a.grade != null && a.weight > 0) {
      total += a.grade * a.weight;
      weight += a.weight;
    }
  }
  return weight > 0 ? total / weight : null;
}

function classifyRisk(c: { grade: number | null; missing: number; difficulty: string }, average: number | null): Risk {
  if (c.grade == null) return 'unknown';
  if (c.grade < 60 || c.missing >= 3 || (c.difficulty === 'High' && c.grade < 70)) return 'at-risk';
  if (c.grade < 72 || c.missing > 0 || (average != null && c.grade < average - 7)) return 'watch';
  return 'safe';
}

export function tierFromScore(score: number): Tier {
  if (score >= 94) return { label: 'S Tier', className: 's', headline: 'Elite position' };
  if (score >= 88) return { label: 'A+ Tier', className: 'aplus', headline: 'Premium academic position' };
  if (score >= 80) return { label: 'A Tier', className: 'a', headline: 'Strong, but still upgradable' };
  if (score >= 70) return { label: 'B Tier', className: 'b', headline: 'Good base with clear leaks' };
  if (score >= 60) return { label: 'C Tier', className: 'c', headline: 'Needs structure now' };
  return { label: 'Recovery Tier', className: 'recovery', headline: 'Immediate action needed' };
}

export function buildAskAnalysis(seed: SeedCourse[], semester: SemesterPayload): AskAnalysis {
  const base = semester.courses.map((course) => {
    const info = findCourse(seed, course.code);
    const grade = weightedAverage(course.assessments) ?? course.grade;
    return {
      ...course,
      title: course.title || info?.title || '',
      grade,
      missing: course.assessments.filter((a) => a.grade == null).length,
      difficulty: info?.roughDifficulty || 'Unknown',
      paths: info?.commonPaths || [],
    };
  });
  const gradedBase = base.filter((c) => c.grade != null);
  const average = gradedBase.length ? gradedBase.reduce((s, c) => s + (c.grade as number), 0) / gradedBase.length : null;
  const courses: AnalyzedCourse[] = base.map((c) => ({ ...c, risk: classifyRisk(c, average) }));
  const graded = courses.filter((c) => c.grade != null);
  const groups = {
    safe: courses.filter((c) => c.risk === 'safe'),
    watch: courses.filter((c) => c.risk === 'watch'),
    atRisk: courses.filter((c) => c.risk === 'at-risk'),
    unknown: courses.filter((c) => c.risk === 'unknown'),
  };
  const missing = courses.reduce((s, c) => s + c.missing, 0);
  const grades = graded.map((c) => c.grade as number);
  const spread = grades.length >= 2 ? Math.max(...grades) - Math.min(...grades) : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      (average ?? 52) -
        groups.atRisk.length * 7 -
        groups.watch.length * 3 -
        Math.min(missing * 1.5, 10) -
        (spread > 18 ? 5 : spread > 12 ? 2 : 0) +
        (groups.safe.length >= 3 ? 2 : 0),
    ),
  );
  const byGrade = [...graded].sort((a, b) => (b.grade as number) - (a.grade as number));
  const strongest = byGrade[0] ?? null;
  const weakest = byGrade[byGrade.length - 1] ?? null;

  const pathCounts = new Map<string, number>();
  courses.forEach((c) => c.paths.forEach((p) => pathCounts.set(p, (pathCounts.get(p) ?? 0) + 1)));
  const major = [...pathCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'your saved semester';

  return {
    major,
    courses,
    average,
    score,
    tier: tierFromScore(score),
    strongest,
    weakest,
    topPriority: [...groups.atRisk, ...groups.watch, ...groups.unknown][0] ?? weakest ?? courses[0] ?? null,
    counts: {
      total: courses.length,
      graded: graded.length,
      safe: groups.safe.length,
      watch: groups.watch.length,
      atRisk: groups.atRisk.length,
      unknown: groups.unknown.length,
      missing,
    },
    groups,
  };
}

export function formatPercent(value: number | null): string {
  return value == null ? 'No grade yet' : `${Math.round(value * 10) / 10}%`;
}

const RISK_LABEL: Record<Risk, string> = { safe: 'Safe', watch: 'Watch', 'at-risk': 'At risk', unknown: 'Unknown' };

export function riskLine(course: AnalyzedCourse): string {
  return `${course.code}: ${RISK_LABEL[course.risk]} - ${formatPercent(course.grade)}${course.missing ? `, ${course.missing} missing` : ''}`;
}

export function askSuggestions(a: AskAnalysis): string[] {
  if (!a.counts.total) return ['Add courses and assessment rows in MySemester first so Ask AI Planner can build a real tier.'];
  const out: string[] = [];
  if (a.topPriority) out.push(`Start with ${a.topPriority.code}; it has the clearest impact on your next tier.`);
  if (a.counts.missing) {
    out.push(`Resolve or estimate ${a.counts.missing} missing assessment${a.counts.missing === 1 ? '' : 's'} so the tier reflects reality.`);
  }
  if (a.weakest && a.strongest && a.weakest.code !== a.strongest.code) {
    out.push(`Protect ${a.strongest.code} while raising ${a.weakest.code}; that improves both average and consistency.`);
  }
  if (a.major !== 'your saved semester') {
    out.push(
      `Your course mix points toward ${a.major}; verify program rules officially, then prioritize courses tied to admission, prerequisites, or progression.`,
    );
  }
  out.push('Use the next seven days for one targeted grade lift, not scattered studying across every course.');
  return out;
}

export function answerAskQuestion(question: string, a: AskAnalysis | null): string {
  const q = question.toLowerCase();
  if (!a || !a.counts.total) {
    return 'I need saved MySemester course and grade data first. Add courses or assessments, then run Analyze my semester.';
  }
  if (q.includes('tier') || q.includes('a+')) {
    const blockers = [
      a.counts.atRisk ? `${a.counts.atRisk} at-risk course${a.counts.atRisk === 1 ? '' : 's'}` : '',
      a.counts.watch ? `${a.counts.watch} watch course${a.counts.watch === 1 ? '' : 's'}` : '',
      a.counts.missing ? `${a.counts.missing} missing assessment${a.counts.missing === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    return `You are at ${a.tier.label}. To push toward A+ Tier, fix ${blockers || 'consistency and course-specific weak spots'} first. ${askSuggestions(a)[0]}`;
  }
  if (q.includes('focus') || q.includes('week') || q.includes('study')) {
    return a.topPriority
      ? `Focus this week on ${a.topPriority.code}. Current read: ${formatPercent(a.topPriority.grade)}, ${a.topPriority.risk.replace('-', ' ')}. Pick one upcoming or missing assessment there and make that your highest-leverage task.`
      : 'Focus on adding grade data first; there is not enough course detail to rank priorities.';
  }
  if (q.includes('risk') || q.includes('hurting') || q.includes('weak')) {
    const risk = [...a.groups.atRisk, ...a.groups.watch].slice(0, 3).map(riskLine);
    return risk.length
      ? `The main tier drag is: ${risk.join('; ')}. Start with the first one because it has the clearest downside.`
      : 'No major risk is visible from the saved grades. The next improvement is consistency: keep strong courses stable while filling missing assessment data.';
  }
  if (q.includes('average') || q.includes('grade')) {
    return `Your current saved average is ${formatPercent(a.average)} across ${a.counts.graded} graded course${a.counts.graded === 1 ? '' : 's'}. ${
      a.weakest ? `${a.weakest.code} is the most direct average lift right now.` : 'Add more grades for a sharper read.'
    }`;
  }
  return `Based on your saved data, you are at ${a.tier.label} with an average of ${formatPercent(a.average)}. The best next move is: ${askSuggestions(a)[0]}`;
}

// ---------------------------------------------------------------------------
// Request validation (server) — keeps payloads small and well-formed.

const MAX_COURSES = 12;

function str(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export function parsePlanPayload(body: unknown): PlanPayload | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const courses = (Array.isArray(b.courses) ? b.courses : []).map(normalizeCourseCode).filter((c) => COURSE_CODE_PATTERN.test(c));
  if (!courses.length) return null;
  return {
    path: str(b.path, 60),
    courses: courses.slice(0, MAX_COURSES),
    workload: str(b.workload, 20),
    concerns: (Array.isArray(b.concerns) ? b.concerns : []).map((c) => str(c, 20)).filter(Boolean).slice(0, 10),
  };
}

export function parseExplainPayload(body: unknown): ExplainPayload | null {
  const code = normalizeCourseCode((body as Record<string, unknown> | null)?.courseCode);
  return COURSE_CODE_PATTERN.test(code) ? { courseCode: code } : null;
}

export function parseSemesterPayload(body: unknown): SemesterPayload {
  const raw = (body as Record<string, unknown> | null)?.courses;
  const courses = (Array.isArray(raw) ? raw : []).slice(0, 20).map((item) => {
    const c = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      code: normalizeCourseCode(c.code).slice(0, 12),
      title: str(c.title),
      grade: num(c.grade),
      crncr: c.crncr === true,
      assessments: (Array.isArray(c.assessments) ? c.assessments : []).slice(0, 40).map((a) => {
        const r = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
        return { grade: num(r.grade), weight: num(r.weight) ?? 0 };
      }),
    };
  });
  return { courses: courses.filter((c) => c.code) };
}

export function parseAskPayload(body: unknown): { question: string } | null {
  const question = str((body as Record<string, unknown> | null)?.question, 500).trim();
  return question ? { question } : null;
}
