/**
 * Format seconds per km into mm:ss pace string
 */
export function fmtPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into a human-readable duration
 */
export function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Format seconds into HH:MM:SS
 */
export function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format a date in short Italian style: "05 apr"
 */
export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('it', { day: '2-digit', month: 'short' });
}

/**
 * Format a date in Italian with weekday: "lun 05 apr"
 */
export function fmtDateWithDay(d: Date): string {
  return d.toLocaleDateString('it', { weekday: 'short', day: '2-digit', month: 'short' });
}

/**
 * Calculate pace color for a given pace (lower = faster = more accent)
 */
export function paceColor(paceMinKm: number, minPace: number, maxPace: number): string {
  const range = maxPace - minPace || 1;
  const normalized = Math.max(0, Math.min(1, (paceMinKm - minPace) / range));
  // Fast = accent (orange), slow = muted
  const r = Math.round(255 - normalized * 153);
  const g = Math.round(77 + normalized * 25);
  const b = Math.round(0 + normalized * 102);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
