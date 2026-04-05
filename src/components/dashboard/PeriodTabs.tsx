'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore, type Period } from '@/stores/dashboard-store';
import { DateRangePicker } from './DateRangePicker';
import { fmtDateShort } from '@/lib/utils';
import type { TrainingPlan } from '@/types/training-plan';

const PLAN_STORAGE_KEY = 'marathon_training_plans';

const tabs: { period: Period; label: string }[] = [
  { period: 'week', label: 'Questa settimana' },
  { period: 'month', label: 'Questo mese' },
  { period: '3months', label: '3 mesi' },
  { period: 'year', label: 'Anno' },
  { period: 'all', label: 'Tutto' },
];

interface PlanDateRange {
  name: string;
  start: Date;
  end: Date;
}

function getPlanDateRange(): PlanDateRange | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(PLAN_STORAGE_KEY);
  if (!saved) return null;

  const plans: TrainingPlan[] = JSON.parse(saved);
  if (!plans.length) return null;

  const plan = plans[0]; // Use the first (most recent) plan
  const weeks = plan.weeks as Array<{ weekNumber: number; dateRange?: string; weeklyTotalKm: number }>;
  if (!weeks.length) return null;

  // Parse date ranges from weeks to find overall plan start/end
  // dateRange format: "22 Dic - 28 Dic" or "4 Mag - 10 Mag"
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];

  // Simple approach: use plan marathon date if available, or estimate from week count
  const startDate = parseDateRange(firstWeek.dateRange)?.start;
  const endDate = parseDateRange(lastWeek.dateRange)?.end;

  if (!startDate || !endDate) {
    // Fallback: estimate from week numbers
    // Assume plan starts from the first week's date or 23 weeks before marathon
    if (plan.marathonDate) {
      const marathon = new Date(plan.marathonDate);
      const start = new Date(marathon);
      start.setDate(marathon.getDate() - weeks.length * 7);
      return { name: plan.name, start, end: marathon };
    }
    return null;
  }

  return { name: plan.name, start: startDate, end: endDate };
}

function parseDateRange(range?: string): { start: Date; end: Date } | null {
  if (!range) return null;
  // Format: "22 Dic - 28 Dic" or "4 Mag - 10 Mag" or "29 Dic - 4 Gen"
  const months: Record<string, number> = {
    'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
    'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
    'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
  };

  const parts = range.split('-').map(s => s.trim());
  if (parts.length !== 2) return null;

  const parseDate = (s: string): Date | null => {
    const match = s.match(/(\d+)\s+(\w+)/);
    if (!match) return null;
    const day = parseInt(match[1]);
    const monthKey = match[2].toLowerCase().slice(0, 3);
    const month = months[monthKey];
    if (month === undefined) return null;
    // Guess year: if month is Dec, likely 2025, otherwise 2026
    const year = month >= 11 ? 2025 : 2026;
    return new Date(year, month, day);
  };

  const start = parseDate(parts[0]);
  const end = parseDate(parts[1]);
  if (!start || !end) return null;
  return { start, end };
}

export function PeriodTabs() {
  const { period, setPeriod, setCustomRange } = useDashboardStore();
  const [planRange, setPlanRange] = useState<PlanDateRange | null>(null);

  useEffect(() => {
    setPlanRange(getPlanDateRange());
  }, []);

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
          className={`
            bg-surface border px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans font-medium transition-all
            border-purple-500/30 text-purple-400 hover:border-purple-500 hover:bg-purple-500/5
          `}
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
