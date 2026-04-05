'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { fmtDateShort } from '@/lib/utils';

const MONTH_NAMES = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const SAVED_RANGES_KEY = 'saved_date_ranges';

interface SavedRange {
  id: string;
  name: string;
  start: string; // ISO date
  end: string;
}

export function DateRangePicker() {
  const { period, customStart, customEnd, setCustomRange, setPeriod } = useDashboardStore();
  const [open, setOpen] = useState(false);
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showSavedList, setShowSavedList] = useState(false);

  // Load saved ranges
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_RANGES_KEY);
    if (saved) setSavedRanges(JSON.parse(saved));
  }, []);

  const saveRange = () => {
    if (!rangeStart || !rangeEnd || !saveName.trim()) return;
    const newRange: SavedRange = {
      id: Math.random().toString(36).slice(2),
      name: saveName.trim(),
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    };
    const updated = [...savedRanges, newRange];
    setSavedRanges(updated);
    localStorage.setItem(SAVED_RANGES_KEY, JSON.stringify(updated));
    setSaveName('');
    setShowSaveInput(false);
  };

  const deleteSavedRange = (id: string) => {
    const updated = savedRanges.filter(r => r.id !== id);
    setSavedRanges(updated);
    localStorage.setItem(SAVED_RANGES_KEY, JSON.stringify(updated));
  };

  const applySavedRange = (r: SavedRange) => {
    const start = new Date(r.start);
    const end = new Date(r.end);
    setRangeStart(start);
    setRangeEnd(end);
    setCustomRange(start, end);
    setOpen(false);
    setShowSavedList(false);
  };
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    if (period !== 'custom') {
      setRangeStart(null);
      setRangeEnd(null);
      setSelecting(false);
    } else {
      setRangeStart(customStart);
      setRangeEnd(customEnd);
    }
    setViewYear(customStart ? customStart.getFullYear() : new Date().getFullYear());
    setViewMonth(customStart ? customStart.getMonth() : new Date().getMonth());
    setOpen(true);
  }, [open, period, customStart, customEnd]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        open &&
        popupRef.current &&
        btnRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const navMonth = (dir: number) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleDayClick = (date: Date) => {
    if (!selecting) {
      setRangeStart(date);
      setRangeEnd(null);
      setSelecting(true);
    } else {
      if (date < rangeStart!) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
      }
      setSelecting(false);
    }
  };

  const apply = () => {
    if (rangeStart && rangeEnd) {
      setCustomRange(rangeStart, rangeEnd);
      setOpen(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const label = period === 'custom' && customStart && customEnd
    ? `${fmtDateShort(customStart)} → ${fmtDateShort(customEnd)}`
    : '';

  const rangeDisplay = rangeStart && rangeEnd
    ? `${fmtDateShort(rangeStart)} → ${fmtDateShort(rangeEnd)}`
    : rangeStart
      ? `${fmtDateShort(rangeStart)} → seleziona fine`
      : 'Seleziona data inizio';

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`
          bg-surface border px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans font-medium transition-all
          ${period === 'custom'
            ? 'border-accent text-accent bg-accent/5'
            : 'border-border text-muted hover:border-accent hover:text-accent'
          }
        `}
      >
        Personalizzato
        {label && <span className="font-mono text-[0.65rem] text-accent ml-1.5">{label}</span>}
      </button>

      {open && (
        <div
          ref={popupRef}
          className="absolute top-[calc(100%+8px)] left-0 bg-surface border border-border rounded-xl p-5 z-[150] shadow-2xl animate-fade-up select-none"
        >
          {/* Saved ranges dropdown */}
          {savedRanges.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowSavedList(!showSavedList)}
                className="text-xs text-muted hover:text-accent cursor-pointer transition-colors flex items-center gap-1"
              >
                <span>{showSavedList ? '▾' : '▸'}</span>
                Preferiti ({savedRanges.length})
              </button>
              {showSavedList && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {savedRanges.map(r => (
                    <div key={r.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => applySavedRange(r)}
                        className="flex-1 text-left text-xs bg-surface2 hover:bg-accent/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted font-mono ml-2">
                          {fmtDateShort(new Date(r.start))} → {fmtDateShort(new Date(r.end))}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSavedRange(r.id)}
                        className="text-muted/30 hover:text-red text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                      >
                        &#215;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navMonth(-1)} className="w-8 h-8 border border-border rounded-lg flex items-center justify-center text-sm hover:border-accent hover:text-accent transition-all">
              &#8249;
            </button>
            <div className="font-display text-lg tracking-wide min-w-[160px] text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button onClick={() => navMonth(1)} className="w-8 h-8 border border-border rounded-lg flex items-center justify-center text-sm hover:border-accent hover:text-accent transition-all">
              &#8250;
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5" style={{ gridTemplateColumns: 'repeat(7, 36px)' }}>
            {DOW.map(d => (
              <div key={d} className="text-[0.6rem] text-muted text-center py-1 font-mono">{d}</div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`empty-${i}`} className="w-9 h-8" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const date = new Date(viewYear, viewMonth, d);
              date.setHours(0, 0, 0, 0);
              const isFuture = date > today;
              const isToday = date.getTime() === today.getTime();

              let dayClass = 'w-9 h-8 flex items-center justify-center text-xs rounded-md cursor-pointer transition-all font-mono';

              if (isFuture) {
                dayClass += ' opacity-25 pointer-events-none';
              } else {
                dayClass += ' hover:bg-accent/15';
              }

              if (isToday) dayClass += ' font-bold text-accent';

              if (rangeStart && rangeEnd) {
                const t = date.getTime();
                const s = rangeStart.getTime();
                const e = rangeEnd.getTime();
                if (t === s && t === e) dayClass += ' bg-accent text-white font-bold rounded-md';
                else if (t === s) dayClass += ' bg-accent text-white font-bold rounded-l-md rounded-r-none';
                else if (t === e) dayClass += ' bg-accent text-white font-bold rounded-r-md rounded-l-none';
                else if (t > s && t < e) dayClass += ' bg-accent/15 rounded-none';
              } else if (rangeStart && date.getTime() === rangeStart.getTime()) {
                dayClass += ' bg-accent text-white font-bold';
              }

              return (
                <div
                  key={d}
                  className={dayClass}
                  onClick={() => !isFuture && handleDayClick(date)}
                >
                  {d}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted font-mono">{rangeDisplay}</div>
              <div className="flex gap-2">
                {rangeStart && rangeEnd && !showSaveInput && (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="border border-border text-muted px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-accent hover:text-accent transition-all"
                    title="Salva questo range nei preferiti"
                  >
                    &#9734;
                  </button>
                )}
                <button
                  onClick={apply}
                  disabled={!rangeStart || !rangeEnd}
                  className="bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-accent2 disabled:opacity-35 disabled:pointer-events-none"
                >
                  Applica
                </button>
              </div>
            </div>
            {showSaveInput && (
              <div className="flex gap-2 animate-fade-up">
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Nome preferito (es. Prep. mese 1)"
                  className="flex-1 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text"
                  onKeyDown={e => e.key === 'Enter' && saveRange()}
                  autoFocus
                />
                <button
                  onClick={saveRange}
                  disabled={!saveName.trim()}
                  className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-accent2 disabled:opacity-35 transition-all"
                >
                  Salva
                </button>
                <button
                  onClick={() => { setShowSaveInput(false); setSaveName(''); }}
                  className="text-muted text-xs cursor-pointer hover:text-text transition-colors px-1"
                >
                  &#215;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
