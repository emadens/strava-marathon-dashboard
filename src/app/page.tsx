'use client';

import { useEffect, useRef } from 'react';
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
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { getPlanDateRange } from '@/lib/plan-dates';

export default function DashboardPage() {
  const { activities, isLoading } = useActivities();
  const { filtered, previous } = usePeriodFilter(activities);
  const { currentPlan } = useTrainingPlan();
  const planWeeks = currentPlan?.weeks ?? [];
  const { setCustomRange } = useDashboardStore();
  const lastPlanId = useRef<string | null>(null);

  // Auto-select plan date range when plan changes
  useEffect(() => {
    if (!currentPlan) return;
    if (lastPlanId.current === currentPlan.id) return;
    lastPlanId.current = currentPlan.id;

    const range = getPlanDateRange(currentPlan);
    if (range) {
      setCustomRange(range.start, range.end);
    }
  }, [currentPlan, setCustomRange]);

  const { getMatchResult } = usePlanMatches(planWeeks, activities);

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 pb-20 md:pb-6 max-w-[1400px] mx-auto">
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
