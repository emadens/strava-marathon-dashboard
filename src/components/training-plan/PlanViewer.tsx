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
  // Auto-expand current week on mount
  const [expandedWeek, setExpandedWeek] = useState<number | null>(() => {
    const today = new Date();
    for (let i = 0; i < weeks.length; i++) {
      const wd = weeks[i] as TrainingWeek & { dateRange?: string };
      if (!wd.dateRange) continue;
      const start = parseWeekStart(wd.dateRange);
      if (!start) continue;
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (today >= start && today <= end) return i;
    }
    return null;
  });
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

  // Load persisted manual matches
  useEffect(() => {
    const saved = localStorage.getItem('plan_manual_matches');
    if (saved) setMatchOverrides(JSON.parse(saved));
  }, []);

  if (!weeks.length) return null;

  type MatchResult = { activity: StravaActivity; isManual: boolean } | null;

  // Build set of confirmed activity IDs so auto-match skips them
  const confirmedIds = new Set<number>();
  Object.values(matchOverrides).forEach(id => { if (id !== null) confirmedIds.add(id); });
  weeks.forEach(w => w.sessions.forEach(s => { if (s.matchedActivityId) confirmedIds.add(s.matchedActivityId); }));

  const getMatchResult = (wi: number, si: number, session: TrainingWeek['sessions'][0]): MatchResult => {
    const key = `${wi}-${si}`;
    // 1. Manual override (persisted)
    if (key in matchOverrides) {
      if (matchOverrides[key] === null) return null;
      const act = activities.find(a => a.id === matchOverrides[key]);
      return act ? { activity: act, isManual: true } : null;
    }
    // 2. Previously saved match on the session object
    if (session.matchedActivityId) {
      const act = activities.find(a => a.id === session.matchedActivityId);
      return act ? { activity: act, isManual: true } : null;
    }
    // 3. Auto-match — exclude confirmed activities
    const weekData = weeks[wi] as TrainingWeek & { dateRange?: string };
    const available = activities.filter(a => !confirmedIds.has(a.id));
    const auto = autoMatchActivity(session, weekData.dateRange, available);
    return auto ? { activity: auto, isManual: false } : null;
  };

  // Backward-compat wrapper
  const getMatch = (wi: number, si: number, session: TrainingWeek['sessions'][0]): StravaActivity | null => {
    return getMatchResult(wi, si, session)?.activity ?? null;
  };

  const [confirmMove, setConfirmMove] = useState<{
    actId: number; actName: string;
    fromWeek: number; fromSession: number; fromLabel: string;
    toWeek: number; toSession: number;
  } | null>(null);

  // Build a map: activityId → { wi, si } for all currently matched sessions
  const getMatchedActivityMap = (): Record<number, { wi: number; si: number; label: string }> => {
    const map: Record<number, { wi: number; si: number; label: string }> = {};
    weeks.forEach((week, wi) => {
      week.sessions.forEach((s, si) => {
        if (isSkipped(wi, si)) return;
        const m = getMatch(wi, si, s);
        if (m) {
          const dayLabel = s.dayOfWeek.charAt(0).toUpperCase() + s.dayOfWeek.slice(1, 3);
          map[m.id] = { wi, si, label: `Sett. ${week.weekNumber} ${dayLabel} (${SESSION_LABELS[s.type] || s.type})` };
        }
      });
    });
    return map;
  };

  const setOverride = (wi: number, si: number, actId: number | null) => {
    if (actId !== null) {
      // Check if this activity is already matched elsewhere
      const matchMap = getMatchedActivityMap();
      const existing = matchMap[actId];
      if (existing && !(existing.wi === wi && existing.si === si)) {
        // Activity is used elsewhere — ask confirmation
        const act = activities.find(a => a.id === actId);
        setConfirmMove({
          actId,
          actName: act?.name || `ID ${actId}`,
          fromWeek: existing.wi,
          fromSession: existing.si,
          fromLabel: existing.label,
          toWeek: wi,
          toSession: si,
        });
        return;
      }
    }
    applyOverride(wi, si, actId);
  };

  const applyOverride = (wi: number, si: number, actId: number | null) => {
    const key = `${wi}-${si}`;
    const updated = { ...matchOverrides, [key]: actId };
    setMatchOverrides(updated);
    // Persist manual matches
    localStorage.setItem('plan_manual_matches', JSON.stringify(updated));
    if (onUpdateMatch) onUpdateMatch(wi, si, actId);
    setShowMatchPicker(null);
    setPickerSearch('');
    setConfirmMove(null);
  };

  const handleConfirmMove = () => {
    if (!confirmMove) return;
    // Remove from old session and apply to new — both persisted
    const oldKey = `${confirmMove.fromWeek}-${confirmMove.fromSession}`;
    const newKey = `${confirmMove.toWeek}-${confirmMove.toSession}`;
    const updated = { ...matchOverrides, [oldKey]: null, [newKey]: confirmMove.actId };
    setMatchOverrides(updated);
    localStorage.setItem('plan_manual_matches', JSON.stringify(updated));
    if (onUpdateMatch) {
      onUpdateMatch(confirmMove.fromWeek, confirmMove.fromSession, null);
      onUpdateMatch(confirmMove.toWeek, confirmMove.toSession, confirmMove.actId);
    }
    setShowMatchPicker(null);
    setPickerSearch('');
    setConfirmMove(null);
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

  // Find current week based on today's date
  const isCurrentWeek = (weekData: TrainingWeek & { dateRange?: string }): boolean => {
    if (!weekData.dateRange) return false;
    const start = parseWeekStart(weekData.dateRange);
    if (!start) return false;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    return today >= start && today <= end;
  };

  return (
    <div className="space-y-4">
      {weeks.map((week, wi) => {
        const weekData = week as TrainingWeek & { dateRange?: string };
        const progress = getWeekProgress(week, wi);
        const isExpanded = expandedWeek === wi;
        const isCurrent = isCurrentWeek(weekData);
        const colors = SESSION_COLORS;

        return (
          <div
            key={wi}
            className={`bg-surface rounded-2xl overflow-hidden transition-all ${
              isCurrent
                ? 'border-2 border-accent shadow-[0_0_20px_rgba(255,77,0,0.15)]'
                : 'border border-border hover:border-accent/30'
            }`}
          >
            {/* Week header - always visible */}
            <button
              onClick={() => setExpandedWeek(isExpanded ? null : wi)}
              className="w-full text-left px-5 py-4 cursor-pointer"
            >
              {/* Current week badge + Date range */}
              <div className="flex items-center gap-2 mb-1">
                {weekData.dateRange && (
                  <span className="text-xs text-accent font-medium uppercase tracking-wider">
                    {weekData.dateRange}
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[0.6rem] bg-accent text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                    Corrente
                  </span>
                )}
              </div>

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
                  const weekData = weeks[wi] as TrainingWeek & { dateRange?: string };
                  const plannedDate = weekData.dateRange ? getPlannedDate(weekData.dateRange, s.dayOfWeek) : null;

                  return (
                    <div key={rawSi}>
                      <div className="flex items-center gap-3 py-2">
                        {/* Color dot */}
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color.dot }} />

                        {/* Day + date */}
                        <div className="w-12 shrink-0">
                          <div className="text-sm text-muted font-medium">{dayLabel}</div>
                          {plannedDate && (
                            <div className="text-[0.6rem] text-muted/50 font-mono">{plannedDate.getDate()}/{plannedDate.getMonth() + 1}</div>
                          )}
                        </div>

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
                        {(() => {
                          const matchResult = getMatchResult(wi, si, s);
                          const matchAct = matchResult?.activity;
                          const isManual = matchResult?.isManual ?? false;
                          const openPicker = (e: React.MouseEvent) => { e.stopPropagation(); setShowMatchPicker(showMatchPicker === pickerKey ? null : pickerKey); };

                          if (isSkipped(wi, si)) return (
                            <button onClick={openPicker}
                              className="flex items-center gap-1.5 text-xs text-yellow bg-yellow/10 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-yellow/20 transition-all line-through">
                              Saltato
                            </button>
                          );

                          if (matchAct) return (
                            <div className="flex items-center gap-1.5">
                              <button onClick={openPicker}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                                  isManual ? 'text-green bg-green/10 hover:bg-green/20' : 'text-blue bg-blue/10 hover:bg-blue/20'
                                }`}>
                                <span>{isManual ? '✓' : '~'}</span>
                                <span className="font-mono">{(matchAct.distance / 1000).toFixed(1)}km</span>
                                <span className={isManual ? 'text-green/60' : 'text-blue/60'}>{fmtPace(1000 / matchAct.average_speed)}/km</span>
                                {!isManual && <span className="text-[0.55rem] text-blue/40">auto</span>}
                              </button>
                              {/* Confirm auto-match button */}
                              {!isManual && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); applyOverride(wi, si, matchAct.id); }}
                                  className="text-[0.6rem] text-blue/50 hover:text-green border border-blue/20 hover:border-green/40 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                  title="Conferma questa associazione automatica"
                                >
                                  &#10003;
                                </button>
                              )}
                            </div>
                          );

                          return (
                            <button onClick={openPicker}
                              className="text-xs text-muted/40 border border-border/50 px-2.5 py-1 rounded-lg cursor-pointer hover:border-accent/30 hover:text-muted transition-all">
                              Associa
                            </button>
                          );
                        })()}
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
                              {(() => { const matchMap = getMatchedActivityMap(); return filtered.slice(0, 50).map(a => {
                                const isCurrentMatch = match?.id === a.id;
                                const usedElsewhere = matchMap[a.id] && !(matchMap[a.id].wi === wi && matchMap[a.id].si === si);
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => { setOverride(wi, si, a.id); setPickerSearch(''); }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center gap-2 ${
                                      isCurrentMatch
                                        ? 'bg-green/15 border border-green/30'
                                        : usedElsewhere
                                          ? 'bg-yellow/5 border border-yellow/20 hover:bg-yellow/10'
                                          : 'hover:bg-accent/10 border border-transparent'
                                    }`}
                                  >
                                    {isCurrentMatch && <span className="text-green shrink-0">&#10003;</span>}
                                    {usedElsewhere && <span className="text-yellow shrink-0 text-[0.6rem]">&#9888;</span>}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{a.name}</div>
                                      <div className="text-muted font-mono mt-0.5">
                                        {fmtDateWithDay(new Date(a.start_date))} · {(a.distance / 1000).toFixed(1)}km · {fmtPace(1000 / a.average_speed)}/km
                                      </div>
                                      {usedElsewhere && (
                                        <div className="text-yellow/70 mt-0.5">
                                          Gia associata a: {matchMap[a.id].label}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              }); })()}
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

      {/* Confirmation dialog for moving an activity */}
      {confirmMove && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={() => setConfirmMove(null)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl p-6 max-w-md mx-4 animate-fade-up">
            <div className="font-display text-lg tracking-wide mb-3">Sposta associazione?</div>
            <p className="text-sm text-muted mb-4">
              <strong className="text-text">{confirmMove.actName}</strong> e&apos; gia associata a <strong className="text-yellow">{confirmMove.fromLabel}</strong>.
            </p>
            <p className="text-sm text-muted mb-6">
              Vuoi spostarla alla sessione selezionata? Verra rimossa dall&apos;associazione precedente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmMove(null)}
                className="border border-border text-muted px-4 py-2 rounded-lg text-sm cursor-pointer hover:border-accent transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmMove}
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-accent2 transition-all"
              >
                Sposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
