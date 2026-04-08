'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RunNarrative } from '@/components/analysis/RunNarrative';
import { PacingChart } from '@/components/analysis/PacingChart';
import { ElevationProfile } from '@/components/analysis/ElevationProfile';
import { RunMetrics } from '@/components/analysis/RunMetrics';
import { WeeklyInsights } from '@/components/analysis/WeeklyInsights';
import { Toast } from '@/components/ui/Toast';
import { useActivities } from '@/hooks/useActivities';
import { generateNarratives } from '@/lib/run-analysis';
import { fmtPace, fmtDateWithDay } from '@/lib/utils';
import type { StravaDetailedActivity } from '@/types/strava';

export default function AnalysisPage() {
  const { activities } = useActivities();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StravaDetailedActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'corsa' | 'settimana'>('corsa');

  const sorted = [...activities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  // Auto-select most recent activity
  useEffect(() => {
    if (!selectedId && sorted.length > 0) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load activity detail
  useEffect(() => {
    if (!selectedId) return;

    const cached = localStorage.getItem(`activity_detail_${selectedId}`);
    if (cached) {
      setDetail(JSON.parse(cached));
      return;
    }

    setLoading(true);
    fetch(`/api/strava/activity/${selectedId}`)
      .then(r => r.json())
      .then(data => {
        setDetail(data);
        localStorage.setItem(`activity_detail_${selectedId}`, JSON.stringify(data));
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const splits = detail?.splits_metric ?? [];
  const selectedActivity = activities.find(a => a.id === selectedId);
  const narratives = splits.length > 0 && selectedActivity ? generateNarratives(splits, selectedActivity) : [];

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 pb-20 md:pb-6 max-w-[1400px] mx-auto">
          <h1 className="font-display text-3xl tracking-wide mb-4">Analisi</h1>

          {/* Tab toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('corsa')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer ${
                tab === 'corsa' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent/50'
              }`}
            >
              Singola corsa
            </button>
            <button
              onClick={() => setTab('settimana')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer ${
                tab === 'settimana' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent/50'
              }`}
            >
              Insights settimanali
            </button>
          </div>

          {tab === 'corsa' ? (
            <div className="grid grid-cols-12 gap-6">
              {/* Activity selector */}
              <div className="col-span-3 max-lg:col-span-12">
                <div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto sticky top-[80px]">
                  {sorted.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                        selectedId === a.id
                          ? 'bg-accent/10 border-accent'
                          : 'bg-surface2 border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-[0.65rem] text-muted font-mono mt-0.5">
                        {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analysis content */}
              <div className="col-span-9 max-lg:col-span-12">
                {loading && (
                  <div className="flex items-center justify-center py-20 text-muted">
                    <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mr-3" />
                    Caricamento dati...
                  </div>
                )}

                {!loading && splits.length > 0 && (
                  <div className="space-y-6">
                    {/* Narrative takeaways */}
                    <RunNarrative narratives={narratives} />

                    {/* Charts */}
                    <PacingChart splits={splits} />
                    <ElevationProfile splits={splits} />

                    {/* Metrics */}
                    <RunMetrics splits={splits} />
                  </div>
                )}

                {!loading && selectedId && splits.length === 0 && (
                  <div className="text-center py-20 text-muted">
                    <div className="text-4xl mb-4">&#9201;</div>
                    <p>Nessun dato split disponibile per questa attivita</p>
                    <p className="text-xs mt-1">Le attivita manuali o senza GPS non hanno splits per km</p>
                  </div>
                )}

                {!loading && !selectedId && (
                  <div className="text-center py-20 text-muted">
                    <div className="text-4xl mb-4">&#9776;</div>
                    <p>Seleziona una corsa per analizzarla</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Weekly insights tab */
            <WeeklyInsights activities={activities} />
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}
