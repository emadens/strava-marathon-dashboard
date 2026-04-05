'use client';

import { useMemo, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { getChartOptions } from './chartDefaults';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import type { StravaActivity } from '@/types/strava';
import type { TrainingPlan, TrainingWeek } from '@/types/training-plan';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MONTHS: Record<string, number> = {
  'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
  'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
  'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
};
const DAY_ORDER = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

function parseWeekStartDate(dateRange: string): Date | null {
  const parts = dateRange.split('-');
  if (!parts.length) return null;
  const match = parts[0].trim().match(/(\d+)\s+(\w+)/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthKey = match[2].toLowerCase().slice(0, 3);
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  const year = month >= 11 ? 2025 : 2026;
  return new Date(year, month, day);
}

const PLAN_KEY = 'marathon_training_plans';

interface LongRunChartProps {
  activities: StravaActivity[];
  planWeeks?: TrainingWeek[];
  getMatchResult?: (wi: number, si: number, session: TrainingWeek['sessions'][0]) => { activity: StravaActivity; isManual: boolean } | null;
}

export function LongRunChart({ activities, planWeeks: propPlanWeeks, getMatchResult }: LongRunChartProps) {
  const [storedPlanWeeks, setStoredPlanWeeks] = useState<TrainingWeek[]>([]);

  useEffect(() => {
    if (!propPlanWeeks) {
      const saved = localStorage.getItem(PLAN_KEY);
      if (saved) {
        const plans: TrainingPlan[] = JSON.parse(saved);
        if (plans.length > 0) setStoredPlanWeeks(plans[0].weeks);
      }
    }
  }, [propPlanWeeks]);

  const planWeeks = propPlanWeeks || storedPlanWeeks;

  const data = useMemo(() => {
    // Determine date range from filtered activities to scope the plan ghost
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    if (activities.length > 0) {
      const dates = activities.map(a => new Date(a.start_date).getTime());
      rangeStart = new Date(Math.min(...dates));
      rangeEnd = new Date(Math.max(...dates));
      // Extend range end to today if it's within the range
      const now = new Date();
      if (now > rangeEnd) rangeEnd = now;
    }

    // === Planned long runs (filtered to same date range as activities) ===
    const plannedLongRuns: { date: Date; km: number; weekIdx: number; sessionIdx: number }[] = [];
    planWeeks.forEach((week, wi) => {
      const weekData = week as TrainingWeek & { dateRange?: string };
      if (!weekData.dateRange) return;
      const weekStart = parseWeekStartDate(weekData.dateRange);
      if (!weekStart) return;
      const longSessionIdx = week.sessions.findIndex(s => s.type === 'long_run');
      const longSession = longSessionIdx >= 0 ? week.sessions[longSessionIdx] : null;
      if (longSession && longSession.distanceKm > 0) {
        const dayIdx = DAY_ORDER.indexOf(longSession.dayOfWeek);
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + (dayIdx >= 0 ? dayIdx : 5));
        // Filter: only include if within the selected period
        if (rangeStart && rangeEnd && (date < rangeStart || date > rangeEnd)) return;
        plannedLongRuns.push({ date, km: longSession.distanceKm, weekIdx: wi, sessionIdx: longSessionIdx });
      }
    });

    const hasPlan = plannedLongRuns.length > 0;

    if (hasPlan) {
      // Build actual data from validated matches (if getMatchResult available) or fallback
      const allDates = new Map<string, { planned: number; actual: number | null; isHalf: boolean }>();

      plannedLongRuns.forEach(p => {
        const key = p.date.toISOString().slice(0, 10);
        let actualKm: number | null = null;
        let isHalf = false;

        if (getMatchResult) {
          // Use validated match from plan
          const session = planWeeks[p.weekIdx].sessions[p.sessionIdx];
          const match = getMatchResult(p.weekIdx, p.sessionIdx, session);
          if (match) {
            actualKm = +(match.activity.distance / 1000).toFixed(1);
            isHalf = match.activity.distance >= 21000;
          }
        } else {
          // Fallback: find closest activity by date (±3 days)
          const candidates = activities.filter(a =>
            Math.abs(new Date(a.start_date).getTime() - p.date.getTime()) <= 3 * 24 * 60 * 60 * 1000
          );
          if (candidates.length > 0) {
            const best = candidates.sort((a, b) =>
              Math.abs(new Date(a.start_date).getTime() - p.date.getTime()) -
              Math.abs(new Date(b.start_date).getTime() - p.date.getTime())
            )[0];
            actualKm = +(best.distance / 1000).toFixed(1);
            isHalf = best.distance >= 21000;
          }
        }

        allDates.set(key, { planned: p.km, actual: actualKm, isHalf });
      });

      const sorted = [...allDates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const labels = sorted.map(([k]) => new Date(k).toLocaleDateString('it', { day: '2-digit', month: 'short' }));
      const plannedData = sorted.map(([, v]) => v.planned);
      const actualData = sorted.map(([, v]) => v.actual);

      return {
        labels,
        datasets: [
          {
            label: 'Piano',
            data: plannedData,
            borderColor: 'rgba(77,166,255,0.35)',
            backgroundColor: 'rgba(77,166,255,0.04)',
            borderWidth: 2,
            borderDash: [6, 4],
            fill: true,
            tension: 0.3,
            pointBackgroundColor: 'rgba(77,166,255,0.4)',
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
            order: 2,
          },
          {
            label: 'Effettivo',
            data: actualData,
            borderColor: 'rgba(157,78,221,0.9)',
            backgroundColor: 'rgba(157,78,221,0.08)',
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: sorted.map(([, v]) =>
              v.isHalf ? 'rgba(255,77,0,1)' : v.actual !== null ? 'rgba(157,78,221,1)' : 'transparent'
            ),
            pointRadius: sorted.map(([, v]) => v.actual !== null ? (v.isHalf ? 7 : 5) : 0),
            pointHoverRadius: 7,
            spanGaps: true,
            order: 1,
          },
        ],
      };
    }

    // No plan: longest run per week
    const weeks: Record<string, StravaActivity> = {};
    activities.forEach(a => {
      const d = new Date(a.start_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (!weeks[key] || a.distance > weeks[key].distance) weeks[key] = a;
    });

    const longRuns = Object.values(weeks)
      .filter(a => a.distance >= 8000)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return {
      labels: longRuns.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
        label: 'Effettivo',
        data: longRuns.map(a => +(a.distance / 1000).toFixed(1)),
        borderColor: 'rgba(157,78,221,0.9)',
        backgroundColor: 'rgba(157,78,221,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: longRuns.map(a =>
          a.distance >= 21000 ? 'rgba(255,77,0,1)' : 'rgba(157,78,221,1)'
        ),
        pointRadius: longRuns.map(a => a.distance >= 21000 ? 7 : 5),
        pointHoverRadius: 8,
      }],
    };
  }, [activities, planWeeks, getMatchResult]);

  const hasPlan = planWeeks.length > 0;

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Progressione Long Run</div>
      <div className="text-[0.72rem] text-muted mb-5">
        {hasPlan ? (
          <>
            <span style={{ color: 'rgba(157,78,221,0.9)' }}>&#9644;</span> effettivo (da piano)
            <span className="mx-1.5">|</span>
            <span style={{ color: 'rgba(77,166,255,0.5)' }}>- -</span> pianificato
            <span className="mx-1.5">|</span>
            <span style={{ color: '#ff4d00' }}>&#9679;</span> &gt;21km
          </>
        ) : (
          <>corsa piu lunga per settimana (<span style={{ color: '#ff4d00' }}>&#9679;</span> &gt;21km)</>
        )}
      </div>
      <Line data={data} options={{
        ...getChartOptions({ showLegend: false, showDataLabels: false }) as Parameters<typeof Line>[0]['options'],
        plugins: {
          ...((getChartOptions({ showDataLabels: false }) as Record<string, unknown>).plugins as object),
          datalabels: {
            color: '#999',
            anchor: 'end' as const,
            align: 'top' as const,
            font: { size: 9, family: 'DM Mono' },
            // Only show labels on the "Effettivo" dataset (index 1 with plan, 0 without)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            display: (ctx: any) => {
              const dsIndex = hasPlan ? 1 : 0;
              if (ctx.datasetIndex !== dsIndex) return false;
              const val = ctx.dataset.data[ctx.dataIndex];
              return val !== null && val > 0;
            },
            formatter: (v: number) => v > 0 ? v.toFixed(1) : '',
          },
        },
      }} height={220} />
      <ChartExplainer>
        <strong>Progressione Long Run</strong>: {hasPlan
          ? 'mostra la distanza effettiva delle long run associate nel piano vs la distanza pianificata.'
          : 'mostra la corsa piu lunga di ogni settimana.'
        }
        {hasPlan && (
          <>
            <br />La <strong style={{ color: 'rgba(77,166,255,0.7)' }}>linea tratteggiata blu</strong> e&apos; la distanza pianificata dal piano Runna.
            <br />La <strong style={{ color: 'rgba(157,78,221,0.9)' }}>linea solida viola</strong> usa le attivita {getMatchResult ? 'validate/confermate dall\'utente' : 'matchate per data (±3 giorni)'}.
          </>
        )}
        <br />I pallini arancioni indicano corse &ge;21km (mezza maratona o piu).
      </ChartExplainer>
    </Card>
  );
}
