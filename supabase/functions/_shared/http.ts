interface RateState {
  count: number;
  expires: number;
}

interface RateLimitResult {
  remaining: number;
  resetMs: number;
}

interface RateLimitError extends Error {
  status?: number;
  remaining?: number;
  resetMs?: number;
}

const rateState = new Map<string, RateState>();

export function assertMaxBodySize(bodyLength: number, maxBytes = 128 * 1024) {
  if (bodyLength > maxBytes) {
    const error = new Error("Payload Too Large");
    (error as RateLimitError).status = 413;
    throw error;
  }
}

export function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a.toLowerCase());
  const bBytes = encoder.encode(b.toLowerCase());

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    result |= aBytes[i]! ^ bBytes[i]!;
  }
  return result === 0;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = rateState.get(key);

  if (!entry || entry.expires < now) {
    const expires = now + windowMs;
    rateState.set(key, { count: 1, expires });
    return { remaining: Math.max(0, limit - 1), resetMs: windowMs };
  }

  if (entry.count >= limit) {
    const error = new Error("Too Many Requests") as RateLimitError;
    error.status = 429;
    error.remaining = 0;
    error.resetMs = Math.max(0, entry.expires - now);
    throw error;
  }

  entry.count += 1;
  return {
    remaining: Math.max(0, limit - entry.count),
    resetMs: Math.max(0, entry.expires - now),
  };
}

export function rateLimitHeaders(remaining: number, resetMs: number) {
  const resetSeconds = Math.ceil(resetMs / 1000);
  return {
    "Retry-After": resetSeconds.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
    "X-RateLimit-Reset": resetSeconds.toString(),
  };
}

export function createRateKeyFromRequest(req: Request, route: string, identifier?: string) {
  const candidate = identifier?.trim();
  if (candidate) {
    return `${route}:${candidate}`;
  }
  const headerId = req.headers.get("stripe-signature") ?? req.headers.get("x-request-id");
  if (headerId) {
    return `${route}:${headerId.split(",")[0]}`;
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
  return `${route}:${ip}`;
}

export function resetRateLimit() {
  rateState.clear();
}
