'use client';

import { useMemo } from 'react';
import { KPICard } from './KPICard';
import { fmtPace } from '@/lib/utils';
import type { StravaActivity } from '@/types/strava';

interface KPIGridProps {
  activities: StravaActivity[];
  previous: StravaActivity[];
}

function calcDelta(curr: number, prev: number, higherBetter: boolean): { value: string; isPositive: boolean } | null {
  if (!prev) return null;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(0);
  const isGood = higherBetter ? diff > 0 : diff < 0;
  return {
    value: `${diff > 0 ? '↑' : '↓'} ${Math.abs(Number(pct))}% vs periodo prec.`,
    isPositive: isGood,
  };
}

export function KPIGrid({ activities: acts, previous: prev }: KPIGridProps) {
  const kpis = useMemo(() => {
    const totalKm = acts.reduce((s, a) => s + a.distance / 1000, 0);
    const prevKm = prev.reduce((s, a) => s + a.distance / 1000, 0);
    const totalTime = acts.reduce((s, a) => s + a.moving_time, 0);
    const totalElev = acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);

    const paceActs = acts.filter(a => a.average_speed > 0);
    const avgPace = paceActs.length
      ? paceActs.reduce((s, a) => s + (1000 / a.average_speed), 0) / paceActs.length
      : 0;
    const prevPaceActs = prev.filter(a => a.average_speed > 0);
    const prevAvgPace = prevPaceActs.length
      ? prevPaceActs.reduce((s, a) => s + (1000 / a.average_speed), 0) / prevPaceActs.length
      : 0;

    const hrActs = acts.filter(a => a.average_heartrate);
    const avgHR = hrActs.length
      ? hrActs.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) / hrActs.length
      : 0;

    let paceDelta: { value: string; isPositive: boolean } | null = null;
    if (avgPace > 0 && prevAvgPace > 0) {
      const diff = prevAvgPace - avgPace;
      paceDelta = {
        value: `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(0)}s/km vs periodo prec.`,
        isPositive: diff > 0,
      };
    }

    return {
      distance: { value: totalKm.toFixed(1), delta: calcDelta(totalKm, prevKm, true) },
      count: { value: String(acts.length) },
      pace: { value: avgPace > 0 ? fmtPace(avgPace) : '—', delta: paceDelta },
      elevation: { value: String(Math.round(totalElev)) },
      time: { value: (totalTime / 3600).toFixed(1) },
      hr: { value: avgHR > 0 ? String(Math.round(avgHR)) : '—' },
    };
  }, [acts, prev]);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-6">
      <KPICard label="Distanza" value={kpis.distance.value} unit="km nel periodo" delta={kpis.distance.delta} delay={1} />
      <KPICard label="Attivita" value={kpis.count.value} unit="corse" delay={2} />
      <KPICard label="Ritmo medio" value={kpis.pace.value} unit="min/km" delta={kpis.pace.delta} delay={3} />
      <KPICard label="Dislivello" value={kpis.elevation.value} unit="m totali" delay={4} />
      <KPICard label="Tempo" value={kpis.time.value} unit="ore totali" delay={5} />
      <KPICard label="FC media" value={kpis.hr.value} unit="bpm" delay={6} />
    </div>
  );
}
