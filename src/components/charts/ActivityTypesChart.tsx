'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['rgba(255,77,0,0.85)', 'rgba(255,140,66,0.85)', 'rgba(77,166,255,0.85)', 'rgba(57,211,83,0.85)', 'rgba(255,209,102,0.85)'];

export function ActivityTypesChart({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    const types: Record<string, number> = {};
    activities.forEach(a => {
      const t = a.sport_type || a.type || 'Run';
      types[t] = (types[t] || 0) + 1;
    });

    return {
      labels: Object.keys(types),
      datasets: [{
        data: Object.values(types),
        backgroundColor: COLORS,
        borderWidth: 0,
        hoverOffset: 4,
      }],
    };
  }, [activities]);

  return (
    <Card className="col-span-4 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Tipo attivita</div>
      <div className="text-[0.72rem] text-muted mb-5">distribuzione per tipo</div>
      <Doughnut
        data={data}
        options={{
          responsive: true,
          cutout: '65%',
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: '#666', font: { size: 11, family: 'DM Mono' }, padding: 12 } },
            tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} attivita` } },
          },
        }}
        height={200}
      />
    </Card>
  );
}
