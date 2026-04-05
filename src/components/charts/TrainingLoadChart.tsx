'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { getChartOptions } from './chartDefaults';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export function TrainingLoadChart({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    const weeks: Record<string, number> = {};
    activities.forEach(a => {
      const d = new Date(a.start_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const tss = (a.moving_time / 3600) * (1 + (a.average_heartrate ? a.average_heartrate / 150 : 1)) * 30;
      weeks[key] = (weeks[key] || 0) + tss;
    });

    const labels = Object.keys(weeks).sort().slice(-12);
    const values = labels.map(k => Math.round(weeks[k]));
    const max = Math.max(...values, 1);

    return {
      labels: labels.map(l => new Date(l).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: values,
        backgroundColor: values.map(v => {
          const intensity = v / max;
          return `rgba(255,${Math.round(77 + (140 - 77) * (1 - intensity))},${Math.round(intensity * 50)},0.8)`;
        }),
        borderRadius: 4,
      }],
    };
  }, [activities]);

  return (
    <Card className="col-span-4 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Carico allenamento</div>
      <div className="text-[0.72rem] text-muted mb-5">TSS stimato (settimane)</div>
      <Bar data={data} options={getChartOptions({ showLegend: false }) as Parameters<typeof Bar>[0]['options']} height={220} />
    </Card>
  );
}
