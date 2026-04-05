'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { getChartOptions } from './chartDefaults';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function LongRunChart({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    // Group by week, take the longest run of each week (= the long run)
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
      .filter(a => a.distance >= 8000) // min 8km to qualify as a long run
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return {
      labels: longRuns.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
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
  }, [activities]);

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Progressione Long Run</div>
      <div className="text-[0.72rem] text-muted mb-5">corsa piu lunga per settimana (&#9679; arancio = &gt;21km)</div>
      <Line data={data} options={getChartOptions({ showLegend: false, showDataLabels: true, dataLabelFormatter: (v: number) => v > 0 ? v.toFixed(1) : '' }) as Parameters<typeof Line>[0]['options']} height={220} />
    </Card>
  );
}
