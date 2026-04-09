import redis from "../config/redis";

/**
 * Get a cached value from Redis. Returns null if Redis is unavailable or key doesn't exist.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/**
 * Set a value in Redis cache with a TTL in seconds.
 * Silently fails if Redis is unavailable.
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache unavailable — not fatal
  }
}

/**
 * Delete one or more cache keys by pattern prefix.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Cache unavailable — not fatal
  }
}
