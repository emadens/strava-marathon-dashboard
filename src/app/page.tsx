'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PeriodTabs } from '@/components/dashboard/PeriodTabs';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { WeeklyKmChart } from '@/components/charts/WeeklyKmChart';
import { ActivityTypesChart } from '@/components/charts/ActivityTypesChart';
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
import type { TrainingPlan } from '@/types/training-plan';

const PLAN_STORAGE_KEY = 'marathon_training_plans';

export default function DashboardPage() {
  const { activities, isLoading } = useActivities();
  const { filtered, previous } = usePeriodFilter(activities);

  // Load plan for pace chart classification
  const [planWeeks, setPlanWeeks] = useState<TrainingPlan['weeks']>([]);
  useEffect(() => {
    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (saved) {
      const plans: TrainingPlan[] = JSON.parse(saved);
      if (plans.length > 0) setPlanWeeks(plans[0].weeks);
    }
  }, []);
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
            <ActivityTypesChart activities={filtered} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <LongRunChart activities={filtered} />
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
