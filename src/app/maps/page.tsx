'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toast } from '@/components/ui/Toast';
import { useActivities } from '@/hooks/useActivities';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { PeriodTabs } from '@/components/dashboard/PeriodTabs';
import { fmtPace, fmtDateWithDay } from '@/lib/utils';

// Dynamic import to avoid SSR issues with Leaflet
const RouteMap = dynamic(
  () => import('@/components/maps/RouteMap').then(m => ({ default: m.RouteMap })),
  { ssr: false, loading: () => <div className="h-[600px] bg-surface2 rounded-xl animate-pulse" /> }
);

export default function MapsPage() {
  const { activities } = useActivities();
  const { filtered } = usePeriodFilter(activities);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const withRoutes = filtered.filter(a => a.map?.summary_polyline);

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <h1 className="font-display text-3xl tracking-wide mb-4">Mappa percorsi</h1>
          <PeriodTabs />

          <div className="grid grid-cols-12 gap-6">
            {/* Map */}
            <div className="col-span-8 max-lg:col-span-12">
              <RouteMap activities={withRoutes} selectedId={selectedId} />
              <div className="text-xs text-muted mt-2 font-mono">
                {withRoutes.length} percorsi nel periodo selezionato
              </div>
            </div>

            {/* Activity list */}
            <div className="col-span-4 max-lg:col-span-12">
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {withRoutes
                  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                  .map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                      className={`
                        text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer
                        ${selectedId === a.id
                          ? 'bg-accent/10 border-accent'
                          : 'bg-surface2 border-border hover:border-accent/50'
                        }
                      `}
                    >
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-[0.7rem] text-muted font-mono mt-0.5">
                        {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km
                      </div>
                    </button>
                  ))}
                {withRoutes.length === 0 && (
                  <div className="text-center py-12 text-muted text-sm">
                    Nessun percorso GPS nel periodo selezionato
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}
