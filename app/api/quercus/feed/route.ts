import { parseIcs } from '@/lib/ics';
import { eventsToDeadlines, normalizeFeedUrl } from '@/lib/quercus';

/**
 * POST /api/quercus/feed  { url }  →  { deadlines }
 *
 * Fetches a student's Quercus calendar feed and returns it as deadlines.
 * Browsers can't fetch the feed directly (no CORS), so this route does it.
 * It is stateless: the feed URL is a private link, so it is never stored or
 * logged, and only q.utoronto.ca feed paths are ever requested.
 */

const MAX_BODY_BYTES = 2_000;
const MAX_FEED_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 15_000;

// Best-effort per-client limit, in memory per server instance (like the AI Planner's).
const RATE_LIMIT = 30;
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

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Read at most `limit` bytes of a response body, or null if it is larger. */
async function readCapped(res: Response, limit: number): Promise<string | null> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return fail('Too many refreshes. Try again in a few minutes.', 429);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail('Request too large', 413);
  let url: string | null = null;
  try {
    const body = JSON.parse(text) as { url?: unknown };
    url = typeof body.url === 'string' ? normalizeFeedUrl(body.url) : null;
  } catch {
    // fall through
  }
  if (!url) return fail('That doesn’t look like a Quercus calendar feed link.', 400);

  let res: Response;
  try {
    res = await fetch(url, {
      // A redirect would mean a login page or a different host; never follow it.
      redirect: 'manual',
      cache: 'no-store',
      headers: { Accept: 'text/calendar' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return fail('Couldn’t reach Quercus. Try again in a moment.', 502);
  }
  // Quercus answers a wrong or revoked feed token with a 4xx (or a redirect to log in).
  if ((res.status >= 300 && res.status < 500) || res.type === 'opaqueredirect') {
    return fail('Quercus didn’t recognise that feed link. Copy it again from Quercus → Calendar → Calendar Feed.', 400);
  }
  if (!res.ok) return fail('Quercus didn’t return your calendar. Try again in a moment.', 502);

  const ics = await readCapped(res, MAX_FEED_BYTES);
  if (ics == null) return fail('Your Quercus calendar is too large to read.', 502);
  if (!ics.includes('BEGIN:VCALENDAR')) return fail('Quercus didn’t return a calendar for that link.', 502);

  return Response.json({ deadlines: eventsToDeadlines(parseIcs(ics)) }, { headers: { 'Cache-Control': 'no-store' } });
}
