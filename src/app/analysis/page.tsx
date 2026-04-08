'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = this week, 1 = last week, etc.

  const sorted = useMemo(() =>
    [...activities].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [activities]
  );

  // Filter activities by search
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted.slice(0, 30);
    const q = search.toLowerCase();
    return sorted.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.distance / 1000).toFixed(1).includes(q) ||
      new Date(a.start_date).toLocaleDateString('it').includes(q)
    ).slice(0, 20);
  }, [sorted, search]);

  // Auto-select most recent
  useEffect(() => {
    if (!selectedId && sorted.length > 0) setSelectedId(sorted[0].id);
  }, [sorted.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load activity detail
  useEffect(() => {
    if (!selectedId) return;
    const cached = localStorage.getItem(`activity_detail_${selectedId}`);
    if (cached) { setDetail(JSON.parse(cached)); return; }
    setLoading(true);
    fetch(`/api/strava/activity/${selectedId}`)
      .then(r => r.json())
      .then(data => { setDetail(data); localStorage.setItem(`activity_detail_${selectedId}`, JSON.stringify(data)); })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const splits = detail?.splits_metric ?? [];
  const selectedActivity = activities.find(a => a.id === selectedId);
  const narratives = splits.length > 0 && selectedActivity ? generateNarratives(splits, selectedActivity) : [];

  // Generate week options (last 12 weeks)
  const weekOptions = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - i * 7);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const label = i === 0 ? 'Questa settimana' : i === 1 ? 'Settimana scorsa' : `${monday.toLocaleDateString('it', { day: '2-digit', month: 'short' })} — ${sunday.toLocaleDateString('it', { day: '2-digit', month: 'short' })}`;
      weeks.push({ offset: i, label, monday, sunday });
    }
    return weeks;
  }, []);

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
            <div>
              {/* Activity dropdown selector */}
              <div className="relative mb-6">
                <div
                  className="bg-surface border border-border rounded-xl px-4 py-3 cursor-pointer hover:border-accent/50 transition-all flex items-center justify-between"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedActivity ? (
                    <div>
                      <div className="text-sm font-medium">{selectedActivity.name}</div>
                      <div className="text-[0.7rem] text-muted font-mono mt-0.5">
                        {fmtDateWithDay(new Date(selectedActivity.start_date))} · {(selectedActivity.distance / 1000).toFixed(1)}km · {fmtPace(1000 / selectedActivity.average_speed)}/km
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted text-sm">Seleziona una corsa...</span>
                  )}
                  <span className="text-muted">{dropdownOpen ? '▴' : '▾'}</span>
                </div>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl z-50 animate-fade-up overflow-hidden">
                    <div className="p-2 border-b border-border/50">
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cerca per nome, data, km..."
                        className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {filtered.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setSelectedId(a.id); setDropdownOpen(false); setSearch(''); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                            selectedId === a.id ? 'bg-accent/10 text-accent' : 'hover:bg-surface2'
                          }`}
                        >
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-[0.65rem] text-muted font-mono mt-0.5">
                            {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Full-width analysis */}
              {loading && (
                <div className="flex items-center justify-center py-20 text-muted">
                  <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mr-3" />
                  Caricamento dati...
                </div>
              )}

              {!loading && splits.length > 0 && (
                <div className="space-y-6">
                  <RunNarrative narratives={narratives} />
                  <PacingChart splits={splits} />
                  <ElevationProfile splits={splits} />
                  <RunMetrics splits={splits} />
                </div>
              )}

              {!loading && selectedId && splits.length === 0 && (
                <div className="text-center py-20 text-muted">
                  <div className="text-4xl mb-4">&#9201;</div>
                  <p>Nessun dato split disponibile per questa attivita</p>
                </div>
              )}
            </div>
          ) : (
            /* Weekly insights tab */
            <div>
              {/* Week selector */}
              <div className="mb-6">
                <div className="flex gap-2 flex-wrap">
                  {weekOptions.slice(0, 6).map(w => (
                    <button
                      key={w.offset}
                      onClick={() => setSelectedWeekOffset(w.offset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                        selectedWeekOffset === w.offset
                          ? 'border-accent text-accent bg-accent/5'
                          : 'border-border text-muted hover:border-accent/50'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <WeeklyInsights activities={activities} weekOffset={selectedWeekOffset} />
            </div>
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}
