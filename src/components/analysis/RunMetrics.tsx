'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace } from '@/lib/utils';
import { pacingIndex, pacingLabel, splitAnalysis, kmHighlights } from '@/lib/run-analysis';
import type { StravaSplit } from '@/types/strava';

export function RunMetrics({ splits }: { splits: StravaSplit[] }) {
  const metrics = useMemo(() => {
    const pi = pacingIndex(splits);
    const pl = pacingLabel(pi);
    const sa = splitAnalysis(splits);
    const km = kmHighlights(splits);
    return { pi, pl, sa, km };
  }, [splits]);

  if (splits.length < 2) return null;

  const splitColors = { negative: 'text-green', even: 'text-blue', positive: 'text-yellow' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Pacing consistency */}
      <Card>
        <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Regolarita</div>
        <div className="font-display text-3xl leading-none" style={{ color: metrics.pl.color }}>
          {metrics.pi.toFixed(1)}%
        </div>
        <div className="text-xs mt-1" style={{ color: metrics.pl.color }}>{metrics.pl.label}</div>
        <ChartExplainer>
          <strong>Indice di regolarita</strong>: deviazione standard del ritmo divisa per il ritmo medio, in percentuale.
          <br />&lt;5% = molto costante, 5-10% = normale, &gt;10% = irregolare.
          <br />Un ritmo costante e&apos; fondamentale per una buona maratona.
        </ChartExplainer>
      </Card>

      {/* Split analysis */}
      {metrics.sa && (
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Split</div>
          <div className={`font-display text-2xl leading-none ${splitColors[metrics.sa.type]}`}>
            {metrics.sa.label}
          </div>
          <div className="text-xs text-muted font-mono mt-2">
            1a meta: {fmtPace(metrics.sa.firstHalfPace)}/km
          </div>
          <div className="text-xs text-muted font-mono">
            2a meta: {fmtPace(metrics.sa.secondHalfPace)}/km
          </div>
          <div className={`text-xs font-medium mt-1 ${splitColors[metrics.sa.type]}`}>
            {metrics.sa.delta > 0 ? '↑' : metrics.sa.delta < 0 ? '↓' : '='} {Math.abs(metrics.sa.delta).toFixed(0)} sec/km
          </div>
          <ChartExplainer>
            <strong>Negative split</strong>: seconda meta piu veloce — strategia ideale per maratona.
            <br /><strong>Even split</strong>: differenza &lt;3 sec/km — ritmo uniforme.
            <br /><strong>Positive split</strong>: seconda meta piu lenta — possibile calo energetico o partenza troppo veloce.
          </ChartExplainer>
        </Card>
      )}

      {/* Best/worst km */}
      {metrics.km && (
        <Card>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">Km chiave</div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-green text-lg">&#9650;</span>
              <div>
                <div className="text-xs font-medium">
                  Km {metrics.km.fastest.split} — {fmtPace(metrics.km.fastest.pace)}/km
                </div>
                <div className="text-[0.6rem] text-muted font-mono">
                  {metrics.km.fastest.elevation > 0 ? '+' : ''}{metrics.km.fastest.elevation.toFixed(0)}m
                  ({metrics.km.fastest.gradient > 0 ? '+' : ''}{metrics.km.fastest.gradient.toFixed(1)}%)
                </div>
              </div>
            </div>
            {metrics.km.fastestFlat && (
              <div className="flex items-center gap-2">
                <span className="text-blue text-lg">&#9650;</span>
                <div>
                  <div className="text-xs font-medium">
                    Km {metrics.km.fastestFlat.split} — {fmtPace(metrics.km.fastestFlat.pace)}/km
                    <span className="text-muted ml-1">(su piano)</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-red text-lg">&#9660;</span>
              <div>
                <div className="text-xs font-medium">
                  Km {metrics.km.slowest.split} — {fmtPace(metrics.km.slowest.pace)}/km
                </div>
                <div className="text-[0.6rem] text-muted font-mono">
                  {metrics.km.slowest.elevation > 0 ? '+' : ''}{metrics.km.slowest.elevation.toFixed(0)}m
                  ({metrics.km.slowest.gradient > 0 ? '+' : ''}{metrics.km.slowest.gradient.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
          <ChartExplainer>
            <strong>Km piu veloce</strong>: il km con ritmo migliore (attenzione: potrebbe essere in discesa).
            <br /><strong>Veloce su piano</strong>: esclude km con discesa &gt;2% — il tuo vero km migliore.
            <br /><strong>Km piu lento</strong>: con contesto pendenza per capire se e&apos; colpa del terreno.
          </ChartExplainer>
        </Card>
      )}
    </div>
  );
}
