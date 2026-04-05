'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { fmtPace } from '@/lib/utils';
import type { Goal } from '@/types/goals';

interface GoalCardProps {
  goal: Goal;
  current: number;
  trend: { weeklyAvg: number; weeksToTarget: number | null; projectedDate: string | null; methodDesc?: string };
  onRemove: (id: string) => void;
}

export function GoalCard({ goal, current, trend, onRemove }: GoalCardProps) {
  const [showMethod, setShowMethod] = useState(false);
  const isPace = goal.type === 'pace_target';
  // For pace: lower is better, so invert progress
  const pct = isPace
    ? (current > 0 ? Math.min(100, Math.max(0, (1 - (current - goal.target) / goal.target) * 100)) : 0)
    : Math.min(100, (current / goal.target) * 100);
  const isComplete = isPace ? (current > 0 && current <= goal.target) : pct >= 100;
  const remaining = isPace ? Math.max(0, current - goal.target) : Math.max(0, goal.target - current);

  const labelMap: Record<string, string> = {
    weekly_km: 'Km settimanali',
    pace_target: 'Ritmo target',
    long_run_target: 'Long run target',
    marathon_date: 'Maratona',
  };

  const unitMap: Record<string, string> = {
    weekly_km: 'km',
    pace_target: 'min/km',
    long_run_target: 'km',
    marathon_date: 'giorni',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[0.7rem] uppercase tracking-wider text-muted">
          {labelMap[goal.type] || goal.label}
        </div>
        <button
          onClick={() => onRemove(goal.id)}
          className="text-muted hover:text-red text-xs transition-colors cursor-pointer"
          title="Rimuovi obiettivo"
        >
          ✕
        </button>
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className="font-display text-3xl leading-none">
          {isPace && current > 0 ? fmtPace(current * 60) : current.toFixed(1)}
        </span>
        <span className="text-muted text-sm mb-0.5">
          / {isPace ? fmtPace(goal.target * 60) : goal.target} {unitMap[goal.type]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? 'var(--green)'
              : pct > 75
                ? 'var(--accent)'
                : pct > 50
                  ? 'var(--yellow)'
                  : 'var(--accent2)',
          }}
        />
      </div>
      <div className="text-right text-[0.65rem] text-muted font-mono">
        {pct.toFixed(0)}%
      </div>

      {/* Projection / Trend */}
      <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
        {isComplete ? (
          <div className="text-xs text-green font-medium">Obiettivo raggiunto!</div>
        ) : (
          <>
            <div className="text-[0.65rem] text-muted font-mono">
              Media: <span className="text-text">{isPace && trend.weeklyAvg > 0 ? fmtPace(trend.weeklyAvg * 60) : trend.weeklyAvg.toFixed(1)}</span> {isPace ? 'min/km (ultime 10)' : `${unitMap[goal.type]}/sett`}
            </div>
            {isPace ? (
              <div className="text-[0.65rem] font-mono">
                {current <= goal.target ? (
                  <span className="text-green">On target! Ritmo attuale piu veloce dell&apos;obiettivo</span>
                ) : (
                  <span className="text-yellow">Devi migliorare di <span className="text-text">{fmtPace(remaining * 60)}</span>/km</span>
                )}
              </div>
            ) : (
              <div className="text-[0.65rem] text-muted font-mono">
                Mancano: <span className="text-text">{remaining.toFixed(1)}</span> {unitMap[goal.type]}
              </div>
            )}
            {trend.weeksToTarget !== null && trend.weeksToTarget > 0 && goal.type === 'weekly_km' ? (
              <div className="text-[0.65rem] font-mono">
                {trend.weeklyAvg >= goal.target ? (
                  <span className="text-green">Ritmo on track — raggiungi il target ogni settimana</span>
                ) : (
                  <span className="text-yellow">Servono <span className="text-text">{(goal.target - trend.weeklyAvg).toFixed(1)}</span> km/sett in piu</span>
                )}
              </div>
            ) : trend.weeksToTarget !== null && trend.weeksToTarget > 0 ? (
              <div className="text-[0.65rem] font-mono">
                Stima raggiungimento: <span className="text-accent">{trend.projectedDate || `~${Math.ceil(trend.weeksToTarget)} sett`}</span>
              </div>
            ) : null}

            {/* How it's calculated - collapsible */}
            <button
              onClick={() => setShowMethod(!showMethod)}
              className="text-[0.6rem] text-muted/60 hover:text-muted mt-2 cursor-pointer transition-colors"
            >
              {showMethod ? '▾ Nascondi metodo' : '▸ Come calcolato?'}
            </button>
            {showMethod && (
              <div className="mt-1 text-[0.6rem] text-muted/70 leading-relaxed bg-surface2/50 rounded-lg p-2">
                {goal.type === 'weekly_km' && (
                  <>
                    <strong>Media settimanale</strong>: calcolata sulle ultime 8 settimane di attivita Strava.
                    <br />Il valore attuale ({current.toFixed(1)} km) e&apos; il totale km di questa settimana (da lunedi).
                    <br />Se la media ({trend.weeklyAvg.toFixed(1)} km/sett) supera il target ({goal.target} km), sei on track.
                  </>
                )}
                {goal.type === 'long_run_target' && (
                  <>
                    <strong>Long run piu lungo</strong>: il massimo km singola corsa tra tutte le attivita Strava.
                    <br />La stima di raggiungimento assume un incremento medio di ~1.5 km/settimana sulla corsa lunga (regola del 10%).
                    <br />Media long run ultime 8 sett: {trend.weeklyAvg.toFixed(1)} km.
                  </>
                )}
                {goal.type === 'pace_target' && (
                  <>
                    <strong>Ritmo</strong>: {trend.methodDesc || 'calcolato dalle attivita Strava recenti'}.
                    <br />Il valore attuale ({isPace && current > 0 ? fmtPace(current * 60) : current.toFixed(1)}/km) vs target ({fmtPace(goal.target * 60)}/km).
                    <br />Puoi cambiare metodo di calcolo nel selettore sopra.
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
