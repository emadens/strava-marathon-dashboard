'use client';

import { Card } from '@/components/ui/Card';
import type { Goal } from '@/types/goals';

interface GoalCardProps {
  goal: Goal;
  current: number;
  onRemove: (id: string) => void;
}

export function GoalCard({ goal, current, onRemove }: GoalCardProps) {
  const pct = Math.min(100, (current / goal.target) * 100);
  const isComplete = pct >= 100;

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

      <div className="flex items-end gap-2 mb-3">
        <span className="font-display text-3xl leading-none">{current.toFixed(1)}</span>
        <span className="text-muted text-sm mb-0.5">/ {goal.target} {unitMap[goal.type]}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface2 rounded-full h-2 overflow-hidden">
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
      <div className="text-right text-[0.65rem] text-muted font-mono mt-1">
        {pct.toFixed(0)}%
      </div>
    </Card>
  );
}
