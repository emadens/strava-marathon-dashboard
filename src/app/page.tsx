'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PeriodTabs } from '@/components/dashboard/PeriodTabs';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { WeeklyKmChart } from '@/components/charts/WeeklyKmChart';
import { LongRunChart } from '@/components/charts/LongRunChart';
import { PaceTrendChart } from '@/components/charts/PaceTrendChart';
import { HRZonesDisplay } from '@/components/charts/HRZonesDisplay';
import { TrainingLoadChart } from '@/components/charts/TrainingLoadChart';
import { ActivityList } from '@/components/charts/ActivityList';
import { WeekdayHeatmap } from '@/components/charts/WeekdayHeatmap';
import { Toast } from '@/components/ui/Toast';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useActivities } from '@/hooks/useActivities';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { usePlanMatches } from '@/hooks/usePlanMatches';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { TrainingPlan } from '@/types/training-plan';

const PLAN_STORAGE_KEY = 'marathon_training_plans';

export default function DashboardPage() {
  const { activities, isLoading } = useActivities();
  const { filtered, previous } = usePeriodFilter(activities);

  // Load plan for pace chart classification + auto-select plan dates
  const [planWeeks, setPlanWeeks] = useState<TrainingPlan['weeks']>([]);
  const { setCustomRange } = useDashboardStore();
  const planInitialized = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!saved) return;
    const plans: TrainingPlan[] = JSON.parse(saved);
    if (!plans.length) return;
    const plan = plans[0];
    setPlanWeeks(plan.weeks);

    // Auto-select plan date range on first load
    if (!planInitialized.current) {
      planInitialized.current = true;
      const MONTHS: Record<string, number> = {
        'gen':0,'jan':0,'feb':1,'mar':2,'apr':3,'mag':4,'may':4,'giu':5,'jun':5,
        'lug':6,'jul':6,'ago':7,'aug':7,'set':8,'sep':8,'ott':9,'oct':9,'nov':10,'dic':11,'dec':11,
      };
      const parseDate = (dateRange: string, pickEnd: boolean): Date | null => {
        const parts = dateRange.split('-');
        const s = pickEnd ? (parts[1] || parts[0]) : parts[0];
        const m = s.trim().match(/(\d+)\s+(\w+)/);
        if (!m) return null;
        const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
        if (month === undefined) return null;
        return new Date(month >= 11 ? 2025 : 2026, month, parseInt(m[1]));
      };

      const weeks = plan.weeks as Array<{ dateRange?: string }>;
      const firstRange = weeks[0]?.dateRange;
      const lastRange = weeks[weeks.length - 1]?.dateRange;

      let start: Date | null = null;
      let end: Date | null = null;

      if (firstRange) start = parseDate(firstRange, false);
      if (lastRange) end = parseDate(lastRange, true);

      if (!start && plan.marathonDate) {
        const marathon = new Date(plan.marathonDate);
        start = new Date(marathon);
        start.setDate(marathon.getDate() - plan.weeks.length * 7);
        end = marathon;
      }

      if (start && end) {
        setCustomRange(start, end);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { getMatchResult } = usePlanMatches(planWeeks, activities);

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <PeriodTabs />
          <KPIGrid activities={filtered} previous={previous} />

          {/* Charts Row 1 */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <WeeklyKmChart activities={filtered} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <LongRunChart activities={filtered} planWeeks={planWeeks} getMatchResult={getMatchResult} />
            <PaceTrendChart activities={filtered} planWeeks={planWeeks} getMatchResult={getMatchResult} />
          </div>

          {/* Charts Row 3 */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <HRZonesDisplay activities={filtered} />
            <TrainingLoadChart activities={filtered} />
            <ActivityList activities={filtered} />
          </div>

          {/* Heatmap */}
          <div className="grid grid-cols-12 gap-4">
            <WeekdayHeatmap activities={filtered} />
          </div>
        </main>
      </div>
      <Toast />
      <LoadingOverlay active={isLoading} text="Caricamento attivita Strava..." />
    </div>
  );
}
