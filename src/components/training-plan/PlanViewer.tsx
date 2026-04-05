'use client';

import { Card } from '@/components/ui/Card';
import type { TrainingWeek } from '@/types/training-plan';

interface PlanViewerProps {
  weeks: TrainingWeek[];
}

const SESSION_COLORS: Record<string, string> = {
  easy: 'var(--green)',
  recovery: 'var(--blue)',
  tempo: 'var(--yellow)',
  interval: 'var(--accent)',
  long_run: 'var(--accent2)',
  rest: 'var(--muted)',
  cross_training: 'var(--blue)',
};

const SESSION_LABELS: Record<string, string> = {
  easy: 'Easy',
  recovery: 'Recupero',
  tempo: 'Tempo',
  interval: 'Intervalli',
  long_run: 'Lungo',
  rest: 'Riposo',
  cross_training: 'Cross',
};

const DAYS = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function PlanViewer({ weeks }: PlanViewerProps) {
  if (!weeks.length) return null;

  return (
    <div className="space-y-6">
      {weeks.map((week, wi) => (
        <Card key={wi} hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-lg tracking-wide">
              Settimana {week.weekNumber ?? wi + 1}
            </div>
            <div className="text-xs text-muted font-mono">
              {week.weeklyTotalKm.toFixed(1)} km totali
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, di) => {
              const session = week.sessions.find(
                s => s.dayOfWeek.toLowerCase() === day
              );

              return (
                <div key={day} className="text-center">
                  <div className="text-[0.6rem] text-muted font-mono mb-1">{DAY_LABELS[di]}</div>
                  {session && session.type !== 'rest' ? (
                    <div
                      className="bg-surface2 rounded-lg p-2 border border-border/50"
                      style={{ borderLeftColor: SESSION_COLORS[session.type] || 'var(--border)', borderLeftWidth: '3px' }}
                    >
                      <div className="text-[0.65rem] font-medium" style={{ color: SESSION_COLORS[session.type] }}>
                        {SESSION_LABELS[session.type] || session.type}
                      </div>
                      <div className="font-display text-lg">{session.distanceKm}</div>
                      <div className="text-[0.6rem] text-muted">km</div>
                      {session.targetPaceMinKm && (
                        <div className="text-[0.55rem] text-muted font-mono mt-0.5">
                          @{session.targetPaceMinKm}/km
                        </div>
                      )}
                      {session.intervals && (
                        <div className="text-[0.55rem] text-accent font-mono mt-0.5">
                          {session.intervals}
                        </div>
                      )}
                      {session.completed && (
                        <div className="text-green text-xs mt-1">✓</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-surface2/50 rounded-lg p-2 h-16 flex items-center justify-center">
                      <span className="text-muted/30 text-xs">Riposo</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
