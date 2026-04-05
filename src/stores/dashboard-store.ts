import { create } from 'zustand';

export type Period = 'week' | 'month' | '3months' | 'year' | 'all' | 'custom';

interface DashboardState {
  period: Period;
  customStart: Date | null;
  customEnd: Date | null;
  setPeriod: (period: Period) => void;
  setCustomRange: (start: Date, end: Date) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  period: 'month',
  customStart: null,
  customEnd: null,
  setPeriod: (period) => set({ period }),
  setCustomRange: (start, end) =>
    set({
      period: 'custom',
      customStart: start,
      customEnd: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
    }),
}));
