'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SplitTable } from '@/components/splits/SplitTable';
import { BestEfforts } from '@/components/splits/BestEfforts';
import { RaceTimeEstimator } from '@/components/race-estimate/RaceTimeEstimator';
import { Toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { useActivities } from '@/hooks/useActivities';
import { fmtPace, fmtDateWithDay } from '@/lib/utils';
import type { StravaDetailedActivity, StravaBestEffort } from '@/types/strava';

export default function SplitsPage() {
  const { activities } = useActivities();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StravaDetailedActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [allEfforts, setAllEfforts] = useState<StravaBestEffort[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const sorted = [...activities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

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
        if (data.best_efforts?.length) {
          setAllEfforts(prev => {
            const combined = [...prev, ...data.best_efforts];
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

  const [autoLoadProgress, setAutoLoadProgress] = useState('');

  // Load cached best efforts + auto-fetch key activities in background
  useEffect(() => {
    if (!activities.length) return;

    const loadEfforts = async () => {
      const efforts: StravaBestEffort[] = [];

      // 1. Load all already-cached efforts
      activities.forEach(act => {
        const cached = localStorage.getItem(`activity_detail_${act.id}`);
        if (cached) {
          const data = JSON.parse(cached) as StravaDetailedActivity;
          if (data.best_efforts) efforts.push(...data.best_efforts);
        }
      });

      // 2. Find key activities to auto-fetch (long runs >10km, sorted by distance desc)
      const keyActivities = [...activities]
        .filter(a => a.distance >= 10000) // 10km+
        .sort((a, b) => b.distance - a.distance) // longest first
        .slice(0, 20); // max 20 to avoid rate limits

      const toFetch = keyActivities.filter(
        a => !localStorage.getItem(`activity_detail_${a.id}`)
      );

      // 3. Fetch uncached key activities in background (with delay to respect rate limits)
      if (toFetch.length > 0) {
        setAutoLoadProgress(`Caricamento PR: 0/${toFetch.length}...`);
        for (let i = 0; i < toFetch.length; i++) {
          try {
            setAutoLoadProgress(`Caricamento PR: ${i + 1}/${toFetch.length}...`);
            const res = await fetch(`/api/strava/activity/${toFetch[i].id}`);
            if (res.ok) {
              const data = await res.json() as StravaDetailedActivity;
              localStorage.setItem(`activity_detail_${toFetch[i].id}`, JSON.stringify(data));
              if (data.best_efforts) efforts.push(...data.best_efforts);
            }
            // 1.5s delay between requests to stay well under Strava rate limit (100/15min)
            if (i < toFetch.length - 1) await new Promise(r => setTimeout(r, 1500));
          } catch {
            // Skip failed fetches silently
          }
        }
        setAutoLoadProgress('');
      }

      // 4. Deduplicate: keep best time per distance
      const byName: Record<string, StravaBestEffort> = {};
      efforts.forEach(e => {
        if (!byName[e.name] || e.elapsed_time < byName[e.name].elapsed_time) {
          byName[e.name] = e;
        }
      });
      setAllEfforts(Object.values(byName));
    };

    loadEfforts();
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
            {autoLoadProgress && (
              <div className="flex items-center gap-2 mt-3 text-xs text-muted font-mono animate-fade-up">
                <div className="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" />
                {autoLoadProgress}
              </div>
            )}
            {allEfforts.length === 0 && !autoLoadProgress && (
              <p className="text-sm text-muted mt-2">
                Seleziona un&apos;attivita per caricare i tuoi PR. I dati vengono memorizzati localmente.
              </p>
            )}
          </div>

          {/* Race Time Estimates */}
          <div className="mb-8">
            <h2 className="font-display text-xl tracking-wide mb-4">Stime tempi gara</h2>
            <RaceTimeEstimator bestEfforts={allEfforts} />
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
                  <div className="text-4xl mb-4">&#9201;</div>
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

          {/* Debug section - hidden by default */}
          <div className="mt-12 border-t border-border/30 pt-6">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-muted/40 hover:text-muted cursor-pointer transition-colors font-mono"
            >
              {showDebug ? '▾ Nascondi dati raw' : '▸ Debug: dati raw Strava'}
            </button>

            {showDebug && detail && (
              <Card hover={false} className="mt-4">
                <div className="font-display text-sm tracking-wide mb-2">Raw Activity Detail — {detail.name}</div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
                  <div>
                    <span className="text-muted">ID:</span> {detail.id}<br />
                    <span className="text-muted">Type:</span> {detail.type} / {detail.sport_type}<br />
                    <span className="text-muted">Distance:</span> {detail.distance}m<br />
                    <span className="text-muted">Moving time:</span> {detail.moving_time}s<br />
                    <span className="text-muted">Elapsed time:</span> {detail.elapsed_time}s<br />
                    <span className="text-muted">Elevation:</span> {detail.total_elevation_gain}m<br />
                    <span className="text-muted">Avg speed:</span> {detail.average_speed} m/s<br />
                    <span className="text-muted">Max speed:</span> {detail.max_speed} m/s<br />
                  </div>
                  <div>
                    <span className="text-muted">Avg HR:</span> {detail.average_heartrate ?? 'n/a'}<br />
                    <span className="text-muted">Max HR:</span> {detail.max_heartrate ?? 'n/a'}<br />
                    <span className="text-muted">Cadence:</span> {detail.average_cadence ?? 'n/a'}<br />
                    <span className="text-muted">Calories:</span> {detail.calories}<br />
                    <span className="text-muted">Workout type:</span> {detail.workout_type ?? 'n/a'}<br />
                    <span className="text-muted">Perceived exertion:</span> {detail.perceived_exertion ?? 'n/a'}<br />
                    <span className="text-muted">Gear:</span> {detail.gear_id ?? 'n/a'}<br />
                    <span className="text-muted">Polyline:</span> {detail.map?.summary_polyline ? 'yes' : 'no'}<br />
                  </div>
                </div>

                {detail.best_efforts?.length > 0 && (
                  <>
                    <div className="font-display text-sm tracking-wide mb-2 mt-4">Best Efforts ({detail.best_efforts.length})</div>
                    <div className="overflow-x-auto">
                      <table className="text-xs font-mono w-full">
                        <thead><tr className="text-muted border-b border-border">
                          <th className="text-left pb-1">Name</th><th className="text-left pb-1">Distance</th><th className="text-left pb-1">Elapsed</th><th className="text-left pb-1">Moving</th>
                        </tr></thead>
                        <tbody>
                          {detail.best_efforts.map((e, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-1">{e.name}</td>
                              <td>{e.distance}m</td>
                              <td>{e.elapsed_time}s</td>
                              <td>{e.moving_time}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {detail.splits_metric?.length > 0 && (
                  <>
                    <div className="font-display text-sm tracking-wide mb-2 mt-4">Splits Metric ({detail.splits_metric.length})</div>
                    <div className="overflow-x-auto">
                      <table className="text-xs font-mono w-full">
                        <thead><tr className="text-muted border-b border-border">
                          <th className="text-left pb-1">Split</th><th className="text-left pb-1">Dist</th><th className="text-left pb-1">Elapsed</th><th className="text-left pb-1">Moving</th><th className="text-left pb-1">Avg Speed</th><th className="text-left pb-1">HR</th><th className="text-left pb-1">Elev</th>
                        </tr></thead>
                        <tbody>
                          {detail.splits_metric.map((s, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-1">{s.split}</td>
                              <td>{s.distance.toFixed(0)}m</td>
                              <td>{s.elapsed_time}s</td>
                              <td>{s.moving_time}s</td>
                              <td>{s.average_speed.toFixed(2)} m/s</td>
                              <td>{s.average_heartrate ?? '-'}</td>
                              <td>{s.elevation_difference.toFixed(1)}m</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {detail.segment_efforts?.length > 0 && (
                  <>
                    <div className="font-display text-sm tracking-wide mb-2 mt-4">Segments ({detail.segment_efforts.length})</div>
                    <pre className="text-[0.6rem] text-muted overflow-x-auto">{JSON.stringify(detail.segment_efforts.slice(0, 5), null, 2)}</pre>
                  </>
                )}

                {detail.laps?.length > 0 && (
                  <>
                    <div className="font-display text-sm tracking-wide mb-2 mt-4">Laps ({detail.laps.length})</div>
                    <pre className="text-[0.6rem] text-muted overflow-x-auto">{JSON.stringify(detail.laps, null, 2)}</pre>
                  </>
                )}
              </Card>
            )}

            {showDebug && !detail && (
              <p className="text-xs text-muted mt-2">Seleziona un&apos;attivita per vedere i dati raw.</p>
            )}
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}
