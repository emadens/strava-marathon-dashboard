'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace } from '@/lib/utils';
import { weeklyComparison } from '@/lib/run-analysis';
import type { StravaActivity } from '@/types/strava';

export function WeeklyInsights({ activities }: { activities: StravaActivity[] }) {
  const comp = useMemo(() => weeklyComparison(activities), [activities]);

  const kmDelta = comp.thisWeek.km - comp.lastWeek.km;
  const runsDelta = comp.thisWeek.runs - comp.lastWeek.runs;
  const kmVs4w = comp.avg4Weeks.km > 0 ? ((comp.thisWeek.km - comp.avg4Weeks.km) / comp.avg4Weeks.km * 100) : null;

  const hasEasyComparison = comp.thisWeek.easyPace !== null && comp.lastWeek.easyPace !== null;
  const easyDelta = hasEasyComparison ? comp.lastWeek.easyPace! - comp.thisWeek.easyPace! : 0;

  // Don't show if no data at all
  if (comp.thisWeek.runs === 0 && comp.lastWeek.runs === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl tracking-wide">Insights settimanali</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Volume */}
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Volume questa settimana</div>
          <div className="flex items-end gap-3">
            <span className="font-display text-3xl">{comp.thisWeek.km.toFixed(1)}</span>
            <span className="text-muted text-sm mb-1">km in {comp.thisWeek.runs} corse</span>
          </div>

          {comp.lastWeek.runs > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-mono">
                vs scorsa settimana:
                <span className={`ml-1 font-medium ${kmDelta >= 0 ? 'text-green' : 'text-red'}`}>
                  {kmDelta >= 0 ? '+' : ''}{kmDelta.toFixed(1)} km ({runsDelta >= 0 ? '+' : ''}{runsDelta} corse)
                </span>
              </div>
              {kmVs4w !== null && (
                <div className="text-[0.65rem] text-muted font-mono">
                  vs media 4 sett: <span className={kmVs4w >= 0 ? 'text-green' : 'text-yellow'}>{kmVs4w >= 0 ? '+' : ''}{kmVs4w.toFixed(0)}%</span>
                  {' '}({comp.avg4Weeks.km.toFixed(1)} km/sett)
                </div>
              )}
            </div>
          )}

          <ChartExplainer>
            <strong>Volume</strong>: km totali e numero corse questa settimana (da lunedi).
            <br />Il confronto con la settimana scorsa mostra il delta assoluto.
            <br />Il confronto con la media 4 settimane da contesto: evita insight falsamente drammatici da una singola settimana anomala.
          </ChartExplainer>
        </Card>

        {/* Easy pace */}
        {hasEasyComparison ? (
          <Card>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Ritmo easy run</div>
            <div className="flex items-end gap-3">
              <span className="font-display text-3xl">{fmtPace(comp.thisWeek.easyPace!)}</span>
              <span className="text-muted text-sm mb-1">min/km</span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-mono">
                vs scorsa settimana:
                <span className={`ml-1 font-medium ${easyDelta > 0 ? 'text-green' : easyDelta < 0 ? 'text-yellow' : 'text-muted'}`}>
                  {easyDelta > 0 ? 'Piu veloce di ' : easyDelta < 0 ? 'Piu lento di ' : ''}
                  {Math.abs(easyDelta).toFixed(0)} sec/km
                </span>
              </div>
              {comp.avg4Weeks.easyPace !== null && (
                <div className="text-[0.65rem] text-muted font-mono mt-1">
                  media 4 sett: {fmtPace(comp.avg4Weeks.easyPace)}
                </div>
              )}
            </div>

            <ChartExplainer>
              <strong>Ritmo easy run</strong>: media del ritmo delle corse facili (&gt;5:30/km, &lt;12km) questa settimana.
              <br />Mostrato solo se ci sono almeno 2 easy run sia questa che la scorsa settimana.
              <br />Un miglioramento del ritmo easy a HR simile indica miglioramento della fitness aerobica.
            </ChartExplainer>
          </Card>
        ) : (
          <Card>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-2">Ritmo easy run</div>
            <div className="text-sm text-muted py-4">
              {comp.thisWeek.easyPace !== null
                ? 'Servono almeno 2 easy run anche la scorsa settimana per il confronto.'
                : 'Servono almeno 2 easy run questa settimana per il calcolo.'}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
