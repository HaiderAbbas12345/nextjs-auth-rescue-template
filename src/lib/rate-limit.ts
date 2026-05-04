// In-memory only — resets on server restart, no horizontal scaling.
// Swap to Upstash Ratelimit / Redis for production. See README.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; resetAt: number };

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  bucket.count++;
  if (bucket.count > opts.limit) {
    return { ok: false, resetAt: bucket.resetAt };
  }

  return { ok: true, remaining: opts.limit - bucket.count, resetAt: bucket.resetAt };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
