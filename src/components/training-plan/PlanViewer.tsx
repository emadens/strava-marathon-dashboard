'use client';

import { useState } from 'react';
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

function autoMatchActivity(
  session: TrainingWeek['sessions'][0],
  weekDateRange: string | undefined,
  activities: StravaActivity[]
): StravaActivity | null {
  if (!activities.length || !weekDateRange) return null;

  // Parse date range like "22 Dic - 28 Dic" or "4 Mag - 10 Mag"
  // We need to find activities on the same day of the week within a ~20% distance tolerance
  const dayIdx = DAY_ORDER.indexOf(session.dayOfWeek);
  if (dayIdx < 0) return null;

  // Find activities that match by day-of-week and approximate distance
  const candidates = activities.filter(a => {
    const d = new Date(a.start_date);
    const actDow = (d.getDay() + 6) % 7; // Mon=0
    if (actDow !== dayIdx) return false;
    // Distance within 30% tolerance
    const actKm = a.distance / 1000;
    const planKm = session.distanceKm;
    if (planKm <= 0) return false;
    return Math.abs(actKm - planKm) / planKm < 0.30;
  });

  if (candidates.length === 0) return null;
  // Return the closest match by distance
  return candidates.sort((a, b) =>
    Math.abs(a.distance / 1000 - session.distanceKm) - Math.abs(b.distance / 1000 - session.distanceKm)
  )[0];
}

export function PlanViewer({ weeks, activities = [], onUpdateMatch }: PlanViewerProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [matchOverrides, setMatchOverrides] = useState<Record<string, number | null>>({});
  const [showMatchPicker, setShowMatchPicker] = useState<string | null>(null);

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
  };

  // Progress bars per week (like Runna)
  const getWeekProgress = (week: TrainingWeek, wi: number) => {
    const total = week.sessions.filter(s => s.type !== 'rest').length;
    const completed = week.sessions.filter((s, si) => {
      if (s.type === 'rest') return false;
      return getMatch(wi, si, s) !== null;
    }).length;
    return { total, completed };
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
                  const match = getMatch(wi, week.sessions.indexOf(s), s);
                  const color = colors[s.type] || colors.easy;
                  return (
                    <div key={si} className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: match ? '100%' : '0%',
                          background: color.dot,
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
                        {match ? (
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
                      {showMatchPicker === pickerKey && (
                        <div className="ml-14 mb-2 bg-surface2 border border-border rounded-xl p-3 animate-fade-up">
                          <div className="text-xs text-muted mb-2">Associa un&apos;attivita Strava:</div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {match && (
                              <button
                                onClick={() => setOverride(wi, si, null)}
                                className="w-full text-left px-2 py-1.5 rounded text-xs text-red hover:bg-red/10 cursor-pointer transition-all"
                              >
                                &#215; Rimuovi associazione
                              </button>
                            )}
                            {activities
                              .filter(a => {
                                const d = new Date(a.start_date);
                                const actDow = (d.getDay() + 6) % 7;
                                const dayIdx = DAY_ORDER.indexOf(s.dayOfWeek);
                                // Show activities on same day of week, or within 30% distance
                                return actDow === dayIdx || Math.abs(a.distance / 1000 - s.distanceKm) / s.distanceKm < 0.3;
                              })
                              .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                              .slice(0, 10)
                              .map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => setOverride(wi, si, a.id)}
                                  className={`w-full text-left px-2 py-1.5 rounded text-xs cursor-pointer transition-all hover:bg-accent/10 ${match?.id === a.id ? 'bg-green/10 text-green' : 'text-text'}`}
                                >
                                  <span className="font-medium">{a.name}</span>
                                  <span className="text-muted"> · {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
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
