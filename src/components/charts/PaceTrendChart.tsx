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
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Classify runs by pace: fast (<5:30) = quality, slow = easy/long
    const QUALITY_THRESHOLD = 5.5; // 5:30 min/km

    const labels = sorted.map(a => new Date(a.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short' }));
    const allPaces = sorted.map(a => +(1000 / a.average_speed / 60).toFixed(2));

    // Quality runs (tempo/intervals) - only paces below threshold
    const qualityPaces = sorted.map(a => {
      const pace = 1000 / a.average_speed / 60;
      return pace < QUALITY_THRESHOLD ? +pace.toFixed(2) : null;
    });

    // Easy/long runs - paces above threshold
    const easyPaces = sorted.map(a => {
      const pace = 1000 / a.average_speed / 60;
      return pace >= QUALITY_THRESHOLD ? +pace.toFixed(2) : null;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Qualita (Tempo/Interval)',
          data: qualityPaces,
          borderColor: 'rgba(255,77,0,0.9)',
          backgroundColor: 'rgba(255,77,0,0.05)',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: 'rgba(255,77,0,1)',
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
        },
        {
          label: 'Easy/Long',
          data: easyPaces,
          borderColor: 'rgba(57,211,83,0.6)',
          backgroundColor: 'rgba(57,211,83,0.05)',
          borderWidth: 1.5,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: 'rgba(57,211,83,0.8)',
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: true,
        },
      ],
    };
  }, [activities]);

  return (
    <Card className="col-span-6 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Trend ritmo</div>
      <div className="text-[0.72rem] text-muted mb-5">
        <span style={{ color: '#ff4d00' }}>&#9679;</span> qualita (&lt;5:30)
        <span className="mx-2">|</span>
        <span style={{ color: '#39d353' }}>&#9679;</span> easy/long (&gt;5:30)
      </div>
      <Line
        data={data}
        options={{
          responsive: true,
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
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
