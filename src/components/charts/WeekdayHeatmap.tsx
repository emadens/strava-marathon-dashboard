'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import type { StravaActivity } from '@/types/strava';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function WeekdayHeatmap({ activities }: { activities: StravaActivity[] }) {
  const data = useMemo(() => {
    const byDow = Array.from({ length: 7 }, (_, i) => ({ dow: i, km: 0, count: 0 }));
    activities.forEach(a => {
      const d = new Date(a.start_date).getDay();
      const dow = (d + 6) % 7; // Mon=0
      byDow[dow].km += a.distance / 1000;
      byDow[dow].count++;
    });
    const maxKm = Math.max(...byDow.map(d => d.km), 1);
    return byDow.map(d => ({
      ...d,
      intensity: d.km / maxKm,
    }));
  }, [activities]);

  return (
    <Card className="col-span-12">
      <div className="font-display text-base tracking-wide mb-0.5">Mappa attivita</div>
      <div className="text-[0.72rem] text-muted mb-5">distribuzione per giorno della settimana (km)</div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[0.6rem] text-muted text-center font-mono">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {data.map(d => (
          <div
            key={d.dow}
            className="aspect-square rounded cursor-default transition-all"
            style={{ background: `rgba(255,77,0,${0.1 + d.intensity * 0.85})` }}
            title={`${DAY_LABELS[d.dow]}: ${d.km.toFixed(1)}km (${d.count} uscite)`}
          />
        ))}
      </div>
      <ChartExplainer>
        <strong>Mappa attivita</strong>: distribuzione dei km per giorno della settimana.
        <br />Colore piu intenso = piu km corsi in quel giorno (nell&apos;intero periodo selezionato).
        <br />Passa il mouse su un giorno per vedere km totali e numero di uscite.
        <br />Utile per capire la distribuzione del carico nella settimana e identificare i giorni di riposo.
      </ChartExplainer>
    </Card>
  );
}
