'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import type { StravaSplit } from '@/types/strava';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function ElevationProfile({ splits }: { splits: StravaSplit[] }) {
  const data = useMemo(() => {
    // Cumulative elevation
    let cumulative = 0;
    const elevations = splits.map(s => {
      cumulative += s.elevation_difference;
      return +cumulative.toFixed(1);
    });
    const labels = splits.map(s => `${s.split}`);

    // Color gradient based on elevation change per km
    const gradients = splits.map(s =>
      s.distance > 0 ? (s.elevation_difference / s.distance) * 100 : 0
    );

    return { labels, elevations, gradients };
  }, [splits]);

  const totalGain = splits.reduce((s, sp) => s + Math.max(0, sp.elevation_difference), 0);
  const totalLoss = splits.reduce((s, sp) => s + Math.min(0, sp.elevation_difference), 0);

  return (
    <Card hover={false}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-display text-base tracking-wide">Profilo altimetrico</div>
        <div className="text-[0.65rem] font-mono text-muted">
          <span className="text-green">+{totalGain.toFixed(0)}m</span>
          {' / '}
          <span className="text-red">{totalLoss.toFixed(0)}m</span>
        </div>
      </div>
      <div className="text-[0.72rem] text-muted mb-4">dislivello cumulativo per km</div>

      <Line
        data={{
          labels: data.labels,
          datasets: [{
            data: data.elevations,
            borderColor: 'rgba(77,166,255,0.8)',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return 'rgba(77,166,255,0.1)';
              const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              gradient.addColorStop(0, 'rgba(77,166,255,0.02)');
              gradient.addColorStop(1, 'rgba(77,166,255,0.15)');
              return gradient;
            },
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: 'rgba(77,166,255,1)',
          }],
        }}
        options={{
          responsive: true,
          animation: { duration: 400 },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const elev = ctx.raw as number;
                  const grad = data.gradients[ctx.dataIndex];
                  return `${elev > 0 ? '+' : ''}${elev.toFixed(0)}m (${grad > 0 ? '+' : ''}${grad.toFixed(1)}%)`;
                },
              },
            },
          },
          scales: {
            y: {
              ticks: { color: '#666', font: { size: 10, family: 'DM Mono' }, callback: (v) => `${v}m` },
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
        height={100}
      />

      <ChartExplainer>
        <strong>Profilo altimetrico</strong>: dislivello cumulativo lungo la corsa.
        <br />La linea sale durante le salite e scende durante le discese.
        <br />Hover per vedere l&apos;altitudine cumulativa e la pendenza (%) di quel km.
        <br />I totali in alto mostrano il dislivello positivo (+) e negativo (-) complessivo.
      </ChartExplainer>
    </Card>
  );
}
