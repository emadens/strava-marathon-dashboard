'use client';

import { useDashboardStore, type Period } from '@/stores/dashboard-store';
import { DateRangePicker } from './DateRangePicker';
import { fmtDateShort } from '@/lib/utils';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { getPlanDateRange } from '@/lib/plan-dates';

const tabs: { period: Period; label: string }[] = [
  { period: 'week', label: 'Questa settimana' },
  { period: 'month', label: 'Questo mese' },
  { period: '3months', label: '3 mesi' },
  { period: 'year', label: 'Anno' },
  { period: 'all', label: 'Tutto' },
];

export function PeriodTabs() {
  const { period, setPeriod, setCustomRange } = useDashboardStore();
  const { currentPlan } = useTrainingPlan();

  const planRange = currentPlan ? getPlanDateRange(currentPlan) : null;

  const applyPlanRange = () => {
    if (!planRange) return;
    setCustomRange(planRange.start, planRange.end);
  };

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

      {/* Plan period shortcut */}
      {planRange && (
        <button
          onClick={applyPlanRange}
          className="bg-surface border px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans font-medium transition-all border-purple-500/30 text-purple-400 hover:border-purple-500 hover:bg-purple-500/5"
          title={`${fmtDateShort(planRange.start)} → ${fmtDateShort(planRange.end)}`}
        >
          &#9654; Piano
          <span className="font-mono text-[0.6rem] ml-1 opacity-60">
            {fmtDateShort(planRange.start)} → {fmtDateShort(planRange.end)}
          </span>
        </button>
      )}

      <DateRangePicker />
    </div>
  );
}
