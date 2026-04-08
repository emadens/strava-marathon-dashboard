'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace, fmtTime } from '@/lib/utils';
import { cardiacEfficiency } from '@/lib/run-analysis';
import type { StravaActivity } from '@/types/strava';

interface WeeklyInsightsProps {
  activities: StravaActivity[];
  weekOffset?: number;
  /** Set of activity IDs confirmed as "easy" from plan associations */
  easyActivityIds?: Set<number>;
}

function calcWeekStats(activities: StravaActivity[], start: Date, end: Date, easyIds?: Set<number>) {
  const acts = activities.filter(a => {
    const d = new Date(a.start_date);
    return d >= start && d < end;
  });

  const km = acts.reduce((s, a) => s + a.distance / 1000, 0);
  const runs = acts.length;
  const totalTime = acts.reduce((s, a) => s + a.moving_time, 0);
  const totalElev = acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  const longestRun = acts.length > 0 ? Math.max(...acts.map(a => a.distance / 1000)) : 0;

  const avgPace = acts.filter(a => a.average_speed > 0).length > 0
    ? acts.filter(a => a.average_speed > 0).reduce((s, a) => s + 1000 / a.average_speed, 0) / acts.filter(a => a.average_speed > 0).length
    : null;

  const hrActs = acts.filter(a => a.average_heartrate);
  const avgHR = hrActs.length > 0
    ? hrActs.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) / hrActs.length
    : null;

  // Easy runs: from plan confirmations first, then fallback to pace/distance
  const easyRuns = acts.filter(a => {
    // If we have plan data, check if this activity is confirmed as easy
    if (easyIds && easyIds.has(a.id)) return true;
    // Fallback: pace > 5:30/km and < 12km
    if (!easyIds || easyIds.size === 0) {
      const pace = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
      return pace > 5.5 && a.distance < 12000;
    }
    return false;
  });
  const easyPace = easyRuns.length >= 1
    ? easyRuns.reduce((s, a) => s + 1000 / a.average_speed, 0) / easyRuns.length
    : null;

  return { km, runs, totalTime, totalElev, longestRun, avgPace, avgHR, easyPace, easyCount: easyRuns.length, acts };
}

export function WeeklyInsights({ activities, weekOffset = 0, easyActivityIds }: WeeklyInsightsProps) {
  const comp = useMemo(() => {
    const now = new Date();
    const baseMonday = new Date(now);
    baseMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - weekOffset * 7);
    baseMonday.setHours(0, 0, 0, 0);

    const baseSunday = new Date(baseMonday);
    baseSunday.setDate(baseMonday.getDate() + 7);

    const prevMonday = new Date(baseMonday);
    prevMonday.setDate(baseMonday.getDate() - 7);

    const fourWeeksAgo = new Date(baseMonday);
    fourWeeksAgo.setDate(baseMonday.getDate() - 28);

    const selected = calcWeekStats(activities, baseMonday, baseSunday, easyActivityIds);
    const prev = calcWeekStats(activities, prevMonday, baseMonday, easyActivityIds);

    const fourWeekActs = activities.filter(a => {
      const d = new Date(a.start_date);
      return d >= fourWeeksAgo && d < baseMonday;
    });
    const avg4Km = fourWeekActs.reduce((s, a) => s + a.distance / 1000, 0) / 4;
    const avg4Easy = (() => {
      const easy = fourWeekActs.filter(a => {
        const pace = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
        return pace > 5.5 && a.distance < 12000;
      });
      return easy.length >= 4 ? easy.reduce((s, a) => s + 1000 / a.average_speed, 0) / easy.length : null;
    })();

    const weekLabel = baseMonday.toLocaleDateString('it', { day: '2-digit', month: 'short' }) +
      ' — ' + new Date(baseSunday.getTime() - 86400000).toLocaleDateString('it', { day: '2-digit', month: 'short' });

    return { selected, prev, avg4Km, avg4Easy, weekLabel };
  }, [activities, weekOffset, easyActivityIds]);

  const s = comp.selected;
  const p = comp.prev;
  const kmDelta = s.km - p.km;
  const kmVs4w = comp.avg4Km > 0 ? ((s.km - comp.avg4Km) / comp.avg4Km * 100) : null;
  const hasEasyComp = s.easyPace !== null && p.easyPace !== null;
  const easyDelta = hasEasyComp ? p.easyPace! - s.easyPace! : 0;

  if (s.runs === 0 && p.runs === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <p>Nessuna attivita in questa settimana o nella precedente</p>
      </div>
    );
  }

  const deltaColor = (val: number, higherBetter = true) => {
    if (val === 0) return 'text-muted';
    return (higherBetter ? val > 0 : val < 0) ? 'text-green' : 'text-red';
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted font-mono">Settimana: {comp.weekLabel}</div>

      {/* Summary KPIs row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Distanza</div>
          <div className="font-display text-3xl">{s.km.toFixed(1)}</div>
          <div className="text-[0.6rem] text-muted font-mono">km</div>
          {p.runs > 0 && (
            <div className={`text-[0.65rem] font-mono mt-1 ${deltaColor(kmDelta)}`}>
              {kmDelta >= 0 ? '+' : ''}{kmDelta.toFixed(1)} vs prec.
            </div>
          )}
        </Card>
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Corse</div>
          <div className="font-display text-3xl">{s.runs}</div>
          <div className="text-[0.6rem] text-muted font-mono">{fmtTime(s.totalTime)}</div>
          {p.runs > 0 && (
            <div className={`text-[0.65rem] font-mono mt-1 ${deltaColor(s.runs - p.runs)}`}>
              {s.runs - p.runs >= 0 ? '+' : ''}{s.runs - p.runs} vs prec.
            </div>
          )}
        </Card>
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Corsa lunga</div>
          <div className="font-display text-3xl">{s.longestRun > 0 ? s.longestRun.toFixed(1) : '—'}</div>
          <div className="text-[0.6rem] text-muted font-mono">km</div>
          {p.longestRun > 0 && s.longestRun > 0 && (
            <div className={`text-[0.65rem] font-mono mt-1 ${deltaColor(s.longestRun - p.longestRun)}`}>
              {s.longestRun - p.longestRun >= 0 ? '+' : ''}{(s.longestRun - p.longestRun).toFixed(1)} vs prec.
            </div>
          )}
        </Card>
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Dislivello</div>
          <div className="font-display text-3xl">{Math.round(s.totalElev)}</div>
          <div className="text-[0.6rem] text-muted font-mono">m</div>
          {p.totalElev > 0 && s.totalElev > 0 && (
            <div className={`text-[0.65rem] font-mono mt-1 ${deltaColor(s.totalElev - p.totalElev)}`}>
              {s.totalElev - p.totalElev >= 0 ? '+' : ''}{Math.round(s.totalElev - p.totalElev)} vs prec.
            </div>
          )}
        </Card>
      </div>

      {/* Detailed analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume detail */}
        <Card hover={false}>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-3">Volume vs tendenza</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">vs settimana precedente</span>
              <span className={`text-xs font-mono font-medium ${deltaColor(kmDelta)}`}>
                {kmDelta >= 0 ? '+' : ''}{kmDelta.toFixed(1)} km
              </span>
            </div>
            {kmVs4w !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">vs media 4 settimane</span>
                <span className={`text-xs font-mono font-medium ${deltaColor(kmVs4w)}`}>
                  {kmVs4w >= 0 ? '+' : ''}{kmVs4w.toFixed(0)}% ({comp.avg4Km.toFixed(1)} km/sett)
                </span>
              </div>
            )}
            {s.avgPace && (
              <div className="flex justify-between items-center pt-2 border-t border-border/30">
                <span className="text-xs text-muted">Ritmo medio</span>
                <span className="text-xs font-mono">{fmtPace(s.avgPace)}/km</span>
              </div>
            )}
            {s.avgHR && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">FC media</span>
                <span className="text-xs font-mono">{Math.round(s.avgHR)} bpm</span>
              </div>
            )}
          </div>
          <ChartExplainer>
            <strong>Volume</strong>: km totali e confronto con la settimana precedente e la media delle 4 settimane prima.
            <br />Un aumento &gt;10% settimana su settimana e&apos; da monitorare per rischio infortuni (regola del 10%).
          </ChartExplainer>
        </Card>

        {/* Easy pace */}
        <Card hover={false}>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-3">Ritmo easy run</div>
          {hasEasyComp ? (
            <div className="space-y-2">
              <div className="flex items-end gap-3">
                <span className="font-display text-3xl">{fmtPace(s.easyPace!)}</span>
                <span className="text-muted text-sm mb-1">min/km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">vs settimana precedente</span>
                <span className={`text-xs font-mono font-medium ${easyDelta > 0 ? 'text-green' : easyDelta < 0 ? 'text-yellow' : 'text-muted'}`}>
                  {easyDelta > 0 ? 'Piu veloce di ' : easyDelta < 0 ? 'Piu lento di ' : ''}
                  {Math.abs(easyDelta).toFixed(0)} sec/km
                </span>
              </div>
              {comp.avg4Easy !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted">media 4 settimane</span>
                  <span className="text-xs font-mono">{fmtPace(comp.avg4Easy)}/km</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted py-4">
              Servono almeno 1 easy run (&gt;5:30/km, &lt;12km) in entrambe le settimane.
            </div>
          )}
          <ChartExplainer>
            <strong>Ritmo easy run</strong>: media del ritmo delle corse easy.
            <br />{easyActivityIds && easyActivityIds.size > 0
              ? 'Classificazione basata sulle associazioni confermate nel piano di allenamento (sessioni Easy/Recovery).'
              : 'Classificazione automatica: corse con ritmo >5:30/km e distanza <12km.'
            }
            <br />Un miglioramento del ritmo easy a HR simile indica miglioramento fitness aerobica.
          </ChartExplainer>
        </Card>
      </div>

      {/* V2: Cardiac efficiency */}
      {(() => {
        // Calculate week start for search
        const now = new Date();
        const baseMonday = new Date(now);
        baseMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - (weekOffset || 0) * 7);
        baseMonday.setHours(0, 0, 0, 0);

        const cardiac = cardiacEfficiency(comp.selected.acts, activities, baseMonday);
        if (!cardiac?.valid) return null;
        const weeksLabel = cardiac.weeksAgo === 1 ? 'settimana scorsa' : `${cardiac.weeksAgo} settimane fa`;
        return (
          <Card hover={false}>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Efficienza cardiovascolare</div>
            <div className="flex items-end gap-3 mb-2">
              <span className={`font-display text-3xl ${cardiac.hrDelta > 0 ? 'text-green' : cardiac.hrDelta < -2 ? 'text-red' : 'text-muted'}`}>
                {cardiac.hrDelta > 0 ? '-' : '+'}{Math.abs(cardiac.hrDelta).toFixed(0)}
              </span>
              <span className="text-muted text-sm mb-1">bpm vs {weeksLabel}</span>
            </div>
            <div className="space-y-1.5 mb-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">FC media questa settimana</span>
                <span className="font-mono font-medium">{cardiac.thisHR} bpm</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">FC media {weeksLabel}</span>
                <span className="font-mono">{cardiac.prevHR} bpm</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">A ritmo comparabile di</span>
                <span className="font-mono">~{cardiac.paceRange}/km</span>
              </div>
            </div>
            <div className={`text-xs font-medium ${cardiac.hrDelta > 0 ? 'text-green' : cardiac.hrDelta < -2 ? 'text-yellow' : 'text-muted'}`}>
              {cardiac.hrDelta > 0
                ? `Miglioramento: cuore piu efficiente a parita di ritmo`
                : cardiac.hrDelta < -2
                  ? `Attenzione: cuore sotto piu stress a parita di ritmo`
                  : `Stabile — nessun cambiamento significativo`
              }
            </div>
            <ChartExplainer>
              <strong>Efficienza cardiovascolare</strong>: confronta la FC media su corse con ritmo simile (±15%).
              <br />Cerca la settimana di confronto piu recente (fino a 8 settimane indietro) con dati comparabili.
              <br />Un calo della FC a parita di ritmo indica miglioramento della fitness aerobica.
            </ChartExplainer>
          </Card>
        );
      })()}

      {/* Activity list for the week */}
      {s.acts.length > 0 && (
        <Card hover={false}>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-3">Corse della settimana</div>
          <div className="space-y-2">
            {s.acts
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map(a => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: a.distance >= 15000 ? 'var(--accent)' : a.distance >= 10000 ? 'var(--accent2)' : 'var(--green)' }}
                  />
                  <span className="text-muted font-mono text-xs w-16">
                    {new Date(a.start_date).toLocaleDateString('it', { weekday: 'short', day: '2-digit' })}
                  </span>
                  <span className="flex-1 truncate font-medium">{a.name}</span>
                  <span className="font-mono text-xs text-muted">{(a.distance / 1000).toFixed(1)}km</span>
                  <span className="font-mono text-xs text-muted">{fmtPace(1000 / a.average_speed)}/km</span>
                  {a.average_heartrate && (
                    <span className="font-mono text-xs text-muted">{Math.round(a.average_heartrate)}bpm</span>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
