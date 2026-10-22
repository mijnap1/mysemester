import { createRateLimiter } from '@/lib/rate-limit';
import { candidateCodes, normalizeCourseQuery, parseTimetable, TTB_API, type CourseTimetable } from '@/lib/timetable';

/**
 * GET /api/timetable/{code}  →  CourseTimetable
 *
 * This year's lecture sections and instructors for a St. George course, from
 * UofT Timetable Builder's public data. Each course is cached for six hours
 * (here and on the CDN), so Timetable Builder sees a handful of requests per
 * course per day no matter how busy MySemester is.
 */

const CACHE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 12_000;
const limited = createRateLimiter(60, 10 * 60_000);

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function fetchCode(code: string): Promise<unknown> {
  const res = await fetch(`${TTB_API}/${encodeURIComponent(code)}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Timetable Builder answered ${res.status}`);
  return res.json();
}

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  if (limited(request)) return fail('Too many searches. Try again in a few minutes.', 429);
  const { code: raw } = await context.params;
  const query = normalizeCourseQuery(decodeURIComponent(raw));
  if (!query) return fail('Enter a St. George course code, like CSC148 or MAT137Y1.', 400);

  let responses: unknown[];
  try {
    responses = await Promise.all(candidateCodes(query).map(fetchCode));
  } catch {
    return fail('Couldn’t reach UofT Timetable Builder. Try again in a moment.', 502);
  }

  const offerings = responses.flatMap((r) => parseTimetable(r));
  const body: CourseTimetable = {
    code: query,
    title: offerings[0]?.title ?? '',
    offerings,
    fetchedAt: new Date().toISOString(),
  };
  return Response.json(body, {
    headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 4}` },
  });
}
