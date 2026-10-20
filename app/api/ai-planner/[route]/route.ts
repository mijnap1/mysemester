import seedData from '@/data/ai-planner-courses.json';
import {
  mockAsk,
  mockExplain,
  mockPlan,
  mockSemester,
  normalizeCourseCode,
  OFFICIAL_NOTE,
  parseAskPayload,
  parseExplainPayload,
  parsePlanPayload,
  parseSemesterPayload,
  type SeedCourse,
} from '@/lib/ai-planner';

/**
 * POST /api/ai-planner/{plan|explain|semester-check|ask}
 *
 * Uses OpenAI when OPENAI_API_KEY is set, otherwise (or on any failure)
 * returns the same rule-based answers the page falls back to.
 */

const SEED = seedData as SeedCourse[];
const MAX_BODY_BYTES = 32_000;
const OPENAI_TIMEOUT_MS = 20_000;

// Best-effort limit on OpenAI-backed calls per client. In-memory, so it is
// per server instance; enough to blunt casual abuse of the API key.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5_000) {
    for (const [key, value] of hits) if (value.resetAt < now) hits.delete(key);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const SCHEMAS: Record<string, string> = {
  plan: '{ "officialNote": string, "courses": courseObject[], "riskWarnings": string[], "checklist": string[], "verifyQuestions": string[] }',
  explain: '{ "officialNote": string, "course": courseObject, "misunderstandings": string[] }',
  'semester-check':
    '{ "officialNote": string, "empty": boolean, "overview": string, "warnings": string[], "clustering": string[], "suggestions": string[] }',
  ask: '{ "officialNote": string, "answer": string, "nextSteps": string[] }',
};

function relevantSeed(route: string, payload: unknown): SeedCourse[] {
  const text = JSON.stringify(payload ?? {});
  const codes = new Set((text.match(/\b[A-Z]{3}\s*[0-9]{3}\b/gi) ?? []).map(normalizeCourseCode));
  const direct = SEED.filter((c) => codes.has(c.code));
  if (direct.length) return direct;
  return SEED.slice(0, route === 'ask' ? 80 : 40);
}

const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20) : undefined;

function asCourse(v: unknown, fallback: SeedCourse): SeedCourse {
  const c = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const s = (x: unknown, d: string) => (typeof x === 'string' && x ? x : d);
  return {
    code: s(c.code, fallback.code),
    title: s(c.title, fallback.title),
    commonPaths: strings(c.commonPaths) ?? fallback.commonPaths,
    roughDifficulty: s(c.roughDifficulty, String(fallback.roughDifficulty)),
    notes: s(c.notes, fallback.notes),
    warnings: strings(c.warnings) ?? fallback.warnings,
    confidenceLevel: s(c.confidenceLevel, fallback.confidenceLevel),
  };
}

/** Keep only well-typed fields from the model's JSON; everything else comes from the mock. */
function mergeAiResult(route: string, ai: Record<string, unknown>, mock: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...mock, source: 'openai' };
  for (const key of ['riskWarnings', 'checklist', 'verifyQuestions', 'misunderstandings', 'warnings', 'clustering', 'suggestions', 'nextSteps']) {
    const list = strings(ai[key]);
    if (list && key in mock) out[key] = list;
  }
  for (const key of ['overview', 'answer']) {
    if (typeof ai[key] === 'string' && key in mock) out[key] = ai[key];
  }
  if (route === 'plan' && Array.isArray(ai.courses) && Array.isArray(mock.courses)) {
    const mockCourses = mock.courses as SeedCourse[];
    out.courses = mockCourses.map((fallback, i) => asCourse((ai.courses as unknown[])[i], fallback));
  }
  if (route === 'explain' && mock.course) out.course = asCourse(ai.course, mock.course as SeedCourse);
  out.officialNote = OFFICIAL_NOTE;
  return out;
}

async function askOpenAI(route: string, payload: unknown): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const system = [
    'You are AI Planner for MySemester, an unofficial helper for first-year UofT Arts & Science students.',
    'Never claim to be official advising. Never invent exact program, POSt, prerequisite, breadth, enrolment, or CR/NCR rules.',
    'If requirements matter, tell the user to verify with the UofT Calendar, department pages, registrar, or an academic advisor.',
    'Keep answers friendly, short, structured, and student-friendly.',
    `Return strict JSON matching this shape: ${SCHEMAS[route]}. Include this officialNote exactly: ${OFFICIAL_NOTE}`,
  ].join(' ');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify({ payload, seedCourses: relevantSeed(route, payload) }) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function badRequest(message: string) {
  return Response.json({ error: message, officialNote: OFFICIAL_NOTE }, { status: 400 });
}

export async function POST(request: Request, context: { params: Promise<{ route: string }> }) {
  const { route } = await context.params;
  if (!(route in SCHEMAS)) {
    return Response.json({ error: 'Unknown AI Planner route' }, { status: 404 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: 'Request too large' }, { status: 413 });
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return badRequest('Invalid JSON');
  }

  let payload: unknown;
  let mock: Record<string, unknown>;
  switch (route) {
    case 'plan': {
      const p = parsePlanPayload(body);
      if (!p) return badRequest('Enter at least one course code.');
      payload = p;
      mock = { ...mockPlan(SEED, p) };
      break;
    }
    case 'explain': {
      const p = parseExplainPayload(body);
      if (!p) return badRequest('Enter a course code like CSC108.');
      payload = p;
      mock = { ...mockExplain(SEED, p) };
      break;
    }
    case 'semester-check': {
      const p = parseSemesterPayload(body);
      payload = p;
      mock = { ...mockSemester(SEED, p) };
      if (!p.courses.length) return Response.json(mock);
      break;
    }
    default: {
      const p = parseAskPayload(body);
      if (!p) return badRequest('Ask a question.');
      payload = p;
      mock = { ...mockAsk() };
    }
  }

  if (process.env.OPENAI_API_KEY) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip)) return Response.json(mock);
    const ai = await askOpenAI(route, payload);
    if (ai) return Response.json(mergeAiResult(route, ai, mock));
  }
  return Response.json(mock);
}
