'use client';

import { fmtPace } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { StravaSplit } from '@/types/strava';

interface SplitTableProps {
  splits: StravaSplit[];
  activityName: string;
}

export function SplitTable({ splits, activityName }: SplitTableProps) {
  if (!splits.length) return null;

  const paces = splits.map(s => s.average_speed > 0 ? 1000 / s.average_speed : 0).filter(p => p > 0);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);

  return (
    <Card hover={false}>
      <div className="font-display text-base tracking-wide mb-1">{activityName}</div>
      <div className="text-[0.72rem] text-muted mb-4">split per chilometro</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[0.7rem] text-muted uppercase tracking-wider border-b border-border">
              <th className="pb-2 pr-3">Km</th>
              <th className="pb-2 pr-3">Ritmo</th>
              <th className="pb-2 pr-3">Disliv.</th>
              <th className="pb-2 pr-3">FC</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {splits.map((s, i) => {
              const pace = s.average_speed > 0 ? 1000 / s.average_speed : 0;
              const range = maxPace - minPace || 1;
              const normalized = pace > 0 ? Math.max(0, Math.min(1, (pace - minPace) / range)) : 0;
              // Fast = accent, slow = faded
              const barWidth = pace > 0 ? ((1 - normalized) * 60 + 40) : 0;

              return (
                <tr key={i} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                  <td className="py-2 pr-3 font-mono text-xs">{s.split}</td>
                  <td className="py-2 pr-3 font-mono text-xs font-medium">
                    {pace > 0 ? fmtPace(pace) : '—'}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">
                    {s.elevation_difference > 0 ? '+' : ''}{s.elevation_difference.toFixed(0)}m
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">
                    {s.average_heartrate ? `${Math.round(s.average_heartrate)} bpm` : '—'}
                  </td>
                  <td className="py-2 w-24">
                    <div className="h-1.5 bg-surface2 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${barWidth}%`,
                          background: `rgba(255, ${Math.round(77 + normalized * 100)}, ${Math.round(normalized * 60)}, ${0.9 - normalized * 0.4})`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
