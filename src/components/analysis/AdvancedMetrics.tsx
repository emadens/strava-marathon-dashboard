'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace } from '@/lib/utils';
import { hrDrift, compareVsHistorical, typeLabel } from '@/lib/run-analysis';
import type { StravaSplit, StravaActivity } from '@/types/strava';

interface AdvancedMetricsProps {
  splits: StravaSplit[];
  activity: StravaActivity;
  allActivities: StravaActivity[];
  activityType?: string;
}

export function AdvancedMetrics({ splits, activity, allActivities, activityType }: AdvancedMetricsProps) {
  const drift = useMemo(() => hrDrift(splits), [splits]);
  const historical = useMemo(
    () => compareVsHistorical(activity, allActivities, activityType),
    [activity, allActivities, activityType]
  );

  const hasAnything = drift !== null || historical !== null;
  if (!hasAnything) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* HR Drift */}
      {drift !== null && (
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">HR Drift</div>
          {drift.valid ? (
            <>
              <div className={`font-display text-3xl ${drift.ratio < 1.06 ? 'text-green' : drift.ratio < 1.12 ? 'text-yellow' : 'text-red'}`}>
                +{((drift.ratio - 1) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted mt-1">
                {drift.ratio < 1.06 ? 'Eccellente — HR molto stabile' : drift.ratio < 1.12 ? 'Nella norma' : 'Significativo — possibile affaticamento'}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted py-2">{drift.reason}</div>
          )}
          <ChartExplainer>
            <strong>HR Drift</strong>: rapporto FC media ultimi 3km / primi 3km.
            <br />&lt;6% = eccellente, 6-12% = normale, &gt;12% = significativo.
            <br />Mostrato solo se: &ge;6km, ritmo costante (&lt;10% variazione), dislivello contenuto.
            <br />Un drift basso a ritmo costante indica buona efficienza aerobica.
          </ChartExplainer>
        </Card>
      )}

      {/* Historical comparison */}
      {historical !== null && (
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">
            vs media {typeLabel(historical.type)}
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">Ritmo questa corsa</span>
              <span className="text-xs font-mono font-medium">{fmtPace(historical.currentPace)}/km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">Media storica ({historical.sampleSize} corse)</span>
              <span className="text-xs font-mono">{fmtPace(historical.historicalAvgPace)}/km</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/30">
              <span className="text-xs text-muted">Delta</span>
              <span className={`text-xs font-mono font-medium ${historical.delta > 0 ? 'text-green' : historical.delta < -3 ? 'text-yellow' : 'text-muted'}`}>
                {historical.delta > 0 ? 'Piu veloce di ' : 'Piu lento di '}
                {Math.abs(historical.delta).toFixed(0)} sec/km
              </span>
            </div>
            {historical.currentHR && historical.historicalAvgHR && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">HR: questa vs media</span>
                <span className="text-xs font-mono">
                  {Math.round(historical.currentHR)} vs {Math.round(historical.historicalAvgHR)} bpm
                </span>
              </div>
            )}
          </div>
          <ChartExplainer>
            <strong>Confronto storico</strong>: ritmo di questa corsa vs media delle {typeLabel(historical.type).toLowerCase()} delle ultime 8 settimane.
            <br />Richiede almeno 3 corse dello stesso tipo.
            <br />Tipo determinato {activityType ? 'dal piano di allenamento' : 'automaticamente per ritmo/distanza'}.
          </ChartExplainer>
        </Card>
      )}
    </div>
  );
}
