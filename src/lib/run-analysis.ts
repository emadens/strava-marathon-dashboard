import type { StravaSplit } from '@/types/strava';
import type { StravaActivity } from '@/types/strava';
import { fmtPace } from './utils';

// === PACING ANALYSIS ===

/**
 * Pacing consistency index (%).
 * Lower = more consistent. <5% = very consistent, 5-10% = normal, >10% = irregular.
 */
export function pacingIndex(splits: StravaSplit[]): number {
  if (splits.length < 2) return 0;
  const paces = splits.map(s => s.average_speed > 0 ? 1000 / s.average_speed : 0).filter(p => p > 0);
  if (paces.length < 2) return 0;
  const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
  const variance = paces.reduce((a, p) => a + (p - mean) ** 2, 0) / paces.length;
  return (Math.sqrt(variance) / mean) * 100;
}

export function pacingLabel(index: number): { label: string; color: string } {
  if (index < 5) return { label: 'Molto costante', color: 'var(--green)' };
  if (index < 10) return { label: 'Normale', color: 'var(--yellow)' };
  return { label: 'Irregolare', color: 'var(--red)' };
}

// === SPLIT ANALYSIS ===

export interface SplitAnalysis {
  type: 'negative' | 'even' | 'positive';
  label: string;
  firstHalfPace: number;  // sec/km
  secondHalfPace: number; // sec/km
  delta: number;          // sec/km (positive = second half faster)
}

/**
 * Negative/Even/Positive split analysis.
 * Negative = second half faster (good for marathon).
 */
export function splitAnalysis(splits: StravaSplit[]): SplitAnalysis | null {
  if (splits.length < 4) return null;
  const mid = Math.floor(splits.length / 2);
  const firstHalf = splits.slice(0, mid).filter(s => s.average_speed > 0);
  const secondHalf = splits.slice(mid).filter(s => s.average_speed > 0);
  if (!firstHalf.length || !secondHalf.length) return null;

  const avgFirst = firstHalf.reduce((s, sp) => s + 1000 / sp.average_speed, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, sp) => s + 1000 / sp.average_speed, 0) / secondHalf.length;
  const delta = avgFirst - avgSecond; // positive = second half faster

  const type = Math.abs(delta) < 3 ? 'even' : delta > 0 ? 'negative' : 'positive';
  const labels = { negative: 'Negative split', even: 'Even split', positive: 'Positive split' };

  return { type, label: labels[type], firstHalfPace: avgFirst, secondHalfPace: avgSecond, delta };
}

// === BEST/WORST KM ===

export interface KmHighlight {
  split: number;
  pace: number;         // sec/km
  elevation: number;    // meters
  gradient: number;     // %
  hr: number | null;
}

/**
 * Find fastest and slowest km, with terrain context.
 * Also finds "fastest on flat" excluding steep descents (<-2% gradient).
 */
export function kmHighlights(splits: StravaSplit[]): {
  fastest: KmHighlight;
  slowest: KmHighlight;
  fastestFlat: KmHighlight | null;
} | null {
  const valid = splits.filter(s => s.average_speed > 0);
  if (valid.length < 2) return null;

  const toHighlight = (s: StravaSplit): KmHighlight => ({
    split: s.split,
    pace: 1000 / s.average_speed,
    elevation: s.elevation_difference,
    gradient: s.distance > 0 ? (s.elevation_difference / s.distance) * 100 : 0,
    hr: s.average_heartrate,
  });

  const sorted = [...valid].sort((a, b) => (1000 / b.average_speed) - (1000 / a.average_speed));
  const fastest = toHighlight(sorted[sorted.length - 1]);
  const slowest = toHighlight(sorted[0]);

  // Fastest on flat (excluding steep descents >2%)
  const flat = valid.filter(s => {
    const grad = s.distance > 0 ? (s.elevation_difference / s.distance) * 100 : 0;
    return grad > -2;
  });
  const flatSorted = flat.sort((a, b) => (1000 / a.average_speed) - (1000 / b.average_speed));
  const fastestFlat = flatSorted.length > 0 && flatSorted[0] !== sorted[sorted.length - 1]
    ? toHighlight(flatSorted[0])
    : null;

  return { fastest, slowest, fastestFlat };
}

// === HR DRIFT ===

/**
 * HR drift: ratio of avg HR in last 3km vs first 3km.
 * Only valid if: >=6 splits with HR, pacing index <10%, avg elevation <15m/km.
 */
export function hrDrift(splits: StravaSplit[]): { ratio: number; valid: boolean; reason?: string } | null {
  const withHR = splits.filter(s => s.average_heartrate && s.average_heartrate > 0);
  if (withHR.length < 6) return null;

  // Check pacing is stable enough
  const pi = pacingIndex(splits);
  if (pi > 10) return { ratio: 0, valid: false, reason: 'Ritmo troppo irregolare per calcolare il drift' };

  // Check not too hilly
  const avgElev = splits.reduce((s, sp) => s + Math.abs(sp.elevation_difference), 0) / splits.length;
  if (avgElev > 15) return { ratio: 0, valid: false, reason: 'Dislivello troppo elevato per un drift affidabile' };

  const first3 = withHR.slice(0, 3).reduce((s, sp) => s + sp.average_heartrate!, 0) / 3;
  const last3 = withHR.slice(-3).reduce((s, sp) => s + sp.average_heartrate!, 0) / 3;

  return { ratio: last3 / first3, valid: true };
}

// === NARRATIVE GENERATION ===

export interface Narrative {
  text: string;
  type: 'positive' | 'neutral' | 'warning';
}

/**
 * Generate 2-4 narrative takeaways from splits data.
 * Only generates narratives backed by real data.
 */
export function generateNarratives(splits: StravaSplit[], activity: StravaActivity): Narrative[] {
  const narratives: Narrative[] = [];
  if (!splits.length) return narratives;

  // 1. Pacing consistency
  const pi = pacingIndex(splits);
  if (pi > 0) {
    const pl = pacingLabel(pi);
    narratives.push({
      text: `Ritmo ${pl.label.toLowerCase()}: variazione del ${pi.toFixed(1)}%`,
      type: pi < 5 ? 'positive' : pi < 10 ? 'neutral' : 'warning',
    });
  }

  // 2. Split analysis
  const sa = splitAnalysis(splits);
  if (sa) {
    if (sa.type === 'negative') {
      narratives.push({
        text: `Seconda meta piu veloce di ${Math.abs(sa.delta).toFixed(0)} sec/km (negative split)`,
        type: 'positive',
      });
    } else if (sa.type === 'positive' && Math.abs(sa.delta) > 5) {
      narratives.push({
        text: `Seconda meta piu lenta di ${Math.abs(sa.delta).toFixed(0)} sec/km (positive split)`,
        type: 'warning',
      });
    }
  }

  // 3. Slowest km with terrain context
  const highlights = kmHighlights(splits);
  if (highlights) {
    const worst = highlights.slowest;
    if (worst.elevation > 5) {
      narratives.push({
        text: `Km ${worst.split} il piu lento (${fmtPace(worst.pace)}/km) — salita di +${worst.elevation.toFixed(0)}m`,
        type: 'neutral',
      });
    }
  }

  // 4. HR drift (if valid)
  const drift = hrDrift(splits);
  if (drift?.valid) {
    const pct = ((drift.ratio - 1) * 100).toFixed(0);
    if (drift.ratio < 1.06) {
      narratives.push({
        text: `HR stabile: drift contenuto al +${pct}%`,
        type: 'positive',
      });
    } else if (drift.ratio > 1.15) {
      narratives.push({
        text: `Drift cardiaco significativo: +${pct}% (FC in aumento)`,
        type: 'warning',
      });
    }
  }

  return narratives.slice(0, 4);
}

// === WEEKLY COMPARISON ===

export interface WeeklyComparison {
  thisWeek: { km: number; runs: number; easyPace: number | null };
  lastWeek: { km: number; runs: number; easyPace: number | null };
  avg4Weeks: { km: number; runs: number; easyPace: number | null };
}

/**
 * Compare this week vs last week vs 4-week average.
 * Easy pace only calculated if >=2 easy runs in the period.
 */
export function weeklyComparison(activities: StravaActivity[]): WeeklyComparison {
  const now = new Date();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const fourWeeksAgo = new Date(thisMonday);
  fourWeeksAgo.setDate(thisMonday.getDate() - 28);

  const inRange = (a: StravaActivity, start: Date, end: Date) => {
    const d = new Date(a.start_date);
    return d >= start && d < end;
  };

  const calcStats = (acts: StravaActivity[]) => {
    const km = acts.reduce((s, a) => s + a.distance / 1000, 0);
    const runs = acts.length;
    // Easy runs: pace > 5:30/km (5.5 min/km) and < 12km
    const easyRuns = acts.filter(a => {
      const pace = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
      return pace > 5.5 && a.distance < 12000;
    });
    const easyPace = easyRuns.length >= 2
      ? easyRuns.reduce((s, a) => s + 1000 / a.average_speed, 0) / easyRuns.length
      : null;
    return { km, runs, easyPace };
  };

  const thisWeekActs = activities.filter(a => inRange(a, thisMonday, now));
  const lastWeekActs = activities.filter(a => inRange(a, lastMonday, thisMonday));
  const fourWeekActs = activities.filter(a => inRange(a, fourWeeksAgo, thisMonday));

  const avg4 = calcStats(fourWeekActs);
  // Average over 4 weeks
  avg4.km /= 4;
  avg4.runs = Math.round(avg4.runs / 4);

  return {
    thisWeek: calcStats(thisWeekActs),
    lastWeek: calcStats(lastWeekActs),
    avg4Weeks: avg4,
  };
}
