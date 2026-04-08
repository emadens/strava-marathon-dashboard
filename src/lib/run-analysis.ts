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
  // Filter out incomplete last split (<500m = end-of-run stub that skews the average)
  const validSplits = splits.filter((s, i) => i < splits.length - 1 || s.distance >= 500);
  const paces = validSplits.map(s => s.average_speed > 0 ? 1000 / s.average_speed : 0).filter(p => p > 0);
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
  // Filter out incomplete last split (<500m)
  const valid = splits.filter((s, i) => i < splits.length - 1 || s.distance >= 500);
  if (valid.length < 4) return null;
  const mid = Math.floor(valid.length / 2);
  const firstHalf = valid.slice(0, mid).filter(s => s.average_speed > 0);
  const secondHalf = valid.slice(mid).filter(s => s.average_speed > 0);
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

// === V2: CARDIAC EFFICIENCY ===

/**
 * Compare HR at similar pace between selected week and a comparable week from the past.
 * Searches backwards through weeks (up to 8) until finding one with valid pace pairs.
 * Returns how many weeks ago the comparison is from.
 */
export function cardiacEfficiency(
  selectedWeekActs: StravaActivity[],
  allActivities: StravaActivity[],
  selectedWeekStart: Date
): { hrDelta: number; paceRange: string; thisHR: number; prevHR: number; pairs: number; weeksAgo: number; valid: boolean } | null {
  const withHR = (acts: StravaActivity[]) => acts.filter(a => a.average_heartrate && a.average_speed > 0);
  const thisHR = withHR(selectedWeekActs);
  if (thisHR.length < 1) return null;

  // Search backwards through weeks to find comparable HR data
  for (let weeksBack = 1; weeksBack <= 8; weeksBack++) {
    const prevStart = new Date(selectedWeekStart);
    prevStart.setDate(prevStart.getDate() - weeksBack * 7);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + 7);

    const prevActs = allActivities.filter(a => {
      const d = new Date(a.start_date);
      return d >= prevStart && d < prevEnd;
    });
    const prevHRActs = withHR(prevActs);
    if (prevHRActs.length < 1) continue;

    // Find pairs with similar pace (±15%)
    const pairs: { thisHR: number; prevHR: number }[] = [];
    for (const t of thisHR) {
      const tPace = 1000 / t.average_speed;
      for (const p of prevHRActs) {
        const pPace = 1000 / p.average_speed;
        if (Math.abs(tPace - pPace) / pPace < 0.15) {
          pairs.push({ thisHR: t.average_heartrate!, prevHR: p.average_heartrate! });
        }
      }
    }

    if (pairs.length < 1) continue;

    const avgThisHR = pairs.reduce((s, p) => s + p.thisHR, 0) / pairs.length;
    const avgPrevHR = pairs.reduce((s, p) => s + p.prevHR, 0) / pairs.length;
    const avgPace = thisHR.reduce((s, a) => s + 1000 / a.average_speed, 0) / thisHR.length;

    return {
      hrDelta: avgPrevHR - avgThisHR,
      thisHR: Math.round(avgThisHR),
      prevHR: Math.round(avgPrevHR),
      pairs: pairs.length,
      weeksAgo: weeksBack,
      paceRange: fmtPace(avgPace),
      valid: true,
    };
  }

  return null; // No comparable week found in the last 8 weeks
}

// === V2: HISTORICAL TYPE COMPARISON ===

export interface TypeComparison {
  type: string;
  currentPace: number;
  historicalAvgPace: number;
  delta: number; // sec/km difference (positive = faster than historical)
  currentHR: number | null;
  historicalAvgHR: number | null;
  sampleSize: number;
}

/**
 * Compare an activity against historical average for its type.
 * Type determined by plan association or pace threshold.
 */
export function compareVsHistorical(
  activity: StravaActivity,
  allActivities: StravaActivity[],
  activityType?: string
): TypeComparison | null {
  const type = activityType || classifyRunType(activity);
  if (!type) return null;

  // Get same-type activities from last 8 weeks (excluding current)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const historical = allActivities.filter(a => {
    if (a.id === activity.id) return false;
    if (new Date(a.start_date) < eightWeeksAgo) return false;
    return classifyRunType(a) === type;
  });

  if (historical.length < 3) return null; // Need at least 3 for meaningful comparison

  const histPaces = historical.filter(a => a.average_speed > 0);
  const avgHistPace = histPaces.reduce((s, a) => s + 1000 / a.average_speed, 0) / histPaces.length;
  const currentPace = 1000 / activity.average_speed;

  const histHRActs = historical.filter(a => a.average_heartrate);
  const avgHistHR = histHRActs.length >= 3
    ? histHRActs.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) / histHRActs.length
    : null;

  return {
    type,
    currentPace,
    historicalAvgPace: avgHistPace,
    delta: avgHistPace - currentPace, // positive = faster than historical
    currentHR: activity.average_heartrate,
    historicalAvgHR: avgHistHR,
    sampleSize: historical.length,
  };
}

export function classifyRunType(a: StravaActivity): string {
  const paceMinKm = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
  const distKm = a.distance / 1000;
  if (distKm >= 15) return 'long_run';
  if (paceMinKm < 5.5 && distKm >= 5) return 'quality';
  if (paceMinKm >= 5.5 && distKm < 12) return 'easy';
  return 'other';
}

const TYPE_LABELS: Record<string, string> = {
  easy: 'Easy Run',
  quality: 'Quality (Tempo/Interval)',
  long_run: 'Long Run',
  other: 'Altro',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

// === V3: VDOT TREND ===

export interface VDOTTrend {
  currentVDOT: number;
  previousVDOT: number | null;
  delta: number;
  paceDelta: number; // sec/km improvement in marathon pace
  basedOn: string; // e.g. "10K in 59:17"
}

/**
 * Calculate VDOT trend by comparing best efforts between two periods.
 * Requires cached activity details with best_efforts.
 */
export function vdotTrend(
  recentBestEfforts: Array<{ name: string; elapsed_time: number; distance: number; start_date: string }>,
  olderBestEfforts: Array<{ name: string; elapsed_time: number; distance: number; start_date: string }>
): VDOTTrend | null {
  // Import inline to avoid circular dependency issues
  const { calculateVDOT, predictRaceTime } = require('./vdot');

  // Find the best recent effort (prefer longer distances)
  const priority = ['marathon', 'half-marathon', '10k', '5k', '1 mile', '1k'];
  let bestRecent: typeof recentBestEfforts[0] | null = null;
  for (const name of priority) {
    const match = recentBestEfforts.find(e => e.name.toLowerCase().replace('-', ' ') === name.replace('-', ' '));
    if (match) { bestRecent = match; break; }
  }
  if (!bestRecent) bestRecent = recentBestEfforts[0];
  if (!bestRecent) return null;

  const currentVDOT = calculateVDOT(bestRecent.distance, bestRecent.elapsed_time);

  // Find equivalent older effort
  let bestOlder: typeof olderBestEfforts[0] | null = null;
  const olderSameType = olderBestEfforts.filter(e =>
    e.name.toLowerCase() === bestRecent!.name.toLowerCase()
  );
  if (olderSameType.length > 0) {
    bestOlder = olderSameType.reduce((a, b) => a.elapsed_time < b.elapsed_time ? a : b);
  }

  const previousVDOT = bestOlder ? calculateVDOT(bestOlder.distance, bestOlder.elapsed_time) : null;
  const delta = previousVDOT ? currentVDOT - previousVDOT : 0;

  // Calculate marathon pace delta
  const currentMarathon = predictRaceTime(currentVDOT, 42195);
  const prevMarathon = previousVDOT ? predictRaceTime(previousVDOT, 42195) : currentMarathon;
  const paceDelta = (prevMarathon / 42.195) - (currentMarathon / 42.195); // sec/km improvement

  const durationMin = Math.floor(bestRecent.elapsed_time / 60);
  const durationSec = bestRecent.elapsed_time % 60;

  return {
    currentVDOT,
    previousVDOT,
    delta,
    paceDelta,
    basedOn: `${bestRecent.name} in ${durationMin}:${String(Math.round(durationSec)).padStart(2, '0')}`,
  };
}
