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

export function LongRunChart({ activities }: { activities: StravaActivity[] }) {
  const [planWeeks, setPlanWeeks] = useState<TrainingWeek[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(PLAN_KEY);
    if (saved) {
      const plans: TrainingPlan[] = JSON.parse(saved);
      if (plans.length > 0) setPlanWeeks(plans[0].weeks);
    }
  }, []);

  const data = useMemo(() => {
    // === Actual long runs: longest run per week ===
    const weeks: Record<string, StravaActivity> = {};
    activities.forEach(a => {
      const d = new Date(a.start_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (!weeks[key] || a.distance > weeks[key].distance) {
        weeks[key] = a;
      }
    });

    const longRuns = Object.values(weeks)
      .filter(a => a.distance >= 8000)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // === Planned long runs from training plan ===
    const plannedLongRuns: { date: Date; km: number }[] = [];
    planWeeks.forEach(week => {
      const weekData = week as TrainingWeek & { dateRange?: string };
      if (!weekData.dateRange) return;
      const weekStart = parseWeekStartDate(weekData.dateRange);
      if (!weekStart) return;
      // Find the long_run session in this week
      const longSession = week.sessions.find(s => s.type === 'long_run');
      if (longSession && longSession.distanceKm > 0) {
        // Long run is typically on Saturday (index 5)
        const dayIdx = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'].indexOf(longSession.dayOfWeek);
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + (dayIdx >= 0 ? dayIdx : 5));
        plannedLongRuns.push({ date, km: longSession.distanceKm });
      }
    });

    const hasPlan = plannedLongRuns.length > 0;

    // Build unified timeline: all dates from both actual and planned
    if (hasPlan) {
      // Use planned dates as the x-axis, overlay actual data
      const allDates = new Map<string, { planned: number | null; actual: number | null; isHalf: boolean }>();

      plannedLongRuns.forEach(p => {
        const key = p.date.toISOString().slice(0, 10);
        allDates.set(key, { planned: p.km, actual: null, isHalf: false });
      });

      longRuns.forEach(a => {
        const d = new Date(a.start_date);
        const key = d.toISOString().slice(0, 10);
        const km = +(a.distance / 1000).toFixed(1);
        // Try to match to nearest planned date (±3 days)
        let matched = false;
        for (const [pKey, pVal] of allDates) {
          const pDate = new Date(pKey);
          if (Math.abs(d.getTime() - pDate.getTime()) <= 3 * 24 * 60 * 60 * 1000) {
            pVal.actual = km;
            pVal.isHalf = a.distance >= 21000;
            matched = true;
            break;
          }
        }
        if (!matched) {
          allDates.set(key, { planned: null, actual: km, isHalf: a.distance >= 21000 });
        }
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
            order: 2, // behind actual
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
              v.isHalf ? 'rgba(255,77,0,1)' : 'rgba(157,78,221,1)'
            ),
            pointRadius: sorted.map(([, v]) => v.actual !== null ? (v.isHalf ? 7 : 5) : 0),
            pointHoverRadius: 7,
            spanGaps: true,
            order: 1, // in front
          },
        ],
      };
    }

    // No plan: original behavior
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
  }, [activities, planWeeks]);

  const hasPlan = planWeeks.length > 0;

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Progressione Long Run</div>
      <div className="text-[0.72rem] text-muted mb-5">
        {hasPlan ? (
          <>
            <span style={{ color: 'rgba(157,78,221,0.9)' }}>&#9644;</span> effettivo
            <span className="mx-1.5">|</span>
            <span style={{ color: 'rgba(77,166,255,0.5)' }}>- -</span> piano
            <span className="mx-1.5">|</span>
            <span style={{ color: '#ff4d00' }}>&#9679;</span> &gt;21km
          </>
        ) : (
          <>corsa piu lunga per settimana (<span style={{ color: '#ff4d00' }}>&#9679;</span> &gt;21km)</>
        )}
      </div>
      <Line data={data} options={getChartOptions({ showLegend: false, showDataLabels: true, dataLabelFormatter: (v: number) => v > 0 ? v.toFixed(1) : '' }) as Parameters<typeof Line>[0]['options']} height={220} />
      <ChartExplainer>
        <strong>Progressione Long Run</strong>: mostra la corsa piu lunga di ogni settimana.
        {hasPlan && (
          <>
            <br />La <strong style={{ color: 'rgba(77,166,255,0.7)' }}>linea tratteggiata blu</strong> e&apos; la distanza pianificata dal piano Runna (sempre visibile su tutto il piano).
            <br />La <strong style={{ color: 'rgba(157,78,221,0.9)' }}>linea solida viola</strong> e&apos; la distanza effettivamente corsa.
            <br />Le corse vengono matchate al piano per data (±3 giorni).
          </>
        )}
        <br />I pallini arancioni indicano corse &ge;21km (mezza maratona o piu).
        <br />Utile per verificare la progressione graduale del lungo verso la distanza obiettivo.
      </ChartExplainer>
    </Card>
  );
}
