'use client';

import { useState, useEffect } from 'react';
import { SESSION_COLORS } from '@/lib/plan-parser';
import { fmtPace, fmtDateWithDay } from '@/lib/utils';
import type { TrainingWeek } from '@/types/training-plan';
import type { StravaActivity } from '@/types/strava';

interface PlanViewerProps {
  weeks: TrainingWeek[];
  activities?: StravaActivity[];
  onUpdateMatch?: (weekIdx: number, sessionIdx: number, activityId: number | null) => void;
}

const DAY_ORDER = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const SESSION_LABELS: Record<string, string> = {
  easy: 'Easy Run', recovery: 'Recovery', tempo: 'Tempo',
  interval: 'Intervals', long_run: 'Long Run', rest: 'Riposo', cross_training: 'Cross Training',
};

const MONTHS: Record<string, number> = {
  'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
  'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
  'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
};

function parseWeekStart(dateRange: string): Date | null {
  // Parse "22 Dic - 28 Dic" → start date (22 Dic)
  const parts = dateRange.split('-');
  if (!parts.length) return null;
  const match = parts[0].trim().match(/(\d+)\s+(\w+)/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthKey = match[2].toLowerCase().slice(0, 3);
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  const year = month >= 11 ? 2025 : 2026;
  return new Date(year, month, day);
}

function getPlannedDate(weekDateRange: string, dayOfWeek: string): Date | null {
  const weekStart = parseWeekStart(weekDateRange);
  if (!weekStart) return null;
  const dayIdx = DAY_ORDER.indexOf(dayOfWeek);
  if (dayIdx < 0) return null;
  // weekStart is Monday (dayIdx 0)
  const planned = new Date(weekStart);
  planned.setDate(weekStart.getDate() + dayIdx);
  return planned;
}

function autoMatchActivity(
  session: TrainingWeek['sessions'][0],
  weekDateRange: string | undefined,
  activities: StravaActivity[]
): StravaActivity | null {
  if (!activities.length || !weekDateRange) return null;

  const plannedDate = getPlannedDate(weekDateRange, session.dayOfWeek);
  if (!plannedDate) return null;

  const TOLERANCE_DAYS = 2;
  const toleranceMs = TOLERANCE_DAYS * 24 * 60 * 60 * 1000;

  // 1. Find activities within ±2 days of the planned date
  const candidates = activities.filter(a => {
    const actDate = new Date(a.start_date);
    return Math.abs(actDate.getTime() - plannedDate.getTime()) <= toleranceMs;
  });

  if (candidates.length === 0) return null;

  // 2. Score by: date closeness (primary) + distance similarity (secondary)
  const scored = candidates.map(a => {
    const actDate = new Date(a.start_date);
    const daysDiff = Math.abs(actDate.getTime() - plannedDate.getTime()) / (24 * 60 * 60 * 1000);
    const distDiff = session.distanceKm > 0
      ? Math.abs(a.distance / 1000 - session.distanceKm) / session.distanceKm
      : 1;
    // Lower score = better match. Date is weighted 3x more than distance
    const score = daysDiff * 3 + distDiff;
    return { activity: a, score, daysDiff, distDiff };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0].activity;
}

export function PlanViewer({ weeks, activities = [], onUpdateMatch }: PlanViewerProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [matchOverrides, setMatchOverrides] = useState<Record<string, number | null>>({});
  const [skippedSessions, setSkippedSessions] = useState<Record<string, boolean>>({});
  const [showMatchPicker, setShowMatchPicker] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Load skipped state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plan_skipped_sessions');
    if (saved) setSkippedSessions(JSON.parse(saved));
  }, []);

  const setSkipped = (wi: number, si: number, skipped: boolean) => {
    const key = `${wi}-${si}`;
    const updated = { ...skippedSessions, [key]: skipped };
    if (!skipped) delete updated[key];
    setSkippedSessions(updated);
    localStorage.setItem('plan_skipped_sessions', JSON.stringify(updated));
    // Also clear any match override when skipping
    if (skipped) {
      setMatchOverrides(prev => ({ ...prev, [key]: null }));
      if (onUpdateMatch) onUpdateMatch(wi, si, null);
    }
    setShowMatchPicker(null);
  };

  const isSkipped = (wi: number, si: number) => skippedSessions[`${wi}-${si}`] === true;

  if (!weeks.length) return null;

  const getMatch = (wi: number, si: number, session: TrainingWeek['sessions'][0]): StravaActivity | null => {
    const key = `${wi}-${si}`;
    if (key in matchOverrides) {
      if (matchOverrides[key] === null) return null;
      return activities.find(a => a.id === matchOverrides[key]) || null;
    }
    // Check if session already has a matched activity
    if (session.matchedActivityId) {
      return activities.find(a => a.id === session.matchedActivityId) || null;
    }
    // Auto-match
    const weekData = weeks[wi] as TrainingWeek & { dateRange?: string };
    return autoMatchActivity(session, weekData.dateRange, activities);
  };

  const setOverride = (wi: number, si: number, actId: number | null) => {
    const key = `${wi}-${si}`;
    setMatchOverrides(prev => ({ ...prev, [key]: actId }));
    if (onUpdateMatch) onUpdateMatch(wi, si, actId);
    setShowMatchPicker(null);
    setPickerSearch('');
  };

  // Progress bars per week (like Runna)
  const getWeekProgress = (week: TrainingWeek, wi: number) => {
    const nonRest = week.sessions.filter(s => s.type !== 'rest');
    const total = nonRest.length;
    const completed = nonRest.filter((s) => {
      const si = week.sessions.indexOf(s);
      return getMatch(wi, si, s) !== null && !isSkipped(wi, si);
    }).length;
    const skipped = nonRest.filter((s) => {
      const si = week.sessions.indexOf(s);
      return isSkipped(wi, si);
    }).length;
    return { total, completed, skipped };
  };

  return (
    <div className="space-y-4">
      {weeks.map((week, wi) => {
        const weekData = week as TrainingWeek & { dateRange?: string };
        const progress = getWeekProgress(week, wi);
        const isExpanded = expandedWeek === wi;
        const colors = SESSION_COLORS;

        return (
          <div
            key={wi}
            className="bg-surface border border-border rounded-2xl overflow-hidden transition-all hover:border-accent/30"
          >
            {/* Week header - always visible */}
            <button
              onClick={() => setExpandedWeek(isExpanded ? null : wi)}
              className="w-full text-left px-5 py-4 cursor-pointer"
            >
              {/* Date range */}
              {weekData.dateRange && (
                <div className="text-xs text-accent font-medium uppercase tracking-wider mb-1">
                  {weekData.dateRange}
                </div>
              )}

              {/* Week number */}
              <div className="font-display text-2xl tracking-wide mb-3">
                Settimana {week.weekNumber}
              </div>

              {/* Progress bars (Runna style) */}
              <div className="flex gap-1.5 mb-3">
                {week.sessions.filter(s => s.type !== 'rest').map((s, si) => {
                  const realSi = week.sessions.indexOf(s);
                  const match = getMatch(wi, realSi, s);
                  const skipped = isSkipped(wi, realSi);
                  const color = colors[s.type] || colors.easy;
                  return (
                    <div key={si} className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: (match || skipped) ? '100%' : '0%',
                          background: skipped ? '#666' : color.dot,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs">
                <span className="text-muted">
                  Allenamenti: <span className="text-text font-medium">{progress.completed}/{progress.total}</span>
                </span>
                {progress.skipped > 0 && (
                  <span className="text-muted">
                    Saltati: <span className="text-yellow font-medium">{progress.skipped}</span>
                  </span>
                )}
                <span className="text-muted">
                  Distanza: <span className="text-text font-medium">{week.weeklyTotalKm.toFixed(1)}km</span>
                </span>
              </div>
            </button>

            {/* Sessions - expanded */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-2.5 animate-fade-up">
                {week.sessions.filter(s => s.type !== 'rest').map((s, rawSi) => {
                  const si = week.sessions.indexOf(s);
                  const color = colors[s.type] || colors.easy;
                  const match = getMatch(wi, si, s);
                  const pickerKey = `${wi}-${si}`;
                  const dayLabel = s.dayOfWeek.charAt(0).toUpperCase() + s.dayOfWeek.slice(1, 3);

                  return (
                    <div key={rawSi}>
                      <div className="flex items-center gap-3 py-2">
                        {/* Color dot */}
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color.dot }} />

                        {/* Day */}
                        <span className="text-sm text-muted w-8 font-medium">{dayLabel}</span>

                        {/* Session info */}
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {s.notes === 'GARA' ? 'Race' : (SESSION_LABELS[s.type] || s.type)}
                          </span>
                          <span className="text-sm text-muted"> · {s.distanceKm}km</span>
                          {s.notes && s.notes !== 'GARA' && (
                            <span className="text-xs text-muted/60"> · {s.notes}</span>
                          )}
                          {s.targetPaceMinKm && (
                            <span className="text-xs text-muted font-mono"> @{s.targetPaceMinKm}</span>
                          )}
                        </div>

                        {/* Match status */}
                        {isSkipped(wi, si) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowMatchPicker(showMatchPicker === pickerKey ? null : pickerKey); }}
                            className="flex items-center gap-1.5 text-xs text-yellow bg-yellow/10 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-yellow/20 transition-all line-through"
                          >
                            Saltato
                          </button>
                        ) : match ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowMatchPicker(showMatchPicker === pickerKey ? null : pickerKey); }}
                            className="flex items-center gap-1.5 text-xs text-green bg-green/10 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-green/20 transition-all"
                          >
                            <span>&#10003;</span>
                            <span className="font-mono">{(match.distance / 1000).toFixed(1)}km</span>
                            <span className="text-green/60">{fmtPace(1000 / match.average_speed)}/km</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowMatchPicker(showMatchPicker === pickerKey ? null : pickerKey); }}
                            className="text-xs text-muted/40 border border-border/50 px-2.5 py-1 rounded-lg cursor-pointer hover:border-accent/30 hover:text-muted transition-all"
                          >
                            Associa
                          </button>
                        )}
                      </div>

                      {/* Match picker dropdown */}
                      {showMatchPicker === pickerKey && (() => {
                        // Sort: currently matched first, then best matches, then all by date
                        const allSorted = [...activities]
                          .sort((a, b) => {
                            // Current match always first
                            if (match && a.id === match.id) return -1;
                            if (match && b.id === match.id) return 1;
                            // Then sort by date descending
                            return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
                          });

                        // Apply search filter
                        const filtered = pickerSearch.trim()
                          ? allSorted.filter(a =>
                              a.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                              (a.distance / 1000).toFixed(1).includes(pickerSearch) ||
                              new Date(a.start_date).toLocaleDateString('it').includes(pickerSearch)
                            )
                          : allSorted;

                        return (
                          <div className="ml-14 mb-2 bg-surface2 border border-border rounded-xl p-3 animate-fade-up">
                            {/* Skip / Unskip buttons */}
                            <div className="flex gap-2 mb-2 pb-2 border-b border-border/50">
                              {isSkipped(wi, si) ? (
                                <button
                                  onClick={() => setSkipped(wi, si, false)}
                                  className="text-xs text-green hover:bg-green/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                                >
                                  &#10003; Rimuovi &quot;saltato&quot;
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSkipped(wi, si, true)}
                                  className="text-xs text-yellow hover:bg-yellow/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                                >
                                  &#10007; Segna come saltato
                                </button>
                              )}
                            </div>

                            {/* Current match indicator */}
                            {match && !isSkipped(wi, si) && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                                <span className="text-[0.65rem] text-muted">Associata a:</span>
                                <span className="text-xs text-green font-medium">{match.name}</span>
                                <span className="text-[0.65rem] text-muted font-mono">
                                  {(match.distance / 1000).toFixed(1)}km · {fmtPace(1000 / match.average_speed)}/km · {fmtDateWithDay(new Date(match.start_date))}
                                </span>
                                <button
                                  onClick={() => setOverride(wi, si, null)}
                                  className="ml-auto text-xs text-red/60 hover:text-red cursor-pointer transition-colors"
                                >
                                  Rimuovi
                                </button>
                              </div>
                            )}

                            {/* Search */}
                            <input
                              value={pickerSearch}
                              onChange={e => setPickerSearch(e.target.value)}
                              placeholder="Cerca per nome, data, km..."
                              className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-text mb-2"
                              autoFocus
                            />

                            <div className="text-[0.6rem] text-muted mb-1">{filtered.length} attivita</div>

                            {/* Activity list */}
                            <div className="max-h-52 overflow-y-auto space-y-0.5">
                              {filtered.slice(0, 50).map(a => {
                                const isCurrentMatch = match?.id === a.id;
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => { setOverride(wi, si, a.id); setPickerSearch(''); }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center gap-2 ${
                                      isCurrentMatch
                                        ? 'bg-green/15 border border-green/30'
                                        : 'hover:bg-accent/10 border border-transparent'
                                    }`}
                                  >
                                    {isCurrentMatch && <span className="text-green shrink-0">&#10003;</span>}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{a.name}</div>
                                      <div className="text-muted font-mono mt-0.5">
                                        {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                              {filtered.length > 50 && (
                                <div className="text-[0.6rem] text-muted text-center py-2">
                                  Usa la ricerca per trovare altre attivita
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
