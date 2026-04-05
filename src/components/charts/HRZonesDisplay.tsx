'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import type { StravaActivity } from '@/types/strava';

const ZONES = [
  { label: 'Z1', name: 'Recupero', range: [0, 120] as const, color: '#4da6ff' },
  { label: 'Z2', name: 'Aerobico', range: [120, 140] as const, color: '#39d353' },
  { label: 'Z3', name: 'Soglia', range: [140, 160] as const, color: '#ffd166' },
  { label: 'Z4', name: 'Lattacido', range: [160, 175] as const, color: '#ff8c42' },
  { label: 'Z5', name: 'Massimale', range: [175, 999] as const, color: '#ff4d00' },
];

export function HRZonesDisplay({ activities }: { activities: StravaActivity[] }) {
  const zones = useMemo(() => {
    const hrActs = activities.filter(a => a.average_heartrate);
    const counts = ZONES.map(z =>
      hrActs.filter(a => (a.average_heartrate ?? 0) >= z.range[0] && (a.average_heartrate ?? 0) < z.range[1]).length
    );
    const total = counts.reduce((s, c) => s + c, 0) || 1;

    return ZONES.map((z, i) => ({
      ...z,
      count: counts[i],
      pct: (counts[i] / total * 100).toFixed(0),
      width: (counts[i] / total * 100).toFixed(1),
    }));
  }, [activities]);

  return (
    <Card className="col-span-4 max-lg:col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Zone HR</div>
      <div className="text-[0.72rem] text-muted mb-5">distribuzione frequenza cardiaca</div>
      <div className="flex flex-col gap-2.5">
        {zones.map(z => (
          <div key={z.label} className="flex items-center gap-3">
            <div className="text-xs text-muted w-10 shrink-0 font-mono">{z.label}</div>
            <div className="flex-1 bg-surface2 rounded h-1.5 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700 ease-out"
                style={{ width: `${z.width}%`, background: z.color }}
              />
            </div>
            <div className="text-xs font-mono w-9 text-right text-muted">{z.pct}%</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
