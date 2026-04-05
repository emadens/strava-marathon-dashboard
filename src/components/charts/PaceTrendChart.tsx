'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { fmtPace } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function PaceTrendChart({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    const sorted = [...activities]
      .filter(a => a.average_speed > 0)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(-30);

    return {
      labels: sorted.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: sorted.map(a => +(1000 / a.average_speed / 60).toFixed(2)),
        borderColor: 'rgba(77,166,255,0.9)',
        backgroundColor: 'rgba(77,166,255,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgba(77,166,255,1)',
        pointRadius: 3,
        pointHoverRadius: 6,
      }],
    };
  }, [activities]);

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Trend ritmo</div>
      <div className="text-[0.72rem] text-muted mb-5">ritmo medio per attivita</div>
      <Line
        data={data}
        options={{
          responsive: true,
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            datalabels: {
              color: '#999',
              anchor: 'end' as const,
              align: 'top' as const,
              font: { size: 9, family: 'DM Mono' },
              formatter: (v: number) => v > 0 ? fmtPace(v * 60) : '',
            },
          },
          scales: {
            y: {
              reverse: true,
              ticks: { color: '#666', font: { size: 11, family: 'DM Mono' }, callback: (v) => fmtPace(Number(v) * 60) },
              grid: { color: 'rgba(255,255,255,0.04)' },
              border: { display: false },
            },
            x: {
              ticks: { color: '#555', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 8 },
              grid: { display: false },
              border: { display: false },
            },
          },
        }}
        height={220}
      />
    </Card>
  );
}
