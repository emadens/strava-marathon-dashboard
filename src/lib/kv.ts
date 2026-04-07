import Redis from 'ioredis';

type DataType =
  | 'plans'
  | 'manual_matches'
  | 'skipped_sessions'
  | 'goals'
  | 'hr_zones'
  | 'vo2max'
  | 'saved_date_ranges'
  | 'ocr_count';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL not configured');
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return redis;
}

function key(athleteId: string, type: DataType): string {
  return `user:${athleteId}:${type}`;
}

export async function kvGet<T>(athleteId: string, type: DataType): Promise<T | null> {
  try {
    const raw = await getRedis().get(key(athleteId, type));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet<T>(athleteId: string, type: DataType, value: T): Promise<void> {
  try {
    await getRedis().set(key(athleteId, type), JSON.stringify(value));
  } catch (e) {
    console.error(`KV set error for ${type}:`, e);
  }
}

export async function kvDel(athleteId: string, type: DataType): Promise<void> {
  try {
    await getRedis().del(key(athleteId, type));
  } catch (e) {
    console.error(`KV del error for ${type}:`, e);
  }
}
