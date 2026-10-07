import "server-only";

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  totalLimit: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_AI_LIMIT = 5;
const DEFAULT_AI_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_STORE_ENTRIES = 10000;

// In-memory store keyed by caller identifier (e.g. admin user ID or IP)
const store = new Map<string, RateLimitEntry>();

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Checks and increments the rate limit counter for a given identifier.
 * Uses an in-memory window to prevent excessive API requests to Gemini.
 */
export function checkAIRateLimit(
  identifier: string,
  options?: RateLimitOptions
): RateLimitResult {
  const limit = options?.limit ?? DEFAULT_AI_LIMIT;
  const windowMs = options?.windowMs ?? DEFAULT_AI_WINDOW_MS;
  const now = Date.now();

  // Periodically prevent unbound memory growth
  if (store.size > MAX_STORE_ENTRIES) {
    pruneExpiredEntries(now);
  }

  const existing = store.get(identifier);

  // If no entry exists or the window has expired, start a fresh window
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetInSeconds: Math.ceil(windowMs / 1000),
      totalLimit: limit,
    };
  }

  // If currently at or over limit, reject
  if (existing.count >= limit) {
    const secondsRemaining = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: secondsRemaining,
      totalLimit: limit,
    };
  }

  // Under limit: increment and allow
  existing.count += 1;
  const secondsRemaining = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetInSeconds: secondsRemaining,
    totalLimit: limit,
  };
}

/**
 * Resets the in-memory rate limit store. Intended for automated test isolation.
 */
export function _resetRateLimitStore(): void {
  store.clear();
}

/**
 * Inspects current store size for testing and monitoring.
 */
export function _getRateLimitStoreSize(): number {
  return store.size;
}
