'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { fmtPace } from '@/lib/utils';
import type { TrainingWeek } from '@/types/training-plan';
import type { StravaActivity } from '@/types/strava';

interface PlanStatsProps {
  weeks: TrainingWeek[];
  activities: StravaActivity[];
  getMatchResult: (wi: number, si: number, session: TrainingWeek['sessions'][0]) => { activity: StravaActivity; isManual: boolean } | null;
  isSkipped: (wi: number, si: number) => boolean;
}

// Map plan session types to expected pace ranges (min/km)
const TYPE_PACE_RANGES: Record<string, { min: number; max: number; label: string }> = {
  easy: { min: 5.5, max: 7.5, label: 'Easy (5:30-7:30/km)' },
  recovery: { min: 6.0, max: 8.0, label: 'Recovery (6:00-8:00/km)' },
  tempo: { min: 4.5, max: 5.8, label: 'Tempo (4:30-5:50/km)' },
  interval: { min: 3.5, max: 5.5, label: 'Interval (3:30-5:30/km)' },
  long_run: { min: 5.0, max: 7.5, label: 'Long Run (5:00-7:30/km)' },
};

function getPlannedDate(dateRange: string, dayOfWeek: string): Date | null {
  const MONTHS: Record<string, number> = {
    'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
    'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
    'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
  };
  const DAY_ORDER = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

  const parts = dateRange.split('-');
  if (!parts.length) return null;
  const match = parts[0].trim().match(/(\d+)\s+(\w+)/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthKey = match[2].toLowerCase().slice(0, 3);
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  const year = month >= 11 ? 2025 : 2026;
  const weekStart = new Date(year, month, day);

  const dayIdx = DAY_ORDER.indexOf(dayOfWeek);
  if (dayIdx < 0) return null;
  const planned = new Date(weekStart);
  planned.setDate(weekStart.getDate() + dayIdx);
  return planned;
}

export function PlanStats({ weeks, activities, getMatchResult, isSkipped }: PlanStatsProps) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include today's sessions

    let totalPast = 0;       // Sessions that should have happened by now
    let totalFuture = 0;     // Sessions still to come
    let completed = 0;       // Matched with an activity
    let skipped = 0;         // Marked as skipped
    let missed = 0;          // Past, not matched, not skipped
    let distanceMet = 0;     // Activity km >= planned km
    let distanceBelow = 0;   // Activity km < planned km
    let typeMet = 0;         // Activity pace matches expected type
    let typeNotMet = 0;      // Activity pace doesn't match

    // Detailed breakdown per type
    const typeBreakdown: Record<string, { total: number; met: number; label: string }> = {};

    // Per-week compliance
    const weeklyCompliance: { week: number; dateRange: string; total: number; completed: number; skipped: number; missed: number; kmPlanned: number; kmActual: number; isPast: boolean }[] = [];

    let totalKmPlanned = 0;
    let totalKmActual = 0;
    let totalKmPlannedPast = 0;
    let totalKmActualPast = 0;

    weeks.forEach((week, wi) => {
      const weekData = week as TrainingWeek & { dateRange?: string };
      let weekCompleted = 0, weekSkipped = 0, weekMissed = 0, weekTotal = 0;
      let weekKmPlanned = 0, weekKmActual = 0;

      week.sessions.forEach((s, si) => {
        if (s.type === 'rest') return;

        const plannedDate = weekData.dateRange ? getPlannedDate(weekData.dateRange, s.dayOfWeek) : null;
        const isPast = plannedDate ? plannedDate <= today : false;
        const matchResult = getMatchResult(wi, si, s);
        const matchAct = matchResult?.activity;
        const sessionSkipped = isSkipped(wi, si);

        totalKmPlanned += s.distanceKm;

        if (isPast) {
          totalPast++;
          weekTotal++;
          totalKmPlannedPast += s.distanceKm;

          if (sessionSkipped) {
            skipped++;
            weekSkipped++;
          } else if (matchAct) {
            completed++;
            weekCompleted++;
            const actKm = matchAct.distance / 1000;
            totalKmActual += actKm;
            totalKmActualPast += actKm;
            weekKmActual += actKm;
            weekKmPlanned += s.distanceKm;

            // Distance compliance
            if (actKm >= s.distanceKm * 0.95) { // 5% tolerance
              distanceMet++;
            } else {
              distanceBelow++;
            }

            // Type compliance — check if pace matches expected range
            const actPaceMinKm = matchAct.average_speed > 0 ? 1000 / matchAct.average_speed / 60 : 0;
            const expectedRange = TYPE_PACE_RANGES[s.type];
            if (expectedRange && actPaceMinKm > 0) {
              const typeName = expectedRange.label;
              if (!typeBreakdown[s.type]) typeBreakdown[s.type] = { total: 0, met: 0, label: typeName };
              typeBreakdown[s.type].total++;

              if (actPaceMinKm >= expectedRange.min && actPaceMinKm <= expectedRange.max) {
                typeMet++;
                typeBreakdown[s.type].met++;
              } else {
                typeNotMet++;
              }
            }
          } else {
            missed++;
            weekMissed++;
            weekKmPlanned += s.distanceKm;
          }
        } else {
          totalFuture++;
          totalKmActual += 0; // future
        }
      });

      // Always add the week so we can show all weeks in the chart
      weeklyCompliance.push({
        week: week.weekNumber,
        dateRange: weekData.dateRange || '',
        total: weekTotal,
        completed: weekCompleted,
        skipped: weekSkipped,
        missed: weekMissed,
        kmPlanned: weekKmPlanned,
        kmActual: weekKmActual,
        isPast: weekTotal > 0,
      });
    });

    const complianceRate = totalPast > 0 ? (completed / totalPast * 100) : 0;
    const skipRate = totalPast > 0 ? (skipped / totalPast * 100) : 0;
    const missedRate = totalPast > 0 ? (missed / totalPast * 100) : 0;
    const distanceComplianceRate = (distanceMet + distanceBelow) > 0 ? (distanceMet / (distanceMet + distanceBelow) * 100) : 0;
    const typeComplianceRate = (typeMet + typeNotMet) > 0 ? (typeMet / (typeMet + typeNotMet) * 100) : 0;
    const kmComplianceRate = totalKmPlannedPast > 0 ? (totalKmActualPast / totalKmPlannedPast * 100) : 0;

    return {
      totalPast, totalFuture, completed, skipped, missed,
      complianceRate, skipRate, missedRate,
      distanceMet, distanceBelow, distanceComplianceRate,
      typeMet, typeNotMet, typeComplianceRate,
      typeBreakdown,
      totalKmPlanned, totalKmActual, totalKmPlannedPast, totalKmActualPast, kmComplianceRate,
      weeklyCompliance,
    };
  }, [weeks, activities, getMatchResult, isSkipped]); // eslint-disable-line react-hooks/exhaustive-deps

  const pctColor = (pct: number) => pct >= 80 ? 'text-green' : pct >= 60 ? 'text-yellow' : 'text-red';
  const pctBg = (pct: number) => pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="space-y-6 mb-8">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Aderenza piano</div>
          <div className={`font-display text-4xl ${pctColor(stats.complianceRate)}`}>
            {stats.complianceRate.toFixed(0)}%
          </div>
          <div className="text-[0.6rem] text-muted font-mono mt-1">
            {stats.completed}/{stats.totalPast} sessioni completate
          </div>
          <div className="w-full bg-surface2 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${stats.complianceRate}%`, background: pctBg(stats.complianceRate) }} />
          </div>
        </Card>

        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Sessioni saltate</div>
          <div className={`font-display text-4xl ${stats.skipRate > 20 ? 'text-red' : stats.skipRate > 10 ? 'text-yellow' : 'text-green'}`}>
            {stats.skipped}
          </div>
          <div className="text-[0.6rem] text-muted font-mono mt-1">
            {stats.skipRate.toFixed(0)}% delle sessioni passate
          </div>
          {stats.missed > 0 && (
            <div className="text-[0.6rem] text-red/70 font-mono mt-0.5">
              + {stats.missed} non tracciate
            </div>
          )}
        </Card>

        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Km vs piano</div>
          <div className={`font-display text-4xl ${pctColor(stats.kmComplianceRate)}`}>
            {stats.kmComplianceRate.toFixed(0)}%
          </div>
          <div className="text-[0.6rem] text-muted font-mono mt-1">
            {stats.totalKmActualPast.toFixed(0)} / {stats.totalKmPlannedPast.toFixed(0)} km
          </div>
          <div className="w-full bg-surface2 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, stats.kmComplianceRate)}%`, background: pctBg(stats.kmComplianceRate) }} />
          </div>
        </Card>

        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Rimanenti</div>
          <div className="font-display text-4xl text-accent">
            {stats.totalFuture}
          </div>
          <div className="text-[0.6rem] text-muted font-mono mt-1">
            sessioni ancora da fare
          </div>
          <div className="text-[0.6rem] text-muted/60 font-mono mt-0.5">
            ~{(stats.totalKmPlanned - stats.totalKmActual).toFixed(0)} km rimanenti
          </div>
        </Card>
      </div>

      {/* Distance & Type compliance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card hover={false}>
          <div className="font-display text-base tracking-wide mb-3">Distanza rispettata</div>
          <div className="flex items-end gap-3 mb-3">
            <span className={`font-display text-3xl ${pctColor(stats.distanceComplianceRate)}`}>
              {stats.distanceComplianceRate.toFixed(0)}%
            </span>
            <span className="text-xs text-muted mb-1">
              {stats.distanceMet} su {stats.distanceMet + stats.distanceBelow} attivita
            </span>
          </div>
          <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${stats.distanceComplianceRate}%`, background: pctBg(stats.distanceComplianceRate) }} />
          </div>
          <div className="text-[0.6rem] text-muted">
            Sessioni con km effettivi &ge; 95% del pianificato
          </div>
        </Card>

        <Card hover={false}>
          <div className="font-display text-base tracking-wide mb-3">Tipologia rispettata</div>
          <div className="flex items-end gap-3 mb-3">
            <span className={`font-display text-3xl ${pctColor(stats.typeComplianceRate)}`}>
              {stats.typeComplianceRate.toFixed(0)}%
            </span>
            <span className="text-xs text-muted mb-1">
              {stats.typeMet} su {stats.typeMet + stats.typeNotMet} attivita
            </span>
          </div>
          <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all" style={{ width: `${stats.typeComplianceRate}%`, background: pctBg(stats.typeComplianceRate) }} />
          </div>
          {/* Breakdown per type */}
          <div className="space-y-1.5">
            {Object.entries(stats.typeBreakdown).map(([type, data]) => {
              const pct = data.total > 0 ? (data.met / data.total * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-2 text-[0.65rem]">
                  <span className="text-muted w-24 truncate">{data.label.split('(')[0].trim()}</span>
                  <div className="flex-1 bg-surface2 rounded-full h-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pctBg(pct) }} />
                  </div>
                  <span className="font-mono text-muted w-16 text-right">{data.met}/{data.total} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
          <div className="text-[0.6rem] text-muted mt-2">
            Ritmo dell&apos;attivita nel range atteso per il tipo di sessione
          </div>
        </Card>
      </div>

      {/* Weekly compliance mini-chart */}
      <Card hover={false}>
        <div className="font-display text-base tracking-wide mb-1">Aderenza per settimana</div>
        <div className="text-[0.72rem] text-muted mb-4">
          completate vs pianificate
          <span className="ml-2 text-[0.6rem]">
            <span style={{ color: 'var(--green)' }}>&#9632;</span> completate
            <span className="ml-1.5" style={{ color: 'var(--yellow)' }}>&#9632;</span> saltate
            <span className="ml-1.5" style={{ color: 'var(--muted)' }}>&#9632;</span> future
          </span>
        </div>
        <div className="flex gap-1 items-end h-28">
          {stats.weeklyCompliance.map((w) => {
            const sessionsInWeek = weeks.find(wk => wk.weekNumber === w.week)?.sessions.filter(s => s.type !== 'rest').length || 1;
            const pct = w.isPast && w.total > 0 ? (w.completed / w.total * 100) : 0;
            const skipPct = w.isPast && w.total > 0 ? (w.skipped / w.total * 100) : 0;

            // Determine if this is the current week
            const today = new Date();
            const isCurrent = (() => {
              if (!w.dateRange) return false;
              const parts = w.dateRange.split('-');
              const m = parts[0]?.trim().match(/(\d+)\s+(\w+)/);
              if (!m) return false;
              const MONTHS: Record<string, number> = { 'gen':0,'jan':0,'feb':1,'mar':2,'apr':3,'mag':4,'may':4,'giu':5,'jun':5,'lug':6,'jul':6,'ago':7,'aug':7,'set':8,'sep':8,'ott':9,'oct':9,'nov':10,'dic':11,'dec':11 };
              const month = MONTHS[m[2].toLowerCase().slice(0,3)];
              if (month === undefined) return false;
              const year = month >= 11 ? 2025 : 2026;
              const start = new Date(year, month, parseInt(m[1]));
              const end = new Date(start); end.setDate(end.getDate() + 6);
              return today >= start && today <= end;
            })();

            const isFuture = !w.isPast && !isCurrent;

            return (
              <div
                key={w.week}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={w.isPast
                  ? `Sett. ${w.week}: ${w.completed}/${w.total} completate, ${w.skipped} saltate`
                  : `Sett. ${w.week}: ${sessionsInWeek} sessioni pianificate`
                }
              >
                <div className="w-full rounded-sm overflow-hidden bg-surface2 relative" style={{ height: '100%' }}>
                  {isFuture ? (
                    // Future: show a dim outline
                    <div className="absolute bottom-0 w-full rounded-sm border border-dashed border-border/40" style={{ height: '30%' }} />
                  ) : (
                    <>
                      {/* Completed bar */}
                      <div
                        className="absolute bottom-0 w-full rounded-sm transition-all"
                        style={{ height: `${pct}%`, background: isCurrent ? 'var(--accent)' : 'var(--green)' }}
                      />
                      {/* Skipped bar on top */}
                      {skipPct > 0 && (
                        <div
                          className="absolute w-full rounded-sm transition-all"
                          style={{ bottom: `${pct}%`, height: `${skipPct}%`, background: 'var(--yellow)', opacity: 0.6 }}
                        />
                      )}
                    </>
                  )}
                </div>
                <span className={`text-[0.5rem] font-mono ${isCurrent ? 'text-accent font-bold' : isFuture ? 'text-muted/20' : 'text-muted/50'}`}>
                  {w.week}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
