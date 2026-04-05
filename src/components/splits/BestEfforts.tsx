'use client';

import { Card } from '@/components/ui/Card';
import { fmtDuration } from '@/lib/utils';
import type { StravaBestEffort } from '@/types/strava';

interface BestEffortsProps {
  efforts: StravaBestEffort[];
}

const DISTANCES = [
  { name: '1k', label: '1 km', meters: 1000 },
  { name: '1 mile', label: '1 miglio', meters: 1609 },
  { name: '5k', label: '5 km', meters: 5000 },
  { name: '10k', label: '10 km', meters: 10000 },
  { name: 'Half-Marathon', label: 'Mezza', meters: 21097 },
  { name: 'Marathon', label: 'Maratona', meters: 42195 },
];

export function BestEfforts({ efforts }: BestEffortsProps) {
  // Group efforts by distance and find best
  const bestByDistance = DISTANCES.map(dist => {
    const matching = efforts.filter(e =>
      e.name.toLowerCase() === dist.name.toLowerCase() ||
      e.name.toLowerCase().replace('-', ' ') === dist.name.toLowerCase().replace('-', ' ')
    );

    if (!matching.length) return { ...dist, best: null };

    const best = matching.reduce((a, b) => a.elapsed_time < b.elapsed_time ? a : b);
    return { ...dist, best };
  });

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      {bestByDistance.map(d => (
        <Card key={d.name}>
          <div className="text-[0.7rem] uppercase tracking-wider text-muted mb-2">{d.label}</div>
          {d.best ? (
            <>
              <div className="font-display text-3xl leading-none tracking-wide">
                {fmtDuration(d.best.elapsed_time)}
              </div>
              <div className="text-[0.65rem] text-muted font-mono mt-2">
                {new Date(d.best.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </>
          ) : (
            <div className="font-display text-3xl leading-none tracking-wide text-muted/30">—</div>
          )}
        </Card>
      ))}
    </div>
  );
}
