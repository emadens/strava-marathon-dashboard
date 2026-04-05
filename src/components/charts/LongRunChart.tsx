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
    const longRuns = activities
      .filter(a => a.distance >= 15000)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return {
      labels: longRuns.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: longRuns.map(a => +(a.distance / 1000).toFixed(2)),
        borderColor: 'rgba(255,77,0,0.9)',
        backgroundColor: 'rgba(255,77,0,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(255,77,0,1)',
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    };
  }, [activities]);

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Progressione Long Run</div>
      <div className="text-[0.72rem] text-muted mb-5">distanza uscite lunghe (&gt;15km)</div>
      <Line data={data} options={getChartOptions({ showLegend: false, showDataLabels: true, dataLabelFormatter: (v: number) => v > 0 ? v.toFixed(1) : '' }) as Parameters<typeof Line>[0]['options']} height={220} />
    </Card>
  );
}
