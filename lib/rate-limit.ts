/**
 * Best-effort per-client request limits for API routes. In memory, so each
 * server instance counts separately; enough to blunt casual abuse.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function limited(request: Request): boolean {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    if (hits.size > 5_000) {
      for (const [key, value] of hits) if (value.resetAt < now) hits.delete(key);
    }
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > limit;
  };
}
