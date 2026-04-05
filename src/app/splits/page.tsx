'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SplitTable } from '@/components/splits/SplitTable';
import { BestEfforts } from '@/components/splits/BestEfforts';
import { Toast } from '@/components/ui/Toast';
import { useActivities } from '@/hooks/useActivities';
import { fmtPace, fmtDateWithDay } from '@/lib/utils';
import type { StravaDetailedActivity, StravaBestEffort } from '@/types/strava';

export default function SplitsPage() {
  const { activities } = useActivities();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StravaDetailedActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [allEfforts, setAllEfforts] = useState<StravaBestEffort[]>([]);

  // Sort by most recent
  const sorted = [...activities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  // Load activity detail
  useEffect(() => {
    if (!selectedId) return;

    // Check cache
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
        // Accumulate best efforts
        if (data.best_efforts?.length) {
          setAllEfforts(prev => {
            const combined = [...prev, ...data.best_efforts];
            // Deduplicate by keeping best per distance name
            const byName: Record<string, StravaBestEffort> = {};
            combined.forEach(e => {
              if (!byName[e.name] || e.elapsed_time < byName[e.name].elapsed_time) {
                byName[e.name] = e;
              }
            });
            return Object.values(byName);
          });
        }
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  // Load best efforts from recent activities on mount
  useEffect(() => {
    const loadTopEfforts = async () => {
      const recent = sorted.slice(0, 10);
      const efforts: StravaBestEffort[] = [];

      for (const act of recent) {
        const cached = localStorage.getItem(`activity_detail_${act.id}`);
        if (cached) {
          const data = JSON.parse(cached) as StravaDetailedActivity;
          if (data.best_efforts) efforts.push(...data.best_efforts);
        }
      }

      if (efforts.length) {
        const byName: Record<string, StravaBestEffort> = {};
        efforts.forEach(e => {
          if (!byName[e.name] || e.elapsed_time < byName[e.name].elapsed_time) {
            byName[e.name] = e;
          }
        });
        setAllEfforts(Object.values(byName));
      }
    };

    loadTopEfforts();
  }, [activities.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <h1 className="font-display text-3xl tracking-wide mb-6">Split & Personal Record</h1>

          {/* Best Efforts */}
          <div className="mb-8">
            <h2 className="font-display text-xl tracking-wide mb-4">Record personali</h2>
            <BestEfforts efforts={allEfforts} />
            {allEfforts.length === 0 && (
              <p className="text-sm text-muted mt-2">
                Seleziona un&apos;attivita per caricare i tuoi PR. I dati vengono memorizzati localmente.
              </p>
            )}
          </div>

          {/* Activity selector + split table */}
          <div className="grid grid-cols-12 gap-6">
            {/* Activity list */}
            <div className="col-span-4 max-lg:col-span-12">
              <h2 className="font-display text-xl tracking-wide mb-4">Seleziona attivita</h2>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {sorted.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
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
              </div>
            </div>

            {/* Split detail */}
            <div className="col-span-8 max-lg:col-span-12">
              {loading && (
                <div className="flex items-center justify-center py-20 text-muted">
                  <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mr-3" />
                  Caricamento split...
                </div>
              )}

              {!loading && detail?.splits_metric && (
                <SplitTable splits={detail.splits_metric} activityName={detail.name} />
              )}

              {!loading && !detail && (
                <div className="text-center py-20 text-muted">
                  <div className="text-4xl mb-4">⏱</div>
                  <p>Seleziona un&apos;attivita per vedere gli split</p>
                </div>
              )}

              {!loading && detail && !detail.splits_metric?.length && (
                <div className="text-center py-20 text-muted">
                  <p>Nessun dato split disponibile per questa attivita</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}
