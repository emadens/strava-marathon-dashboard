'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import { fmtPace } from '@/lib/utils';
import { vdotTrend } from '@/lib/run-analysis';
import type { StravaBestEffort } from '@/types/strava';

interface VDOTInsightProps {
  allEfforts: StravaBestEffort[];
}

export function VDOTInsight({ allEfforts }: VDOTInsightProps) {
  const trend = useMemo(() => {
    if (allEfforts.length < 2) return null;

    // Split efforts into recent (last 4 weeks) and older
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recent = allEfforts.filter(e => new Date(e.start_date) >= fourWeeksAgo);
    const older = allEfforts.filter(e => new Date(e.start_date) < fourWeeksAgo);

    if (recent.length === 0) return null;

    return vdotTrend(recent, older);
  }, [allEfforts]);

  if (!trend) return null;

  return (
    <Card>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted mb-1">VDOT Trend</div>
      <div className="flex items-end gap-3">
        <span className="font-display text-3xl text-accent">{trend.currentVDOT.toFixed(1)}</span>
        {trend.previousVDOT && trend.delta !== 0 && (
          <span className={`text-sm font-mono font-medium mb-1 ${trend.delta > 0 ? 'text-green' : 'text-red'}`}>
            {trend.delta > 0 ? '↑' : '↓'} {Math.abs(trend.delta).toFixed(1)} vs precedente
          </span>
        )}
      </div>
      <div className="text-[0.6rem] text-muted font-mono mt-1">Basato su: {trend.basedOn}</div>

      {trend.paceDelta !== 0 && Math.abs(trend.paceDelta) > 0.5 && (
        <div className={`text-xs font-medium mt-2 ${trend.paceDelta > 0 ? 'text-green' : 'text-yellow'}`}>
          Pace maratona stimato: {trend.paceDelta > 0 ? 'migliorato' : 'peggiorato'} di ~{Math.abs(trend.paceDelta).toFixed(0)} sec/km
          {trend.paceDelta > 0 && ' — equivale a ~' + (Math.abs(trend.paceDelta) * 42.195 / 60).toFixed(1) + ' minuti sulla maratona'}
        </div>
      )}

      <ChartExplainer>
        <strong>VDOT</strong>: indice di fitness basato sul modello Jack Daniels. Calcolato dal miglior sforzo recente.
        <br />Il confronto e&apos; tra gli ultimi 4 settimane vs le 4 settimane prima (stessa distanza di riferimento).
        <br />Un aumento di 1 punto VDOT equivale a ~5-8 sec/km sul pace maratona.
        <br />Mostrato solo se ci sono best efforts in entrambi i periodi.
      </ChartExplainer>
    </Card>
  );
}
