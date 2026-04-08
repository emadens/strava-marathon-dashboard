'use client';

import { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { fmtPace } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import type { StravaSplit } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Filler);

export function PacingChart({ splits }: { splits: StravaSplit[] }) {
  const data = useMemo(() => {
    const labels = splits.map(s => `${s.split}`);
    const paces = splits.map(s => s.average_speed > 0 ? +(1000 / s.average_speed / 60).toFixed(2) : 0);
    const hrs = splits.map(s => s.average_heartrate ?? null);
    const hasHR = hrs.some(h => h !== null);

    const minPace = Math.min(...paces.filter(p => p > 0));
    const maxPace = Math.max(...paces);
    const range = maxPace - minPace || 1;

    return {
      labels,
      paces,
      hrs,
      hasHR,
      colors: paces.map(p => {
        if (p === 0) return 'rgba(102,102,102,0.3)';
        const norm = (p - minPace) / range; // 0 = fastest, 1 = slowest
        // Green (fast) → Yellow → Orange (slow)
        const r = Math.round(57 + norm * 198);
        const g = Math.round(211 - norm * 134);
        const b = Math.round(83 - norm * 83);
        return `rgba(${r},${g},${b},0.85)`;
      }),
    };
  }, [splits]);

  return (
    <Card hover={false}>
      <div className="font-display text-base tracking-wide mb-0.5">Pace per km</div>
      <div className="text-[0.72rem] text-muted mb-4">
        {data.hasHR && <><span style={{ color: 'rgba(255,77,0,0.8)' }}>—</span> HR (bpm) <span className="mx-1">|</span></>}
        barre colorate per velocita (verde = veloce, arancio = lento)
      </div>

      <div className="relative">
        <Bar
          data={{
            labels: data.labels,
            datasets: [{
              data: data.paces,
              backgroundColor: data.colors,
              borderRadius: 3,
              borderSkipped: false,
              yAxisID: 'y',
            }],
          }}
          options={{
            responsive: true,
            animation: { duration: 400 },
            plugins: {
              legend: { display: false },
              datalabels: {
                color: '#999',
                anchor: 'end',
                align: 'top',
                font: { size: 9, family: 'DM Mono' },
                formatter: (v: number) => v > 0 ? fmtPace(v * 60) : '',
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const pace = ctx.raw as number;
                    const hr = data.hrs[ctx.dataIndex];
                    const elev = splits[ctx.dataIndex]?.elevation_difference;
                    let label = `${fmtPace(pace * 60)}/km`;
                    if (hr) label += ` · ${Math.round(hr)} bpm`;
                    if (elev !== undefined) label += ` · ${elev > 0 ? '+' : ''}${elev.toFixed(0)}m`;
                    return label;
                  },
                },
              },
            },
            scales: {
              y: {
                reverse: true,
                ticks: { color: '#666', font: { size: 10, family: 'DM Mono' }, callback: (v) => fmtPace(Number(v) * 60) },
                grid: { color: 'rgba(255,255,255,0.04)' },
                border: { display: false },
              },
              x: {
                ticks: { color: '#555', font: { size: 10, family: 'DM Mono' } },
                grid: { display: false },
                border: { display: false },
                title: { display: true, text: 'km', color: '#555', font: { size: 10, family: 'DM Mono' } },
              },
            },
          }}
          height={180}
        />

        {/* HR overlay as separate line chart */}
        {data.hasHR && (
          <div className="mt-4">
            <Line
              data={{
                labels: data.labels,
                datasets: [{
                  label: 'HR',
                  data: data.hrs,
                  borderColor: 'rgba(255,77,0,0.7)',
                  backgroundColor: 'rgba(255,77,0,0.05)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.3,
                  pointBackgroundColor: 'rgba(255,77,0,1)',
                  pointRadius: 3,
                  spanGaps: true,
                }],
              }}
              options={{
                responsive: true,
                animation: { duration: 400 },
                plugins: {
                  legend: { display: false },
                  datalabels: {
                    color: '#999',
                    anchor: 'end',
                    align: 'top',
                    font: { size: 9, family: 'DM Mono' },
                    formatter: (v: number | null) => v ? Math.round(v).toString() : '',
                  },
                },
                scales: {
                  y: {
                    ticks: { color: '#666', font: { size: 10, family: 'DM Mono' }, callback: (v) => `${v} bpm` },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    border: { display: false },
                  },
                  x: {
                    ticks: { color: '#555', font: { size: 10, family: 'DM Mono' } },
                    grid: { display: false },
                    border: { display: false },
                    title: { display: true, text: 'km', color: '#555', font: { size: 10, family: 'DM Mono' } },
                  },
                },
              }}
              height={80}
            />
          </div>
        )}
      </div>

      <ChartExplainer>
        <strong>Pace per km</strong>: ritmo medio di ogni chilometro (da splits Strava).
        <br />Colore: verde = veloce, arancione = lento (normalizzato sulla corsa).
        <br />Asse Y invertito: piu in alto = piu veloce.
        {data.hasHR && <><br /><strong>HR per km</strong>: frequenza cardiaca media per ogni km. L&apos;andamento mostra come il cuore risponde allo sforzo nel tempo.</>}
        <br />Hover su una barra per vedere ritmo, HR e dislivello di quel km.
      </ChartExplainer>
    </Card>
  );
}
