'use client';

import { useMemo } from 'react';
import { fmtPace, fmtTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

export function ActivityList({ activities }: { activities: StravaActivity[] }) {
  const recent = useMemo(() =>
    [...activities]
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 15),
    [activities]
  );

  return (
    <Card className="col-span-4 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Attivita recenti</div>
      <div className="text-[0.72rem] text-muted mb-5">ultime uscite</div>
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
        {recent.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">Nessuna attivita nel periodo</div>
        ) : (
          recent.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface2 rounded-lg border border-border hover:border-accent transition-colors">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: a.distance >= 15000 ? 'var(--accent)' : a.distance >= 10000 ? 'var(--accent2)' : 'var(--blue)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[0.82rem] font-medium truncate">{a.name}</div>
                <div className="text-[0.7rem] text-muted font-mono mt-0.5">
                  {new Date(a.start_date).toLocaleDateString('it', { weekday: 'short', day: '2-digit', month: 'short' })}
                  {' · '}{fmtPace(1000 / a.average_speed)}/km
                  {' · '}{fmtTime(a.moving_time)}
                </div>
              </div>
              <div className="font-display text-lg text-accent shrink-0">
                {(a.distance / 1000).toFixed(1)}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
