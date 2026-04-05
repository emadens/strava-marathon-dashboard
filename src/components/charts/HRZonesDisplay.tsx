'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { ChartExplainer } from '@/components/ui/ChartExplainer';
import type { StravaActivity } from '@/types/strava';

const HR_ZONES_KEY = 'hr_zones_config';

interface ZoneConfig {
  label: string;
  name: string;
  min: number;
  max: number;
  color: string;
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { label: 'Z1', name: 'Recupero', min: 0, max: 120, color: '#4da6ff' },
  { label: 'Z2', name: 'Aerobico', min: 120, max: 140, color: '#39d353' },
  { label: 'Z3', name: 'Soglia', min: 140, max: 160, color: '#ffd166' },
  { label: 'Z4', name: 'Lattacido', min: 160, max: 175, color: '#ff8c42' },
  { label: 'Z5', name: 'Massimale', min: 175, max: 220, color: '#ff4d00' },
];

export function HRZonesDisplay({ activities }: { activities: StravaActivity[] }) {
  const [zoneConfig, setZoneConfig] = useState<ZoneConfig[]>(DEFAULT_ZONES);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<ZoneConfig[]>(DEFAULT_ZONES);
  const [isCustom, setIsCustom] = useState(false);

  // Load saved zones
  useEffect(() => {
    const saved = localStorage.getItem(HR_ZONES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ZoneConfig[];
      setZoneConfig(parsed);
      setEditValues(parsed);
      setIsCustom(true);
    }
  }, []);

  const saveZones = () => {
    // Auto-chain: each zone's min = previous zone's max
    const chained = editValues.map((z, i) => ({
      ...z,
      min: i === 0 ? 0 : editValues[i - 1].max,
    }));
    // Last zone max = 220
    chained[chained.length - 1].max = 220;

    setZoneConfig(chained);
    setEditValues(chained);
    localStorage.setItem(HR_ZONES_KEY, JSON.stringify(chained));
    setIsCustom(true);
    setEditing(false);
  };

  const resetToDefault = () => {
    setZoneConfig(DEFAULT_ZONES);
    setEditValues(DEFAULT_ZONES);
    localStorage.removeItem(HR_ZONES_KEY);
    setIsCustom(false);
    setEditing(false);
  };

  const zones = useMemo(() => {
    const hrActs = activities.filter(a => a.average_heartrate);
    const counts = zoneConfig.map(z =>
      hrActs.filter(a => (a.average_heartrate ?? 0) >= z.min && (a.average_heartrate ?? 0) < z.max).length
    );
    const total = counts.reduce((s, c) => s + c, 0) || 1;

    return zoneConfig.map((z, i) => ({
      ...z,
      count: counts[i],
      pct: (counts[i] / total * 100).toFixed(0),
      width: (counts[i] / total * 100).toFixed(1),
    }));
  }, [activities, zoneConfig]);

  return (
    <Card className="col-span-4 max-lg:col-span-12">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-display text-base tracking-wide">Zone HR</div>
        <button
          onClick={() => { setEditing(!editing); setEditValues(zoneConfig); }}
          className="text-[0.65rem] text-muted/50 hover:text-muted cursor-pointer transition-colors"
        >
          {editing ? 'Annulla' : '&#9998; Modifica zone'}
        </button>
      </div>
      <div className="text-[0.72rem] text-muted mb-4">
        {isCustom ? 'zone personalizzate (Apple Watch)' : 'zone default — clicca modifica per personalizzare'}
      </div>

      {editing ? (
        /* === EDIT MODE === */
        <div className="space-y-2.5">
          {editValues.map((z, i) => (
            <div key={z.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: z.color }} />
              <span className="text-xs font-mono w-7 text-muted">{z.label}</span>
              <input
                value={z.name}
                onChange={e => {
                  const updated = [...editValues];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setEditValues(updated);
                }}
                className="flex-1 bg-surface2 border border-border rounded px-2 py-1 text-xs text-text"
              />
              <input
                type="number"
                value={z.max}
                onChange={e => {
                  const updated = [...editValues];
                  updated[i] = { ...updated[i], max: parseInt(e.target.value) || 0 };
                  // Chain: next zone's min = this zone's max
                  if (i < updated.length - 1) {
                    updated[i + 1] = { ...updated[i + 1], min: parseInt(e.target.value) || 0 };
                  }
                  setEditValues(updated);
                }}
                className="w-16 bg-surface2 border border-border rounded px-2 py-1 text-xs text-text text-center font-mono"
                placeholder="max"
              />
              <span className="text-[0.6rem] text-muted font-mono">bpm</span>
            </div>
          ))}
          <div className="text-[0.6rem] text-muted mt-1">
            Inserisci il limite superiore di ogni zona. I limiti si concatenano automaticamente.
            <br />iPhone: Salute → Sfoglia → Cuore → Zone cardio
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveZones}
              className="bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-accent2 transition-all"
            >
              Salva zone
            </button>
            {isCustom && (
              <button
                onClick={resetToDefault}
                className="border border-border text-muted px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-accent transition-all"
              >
                Ripristina default
              </button>
            )}
          </div>
        </div>
      ) : (
        /* === DISPLAY MODE === */
        <div className="flex flex-col gap-2.5">
          {zones.map(z => (
            <div key={z.label} className="flex items-center gap-2">
              <div className="text-xs text-muted w-7 shrink-0 font-mono">{z.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[0.65rem] font-medium" style={{ color: z.color }}>{z.name}</span>
                  <span className="text-[0.55rem] text-muted font-mono">{z.min}–{z.max === 220 ? '∞' : z.max} bpm</span>
                </div>
                <div className="bg-surface2 rounded h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700 ease-out"
                    style={{ width: `${z.width}%`, background: z.color }}
                  />
                </div>
              </div>
              <div className="text-xs font-mono w-12 text-right text-muted">
                {z.pct}%
                <div className="text-[0.55rem]">{z.count}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!editing && (
        <ChartExplainer>
          <strong>Zone HR</strong>: distribuzione delle attivita per zona di frequenza cardiaca media.
          <br />Ogni attivita viene assegnata alla zona corrispondente alla sua FC media.
          <br />Le zone {isCustom ? 'sono personalizzate (dai tuoi dati Apple Watch)' : 'usano valori standard — clicca "Modifica zone" per inserire i tuoi range da Apple Watch'}.
          <br />Un buon mix per preparazione maratona: ~70% Z2 (aerobico), ~20% Z3 (soglia), ~10% Z4-Z5 (alta intensita).
        </ChartExplainer>
      )}
    </Card>
  );
}
