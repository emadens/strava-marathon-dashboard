import type { ChartOptions } from 'chart.js';

export function getChartOptions(opts: { yLabel?: string; showLegend?: boolean } = {}): ChartOptions {
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
