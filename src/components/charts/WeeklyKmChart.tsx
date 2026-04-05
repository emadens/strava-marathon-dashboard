'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { getChartOptions } from './chartDefaults';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export function WeeklyKmChart({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    const weeks: Record<string, number> = {};
    activities.forEach(a => {
      const d = new Date(a.start_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      weeks[key] = (weeks[key] || 0) + a.distance / 1000;
    });

    const labels = Object.keys(weeks).sort();
    const values = labels.map(k => +weeks[k].toFixed(1));
    const max = Math.max(...values);

    return {
      labels: labels.map(l => new Date(l).toLocaleDateString('it', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: values,
        backgroundColor: values.map(v => v === max ? 'rgba(255,77,0,0.9)' : 'rgba(255,77,0,0.35)'),
        borderRadius: 4,
        borderSkipped: false as const,
      }],
    };
  }, [activities]);

  return (
    <Card className="col-span-8 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Chilometraggio settimanale</div>
      <div className="text-[0.72rem] text-muted mb-5">km per settimana nel periodo selezionato</div>
      <Bar data={data} options={getChartOptions({ showLegend: false, showDataLabels: true, dataLabelFormatter: (v: number) => v > 0 ? v.toFixed(1) : '' }) as Parameters<typeof Bar>[0]['options']} height={200} />
    </Card>
  );
}
