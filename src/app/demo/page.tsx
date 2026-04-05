'use client';

import { useState, useMemo } from 'react';
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
import { useDashboardStore } from '@/stores/dashboard-store';
import { generateMockActivities } from '@/lib/mock-data';
import type { StravaActivity } from '@/types/strava';

function useFilteredMock(activities: StravaActivity[]) {
  const { period, customStart, customEnd } = useDashboardStore();

  const filtered = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      return activities.filter(a => {
        const d = new Date(a.start_date);
        return d >= customStart && d <= customEnd;
      });
    }

    switch (period) {
      case 'week': startDate = new Date(now); startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case '3months': startDate = new Date(now); startDate.setMonth(now.getMonth() - 3); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: return activities;
    }
    return activities.filter(a => new Date(a.start_date) >= startDate);
  }, [activities, period, customStart, customEnd]);

  const previous = useMemo(() => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      const dur = customEnd.getTime() - customStart.getTime();
      endDate = new Date(customStart);
      startDate = new Date(endDate.getTime() - dur);
    } else switch (period) {
      case 'week': endDate = new Date(now); endDate.setDate(now.getDate() - 7); startDate = new Date(now); startDate.setDate(now.getDate() - 14); break;
      case 'month': endDate = new Date(now.getFullYear(), now.getMonth(), 1); startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); break;
      case '3months': endDate = new Date(now); endDate.setMonth(now.getMonth() - 3); startDate = new Date(now); startDate.setMonth(now.getMonth() - 6); break;
      case 'year': endDate = new Date(now.getFullYear(), 0, 1); startDate = new Date(now.getFullYear() - 1, 0, 1); break;
      default: return [];
    }
    return activities.filter(a => { const d = new Date(a.start_date); return d >= startDate && d < endDate; });
  }, [activities, period, customStart, customEnd]);

  return { filtered, previous };
}

export default function DemoPage() {
  const [activities] = useState(() => generateMockActivities());
  const { filtered, previous } = useFilteredMock(activities);

  return (
    <div className="min-h-screen relative z-[1]">
      {/* Demo banner */}
      <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 text-center text-xs text-accent font-medium">
        DEMO — Dati finti generati automaticamente
      </div>
      <header className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-8 bg-bg/90 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-4">
          <div className="font-display text-2xl tracking-wide bg-gradient-to-br from-accent to-accent2 bg-clip-text text-transparent">
            42K
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">E</div>
            <span className="text-sm font-medium">Emanuele D.</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted font-mono">{activities.length} attivita mock</span>
        </div>
      </header>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <PeriodTabs />
          <KPIGrid activities={filtered} previous={previous} />

          <div className="grid grid-cols-12 gap-4 mb-4">
            <WeeklyKmChart activities={filtered} />
            <ActivityTypesChart activities={filtered} />
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <LongRunChart activities={filtered} />
            <PaceTrendChart activities={filtered} />
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <HRZonesDisplay activities={filtered} />
            <TrainingLoadChart activities={filtered} />
            <ActivityList activities={filtered} />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <WeekdayHeatmap activities={filtered} />
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}
