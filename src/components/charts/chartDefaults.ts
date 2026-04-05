import type { ChartOptions } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS } from 'chart.js';

// Register datalabels plugin globally
ChartJS.register(ChartDataLabels);

export function getChartOptions(opts: {
  yLabel?: string;
  showLegend?: boolean;
  showDataLabels?: boolean;
  dataLabelFormatter?: (value: number) => string;
} = {}): ChartOptions {
  return {
    responsive: true,
    animation: { duration: 600 },
    plugins: {
      legend: { display: opts.showLegend ?? false },
      tooltip: {
        backgroundColor: 'var(--surface2, #1a1a1a)',
        borderColor: 'var(--border, #333)',
        borderWidth: 1,
        titleColor: 'var(--text, #f0ede8)',
        bodyColor: 'var(--muted, #888)',
        titleFont: { family: 'DM Sans', size: 12 },
        bodyFont: { family: 'DM Mono', size: 11 },
      },
      datalabels: opts.showDataLabels !== false ? {
        color: '#999',
        anchor: 'end' as const,
        align: 'top' as const,
        font: { size: 10, family: 'DM Mono' },
        formatter: opts.dataLabelFormatter || ((v: number) => v > 0 ? v : ''),
      } : { display: false },
    },
    scales: {
      y: {
        ticks: { color: '#666', font: { size: 11, family: 'DM Mono' } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
      },
      x: {
        ticks: { color: '#555', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 10 },
        grid: { display: false },
        border: { display: false },
      },
    },
  } as ChartOptions;
}
