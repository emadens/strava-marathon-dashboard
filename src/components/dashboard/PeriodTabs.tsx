'use client';

import { useDashboardStore, type Period } from '@/stores/dashboard-store';
import { DateRangePicker } from './DateRangePicker';

const tabs: { period: Period; label: string }[] = [
  { period: 'week', label: 'Questa settimana' },
  { period: 'month', label: 'Questo mese' },
  { period: '3months', label: '3 mesi' },
  { period: 'year', label: 'Anno' },
  { period: 'all', label: 'Tutto' },
];

export function PeriodTabs() {
  const { period, setPeriod } = useDashboardStore();

  return (
    <div className="relative flex gap-2 mb-6 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.period}
          onClick={() => setPeriod(tab.period)}
          className={`
            bg-surface border px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans font-medium transition-all
            ${period === tab.period
              ? 'border-accent text-accent bg-accent/5'
              : 'border-border text-muted hover:border-accent hover:text-accent'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
      <DateRangePicker />
    </div>
  );
}
