import Redis from 'ioredis';
import { ENV } from './env';
import logger from '../utils/logger';

class MemoryRedisFallback {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined = undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const raw = await this.get(key);
    let hash: Record<string, string> = {};
    if (raw) {
      try { hash = JSON.parse(raw); } catch (_) {}
    }
    hash[field] = value;
    await this.set(key, JSON.stringify(hash));
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      const hash = JSON.parse(raw);
      return hash[field] || null;
    } catch (_) {
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const raw = await this.get(key);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }

  async hdel(key: string, field: string): Promise<number> {
    const raw = await this.get(key);
    if (!raw) return 0;
    try {
      const hash = JSON.parse(raw);
      delete hash[field];
      await this.set(key, JSON.stringify(hash));
      return 1;
    } catch (_) { return 0; }
  }
}

export type RedisClientType = Redis | MemoryRedisFallback;

let redisClient: RedisClientType;
let isRedisConnected = false;

try {
  const client = new Redis(ENV.REDIS_URI, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('[Redis] Connection retries exceeded. Falling back to in-memory store.');
        return null;
      }
      return 1000;
    },
    lazyConnect: true
  });

  client.on('connect', () => {
    isRedisConnected = true;
    logger.info('[Redis] Real-time Redis Connected successfully.');
  });

  client.on('error', (err) => {
    if (!isRedisConnected) {
      // Quiet log during fallback
    } else {
      logger.error(`[Redis] Error: ${err.message}`);
    }
  });

  client.connect().catch(() => {
    logger.info('[Redis] Using high-performance Memory Cache fallback.');
    redisClient = new MemoryRedisFallback();
  });

  redisClient = client as any;
} catch (e) {
  logger.info('[Redis] Initializing In-Memory Presence & Cache fallback.');
  redisClient = new MemoryRedisFallback();
}

export const getRedisClient = (): RedisClientType => redisClient || new MemoryRedisFallback();
