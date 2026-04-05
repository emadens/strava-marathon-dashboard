import { kv } from '@vercel/kv';

/**
 * All user data keys, scoped by athlete ID.
 * Format: {athleteId}:{dataType}
 */
type DataType =
  | 'plans'
  | 'manual_matches'
  | 'skipped_sessions'
  | 'goals'
  | 'hr_zones'
  | 'vo2max'
  | 'saved_date_ranges'
  | 'ocr_count';

function key(athleteId: string, type: DataType): string {
  return `user:${athleteId}:${type}`;
}

export async function kvGet<T>(athleteId: string, type: DataType): Promise<T | null> {
  try {
    return await kv.get<T>(key(athleteId, type));
  } catch {
    return null;
  }
}

export async function kvSet<T>(athleteId: string, type: DataType, value: T): Promise<void> {
  try {
    await kv.set(key(athleteId, type), value);
  } catch (e) {
    console.error(`KV set error for ${type}:`, e);
  }
}

export async function kvDel(athleteId: string, type: DataType): Promise<void> {
  try {
    await kv.del(key(athleteId, type));
  } catch (e) {
    console.error(`KV del error for ${type}:`, e);
  }
}
