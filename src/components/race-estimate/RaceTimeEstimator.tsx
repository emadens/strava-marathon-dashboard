'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { calculateVDOT, predictRaceTime, trainingPaces, blendedVDOT, RACE_DISTANCES } from '@/lib/vdot';
import { fmtDuration, fmtPace } from '@/lib/utils';
import type { StravaBestEffort } from '@/types/strava';

interface RaceTimeEstimatorProps {
  bestEfforts: StravaBestEffort[];
}

export function RaceTimeEstimator({ bestEfforts }: RaceTimeEstimatorProps) {
  const [vo2Input, setVo2Input] = useState('');
  const [selectedEffort, setSelectedEffort] = useState<string>('auto');

  // Find the best effort to base VDOT on (prefer longer distances)
  const baseEffort = useMemo(() => {
    if (selectedEffort !== 'auto') {
      return bestEfforts.find(e => `${e.name}-${e.elapsed_time}` === selectedEffort) || null;
    }
    // Prefer longer distances for more accurate predictions
    const priority = ['marathon', 'half-marathon', '10k', '5k', '2 mile', '1 mile', '1k'];
    for (const name of priority) {
      const match = bestEfforts.find(e => e.name.toLowerCase().replace('-', ' ') === name.replace('-', ' '));
      if (match) return match;
    }
    return bestEfforts[0] || null;
  }, [bestEfforts, selectedEffort]);

  const vdot = useMemo(() => {
    if (!baseEffort) return null;
    const raw = calculateVDOT(baseEffort.distance, baseEffort.elapsed_time);
    const vo2 = vo2Input ? parseFloat(vo2Input) : null;
    return blendedVDOT(raw, vo2);
  }, [baseEffort, vo2Input]);

  const predictions = useMemo(() => {
    if (!vdot) return [];
    return RACE_DISTANCES.map(d => ({
      name: d.name,
      time: predictRaceTime(vdot, d.meters),
      pace: predictRaceTime(vdot, d.meters) / (d.meters / 1000),
    }));
  }, [vdot]);

  const paces = useMemo(() => {
    if (!vdot) return null;
    return trainingPaces(vdot);
  }, [vdot]);

  if (!bestEfforts.length) {
    return (
      <Card>
        <div className="font-display text-base tracking-wide mb-1">Stime tempi gara</div>
        <div className="text-sm text-muted py-8 text-center">
          Carica i dati di almeno un&apos;attivita dalla pagina Split & PR per ottenere le stime.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card hover={false}>
        <div className="font-display text-xl tracking-wide mb-4">Stime tempi gara</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted block mb-1">Performance base</label>
            <select
              value={selectedEffort}
              onChange={e => setSelectedEffort(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
            >
              <option value="auto">Automatico (migliore)</option>
              {bestEfforts.map(e => (
                <option key={`${e.name}-${e.elapsed_time}`} value={`${e.name}-${e.elapsed_time}`}>
                  {e.name} — {fmtDuration(e.elapsed_time)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">
              VO2 Max Apple Watch <span className="text-muted/50">(opzionale)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={vo2Input}
              onChange={e => setVo2Input(e.target.value)}
              placeholder="es. 48.5 ml/kg/min"
              className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
            />
            <p className="text-[0.6rem] text-muted mt-1">
              iPhone: Salute → Sfoglia → Cuore → Fitness cardio (VO2 max)
            </p>
          </div>

          <div className="flex items-center">
            {vdot && (
              <div>
                <div className="text-xs text-muted mb-1">Il tuo VDOT</div>
                <div className="font-display text-4xl text-accent">{vdot.toFixed(1)}</div>
              </div>
            )}
          </div>
        </div>

        {baseEffort && (
          <div className="text-xs text-muted font-mono">
            Basato su: {baseEffort.name} in {fmtDuration(baseEffort.elapsed_time)}
            {' '}({new Date(baseEffort.start_date).toLocaleDateString('it', { day: '2-digit', month: 'short', year: 'numeric' })})
            {vo2Input && ` + VO2 Max ${vo2Input} ml/kg/min`}
          </div>
        )}
      </Card>

      {/* Predictions */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {predictions.map(p => (
            <Card key={p.name}>
              <div className="text-[0.7rem] uppercase tracking-wider text-muted mb-2">{p.name}</div>
              <div className="font-display text-3xl leading-none tracking-wide">{fmtDuration(p.time)}</div>
              <div className="text-xs text-muted font-mono mt-2">{fmtPace(p.pace)}/km</div>
            </Card>
          ))}
        </div>
      )}

      {/* Training paces */}
      {paces && (
        <Card hover={false}>
          <div className="font-display text-base tracking-wide mb-4">Ritmi allenamento consigliati</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
            {Object.values(paces).map(p => (
              <div key={p.label} className="bg-surface2 rounded-lg p-3">
                <div className="text-xs text-muted mb-1">{p.label}</div>
                <div className="font-mono text-sm font-medium">
                  {fmtPace(p.min)} – {fmtPace(p.max)}
                </div>
                <div className="text-[0.6rem] text-muted">min/km</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
