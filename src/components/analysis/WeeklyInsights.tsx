'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace } from '@/lib/utils';
import type { StravaActivity } from '@/types/strava';

interface WeeklyInsightsProps {
  activities: StravaActivity[];
  weekOffset?: number; // 0 = this week, 1 = last week, etc.
}

function calcWeekStats(activities: StravaActivity[], start: Date, end: Date) {
  const acts = activities.filter(a => {
    const d = new Date(a.start_date);
    return d >= start && d < end;
  });

  const km = acts.reduce((s, a) => s + a.distance / 1000, 0);
  const runs = acts.length;

  const easyRuns = acts.filter(a => {
    const pace = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
    return pace > 5.5 && a.distance < 12000;
  });
  const easyPace = easyRuns.length >= 2
    ? easyRuns.reduce((s, a) => s + 1000 / a.average_speed, 0) / easyRuns.length
    : null;

  return { km, runs, easyPace, acts };
}

export function WeeklyInsights({ activities, weekOffset = 0 }: WeeklyInsightsProps) {
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

    const selected = calcWeekStats(activities, baseMonday, baseSunday);
    const prev = calcWeekStats(activities, prevMonday, baseMonday);
    const fourWeekActs = activities.filter(a => {
      const d = new Date(a.start_date);
      return d >= fourWeeksAgo && d < baseMonday;
    });
    const avg4 = {
      km: fourWeekActs.reduce((s, a) => s + a.distance / 1000, 0) / 4,
      runs: Math.round(fourWeekActs.length / 4),
      easyPace: (() => {
        const easy = fourWeekActs.filter(a => {
          const pace = a.average_speed > 0 ? 1000 / a.average_speed / 60 : 0;
          return pace > 5.5 && a.distance < 12000;
        });
        return easy.length >= 4 ? easy.reduce((s, a) => s + 1000 / a.average_speed, 0) / easy.length : null;
      })(),
    };

    const weekLabel = baseMonday.toLocaleDateString('it', { day: '2-digit', month: 'short' }) +
      ' — ' + new Date(baseSunday.getTime() - 86400000).toLocaleDateString('it', { day: '2-digit', month: 'short' });

    return { selected, prev, avg4, weekLabel };
  }, [activities, weekOffset]);

  const kmDelta = comp.selected.km - comp.prev.km;
  const runsDelta = comp.selected.runs - comp.prev.runs;
  const kmVs4w = comp.avg4.km > 0 ? ((comp.selected.km - comp.avg4.km) / comp.avg4.km * 100) : null;

  const hasEasyComparison = comp.selected.easyPace !== null && comp.prev.easyPace !== null;
  const easyDelta = hasEasyComparison ? comp.prev.easyPace! - comp.selected.easyPace! : 0;

  if (comp.selected.runs === 0 && comp.prev.runs === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <p>Nessuna attivita in questa settimana o nella precedente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted font-mono mb-2">Settimana: {comp.weekLabel}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume */}
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Volume</div>
          <div className="flex items-end gap-3">
            <span className="font-display text-3xl">{comp.selected.km.toFixed(1)}</span>
            <span className="text-muted text-sm mb-1">km in {comp.selected.runs} corse</span>
          </div>

          {comp.prev.runs > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-mono">
                vs settimana precedente:
                <span className={`ml-1 font-medium ${kmDelta >= 0 ? 'text-green' : 'text-red'}`}>
                  {kmDelta >= 0 ? '+' : ''}{kmDelta.toFixed(1)} km ({runsDelta >= 0 ? '+' : ''}{runsDelta} corse)
                </span>
              </div>
              {kmVs4w !== null && (
                <div className="text-[0.65rem] text-muted font-mono">
                  vs media 4 sett: <span className={kmVs4w >= 0 ? 'text-green' : 'text-yellow'}>{kmVs4w >= 0 ? '+' : ''}{kmVs4w.toFixed(0)}%</span>
                  {' '}({comp.avg4.km.toFixed(1)} km/sett)
                </div>
              )}
            </div>
          )}

          <ChartExplainer>
            <strong>Volume</strong>: km totali e numero corse nella settimana selezionata.
            <br />Il confronto con la settimana precedente mostra il delta assoluto.
            <br />Il confronto con la media 4 settimane da contesto per evitare insight falsamente drammatici.
          </ChartExplainer>
        </Card>

        {/* Easy pace */}
        {hasEasyComparison ? (
          <Card>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Ritmo easy run</div>
            <div className="flex items-end gap-3">
              <span className="font-display text-3xl">{fmtPace(comp.selected.easyPace!)}</span>
              <span className="text-muted text-sm mb-1">min/km</span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-mono">
                vs settimana precedente:
                <span className={`ml-1 font-medium ${easyDelta > 0 ? 'text-green' : easyDelta < 0 ? 'text-yellow' : 'text-muted'}`}>
                  {easyDelta > 0 ? 'Piu veloce di ' : easyDelta < 0 ? 'Piu lento di ' : ''}
                  {Math.abs(easyDelta).toFixed(0)} sec/km
                </span>
              </div>
              {comp.avg4.easyPace !== null && (
                <div className="text-[0.65rem] text-muted font-mono mt-1">
                  media 4 sett: {fmtPace(comp.avg4.easyPace)}
                </div>
              )}
            </div>

            <ChartExplainer>
              <strong>Ritmo easy run</strong>: media del ritmo delle corse facili (&gt;5:30/km, &lt;12km).
              <br />Mostrato solo se ci sono almeno 2 easy run in entrambe le settimane.
              <br />Un miglioramento del ritmo easy a HR simile indica miglioramento fitness aerobica.
            </ChartExplainer>
          </Card>
        ) : (
          <Card>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Ritmo easy run</div>
            <div className="text-sm text-muted py-4">
              Servono almeno 2 easy run in entrambe le settimane per il confronto.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
