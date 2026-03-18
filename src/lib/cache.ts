// In-memory fallback cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// --- In-memory cache ---

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
}

function memSet<T>(key: string, data: T): void {
  memCache.set(key, { data, timestamp: Date.now() });
}

// --- Redis cache (Upstash) ---

let redisClient: {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts: { ex: number }) => Promise<unknown>;
} | null = null;

async function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}

// --- Unified cache API ---

export async function getCached<T>(key: string): Promise<T | null> {
  // Try Redis first
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        console.log(`[cache] Redis HIT: ${key}`);
        return JSON.parse(raw as string) as T;
      }
      console.log(`[cache] Redis MISS: ${key}`);
    } catch (err) {
      console.warn(`[cache] Redis GET error:`, err);
    }
  }

  // Fall back to in-memory
  return memGet<T>(key);
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  // Write to both — mem is instant, Redis persists across instances
  memSet(key, data);

  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: TTL_MS / 1000 });
    } catch (err) {
      console.warn(`[cache] Redis SET error:`, err);
    }
  }
}
