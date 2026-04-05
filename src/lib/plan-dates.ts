import type { TrainingPlan, TrainingWeek } from '@/types/training-plan';

const MONTHS: Record<string, number> = {
  'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
  'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
  'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
};

export function parseDateFromRange(dateRange: string, pickEnd: boolean): Date | null {
  const parts = dateRange.split('-');
  const s = pickEnd ? (parts[1] || parts[0]) : parts[0];
  const m = s.trim().match(/(\d+)\s+(\w+)/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (month === undefined) return null;
  return new Date(month >= 11 ? 2025 : 2026, month, parseInt(m[1]));
}

export function getPlanDateRange(plan: TrainingPlan): { start: Date; end: Date } | null {
  const weeks = plan.weeks as Array<TrainingWeek & { dateRange?: string }>;
  if (!weeks.length) return null;

  const firstRange = weeks[0]?.dateRange;
  const lastRange = weeks[weeks.length - 1]?.dateRange;

  let start: Date | null = null;
  let end: Date | null = null;

  if (firstRange) start = parseDateFromRange(firstRange, false);
  if (lastRange) end = parseDateFromRange(lastRange, true);

  if (!start && plan.marathonDate) {
    const marathon = new Date(plan.marathonDate);
    start = new Date(marathon);
    start.setDate(marathon.getDate() - plan.weeks.length * 7);
    end = marathon;
  }

  if (start && end) return { start, end };
  return null;
}
