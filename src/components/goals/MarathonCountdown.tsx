'use client';

import { Card } from '@/components/ui/Card';

interface MarathonCountdownProps {
  marathonDate: string;
  totalKmToDate: number;
}

export function MarathonCountdown({ marathonDate, totalKmToDate }: MarathonCountdownProps) {
  const target = new Date(marathonDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksLeft = Math.floor(daysLeft / 7);
  const isPast = daysLeft === 0;

  return (
    <Card className="col-span-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[0.7rem] uppercase tracking-wider text-muted mb-1">
            {isPast ? 'Giorno della gara!' : 'Countdown maratona'}
          </div>
          <div className="flex items-end gap-3">
            <span className="font-display text-5xl leading-none text-accent">
              {isPast ? '🏁' : daysLeft}
            </span>
            {!isPast && (
              <span className="text-muted text-sm mb-1">
                giorni ({weeksLeft} settimane)
              </span>
            )}
          </div>
          <div className="text-xs text-muted mt-2 font-mono">
            {target.toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[0.7rem] uppercase tracking-wider text-muted mb-1">Km totali preparazione</div>
          <div className="font-display text-3xl">{totalKmToDate.toFixed(0)}</div>
          <div className="text-xs text-muted font-mono">km percorsi</div>
        </div>
      </div>
    </Card>
  );
}
