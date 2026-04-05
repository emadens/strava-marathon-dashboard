'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { GoalCard } from '@/components/goals/GoalCard';
import { MarathonCountdown } from '@/components/goals/MarathonCountdown';
import { Toast } from '@/components/ui/Toast';
import { useGoals } from '@/hooks/useGoals';
import { useActivities } from '@/hooks/useActivities';
import type { GoalType } from '@/types/goals';

export default function GoalsPage() {
  const { goals, addGoal, removeGoal } = useGoals();
  const { activities } = useActivities();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<GoalType>('weekly_km');
  const [paceMethod, setPaceMethod] = useState<'tempo_only' | 'weighted' | 'best_recent'>('weighted');
  const [formTarget, setFormTarget] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLabel, setFormLabel] = useState('');

  // Calculate current values for goals
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekKm = activities
    .filter(a => new Date(a.start_date) >= weekStart)
    .reduce((s, a) => s + a.distance / 1000, 0);

  const totalKm = activities.reduce((s, a) => s + a.distance / 1000, 0);

  const longestRun = Math.max(0, ...activities.map(a => a.distance / 1000));

  // === 3 PACE CALCULATION METHODS ===
  const paceCalcs = useMemo(() => {
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const recentActs = activities
      .filter(a => a.average_speed > 0 && new Date(a.start_date) >= sixWeeksAgo)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    const toPaceMinKm = (a: typeof activities[0]) => 1000 / a.average_speed / 60;

    // 1. TEMPO ONLY: activities with pace < 5:40/km (faster runs = likely tempo/interval)
    const tempoThreshold = 5.67; // 5:40 min/km
    const tempoActs = recentActs.filter(a => toPaceMinKm(a) < tempoThreshold && a.distance >= 5000);
    const tempoOnly = tempoActs.length
      ? tempoActs.reduce((s, a) => s + toPaceMinKm(a), 0) / tempoActs.length
      : 0;

    // 2. WEIGHTED: peso maggiore a corse veloci, minore a easy/recovery
    // Fast (<5:20) = weight 3, Medium (5:20-5:50) = weight 2, Slow (>5:50) = weight 1
    let weightedSum = 0, weightTotal = 0;
    recentActs.filter(a => a.distance >= 3000).forEach(a => {
      const pace = toPaceMinKm(a);
      const weight = pace < 5.33 ? 3 : pace < 5.83 ? 2 : 1;
      weightedSum += pace * weight;
      weightTotal += weight;
    });
    const weighted = weightTotal > 0 ? weightedSum / weightTotal : 0;

    // 3. BEST RECENT: miglior ritmo medio su distanze >5km nelle ultime 6 settimane
    const longEnough = recentActs.filter(a => a.distance >= 5000);
    const bestRecent = longEnough.length
      ? Math.min(...longEnough.map(a => toPaceMinKm(a)))
      : 0;

    return {
      tempo_only: { value: tempoOnly, count: tempoActs.length, label: 'Solo tempo run', desc: `Media delle ${tempoActs.length} corse con ritmo <5:40/km e distanza >5km (ultime 6 sett)` },
      weighted: { value: weighted, count: recentActs.filter(a => a.distance >= 3000).length, label: 'Media pesata', desc: `Media pesata: corse veloci (<5:20) peso 3x, medie (5:20-5:50) peso 2x, lente (>5:50) peso 1x (ultime 6 sett, >3km)` },
      best_recent: { value: bestRecent, count: longEnough.length, label: 'Miglior recente', desc: `Miglior ritmo medio su una singola corsa >5km nelle ultime 6 settimane (su ${longEnough.length} corse)` },
    };
  }, [activities]);

  const avgPaceMinKm = paceCalcs[paceMethod].value;

  // Compute weekly averages from last 8 weeks for trend analysis
  const weeklyStats = useMemo(() => {
    const weeks: Record<string, { km: number; longestRun: number; count: number }> = {};
    activities.forEach(a => {
      const d = new Date(a.start_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { km: 0, longestRun: 0, count: 0 };
      weeks[key].km += a.distance / 1000;
      weeks[key].longestRun = Math.max(weeks[key].longestRun, a.distance / 1000);
      weeks[key].count++;
    });
    const sorted = Object.entries(weeks).sort((a, b) => b[0].localeCompare(a[0]));
    const last8 = sorted.slice(0, 8);
    const avgKmPerWeek = last8.length ? last8.reduce((s, [, w]) => s + w.km, 0) / last8.length : 0;
    const avgLongRun = last8.length ? last8.reduce((s, [, w]) => s + w.longestRun, 0) / last8.length : 0;
    const avgRunsPerWeek = last8.length ? last8.reduce((s, [, w]) => s + w.count, 0) / last8.length : 0;
    return { avgKmPerWeek, avgLongRun, avgRunsPerWeek, weekCount: last8.length };
  }, [activities]);

  const getTrendForGoal = (type: GoalType, target: number) => {
    const current = getCurrentForGoal(type);
    const remaining = Math.max(0, target - current);

    switch (type) {
      case 'weekly_km': {
        return {
          weeklyAvg: weeklyStats.avgKmPerWeek,
          weeksToTarget: weeklyStats.avgKmPerWeek > 0 ? remaining / weeklyStats.avgKmPerWeek : null,
          projectedDate: null,
        };
      }
      case 'long_run_target': {
        // Estimate: longest run increases ~1-2km/week on average
        const weeklyIncrease = weeklyStats.avgLongRun > 0 ? 1.5 : 0;
        const weeksNeeded = weeklyIncrease > 0 ? remaining / weeklyIncrease : null;
        const projDate = weeksNeeded ? new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000) : null;
        return {
          weeklyAvg: weeklyStats.avgLongRun,
          weeksToTarget: weeksNeeded,
          projectedDate: projDate ? projDate.toLocaleDateString('it', { day: '2-digit', month: 'short' }) : null,
        };
      }
      case 'pace_target': {
        const diff = current - target;
        return {
          weeklyAvg: avgPaceMinKm,
          weeksToTarget: diff > 0 ? null : 0,
          projectedDate: diff <= 0 ? 'Raggiunto!' : null,
          methodDesc: paceCalcs[paceMethod].desc,
        };
      }
      default:
        return { weeklyAvg: 0, weeksToTarget: null, projectedDate: null };
    }
  };

  const getCurrentForGoal = (type: GoalType): number => {
    switch (type) {
      case 'weekly_km': return thisWeekKm;
      case 'long_run_target': return longestRun;
      case 'marathon_date': {
        const marathonGoal = goals.find(g => g.type === 'marathon_date');
        if (!marathonGoal?.marathonDate) return 0;
        return Math.max(0, Math.ceil((new Date(marathonGoal.marathonDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
      case 'pace_target': return avgPaceMinKm;
      default: return 0;
    }
  };

  const handleAdd = () => {
    if (!formTarget && formType !== 'marathon_date') return;
    addGoal({
      type: formType,
      label: formLabel || formType,
      target: parseFloat(formTarget) || 0,
      marathonDate: formType === 'marathon_date' ? formDate : undefined,
    });
    setShowForm(false);
    setFormTarget('');
    setFormDate('');
    setFormLabel('');
  };

  const marathonGoal = goals.find(g => g.type === 'marathon_date');

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-3xl tracking-wide">Obiettivi</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-accent2"
            >
              + Nuovo obiettivo
            </button>
          </div>

          {/* Add goal form */}
          {showForm && (
            <div className="bg-surface border border-border rounded-xl p-5 mb-6 animate-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as GoalType)}
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                  >
                    <option value="weekly_km">Km settimanali</option>
                    <option value="long_run_target">Long run target</option>
                    <option value="pace_target">Ritmo target</option>
                    <option value="marathon_date">Data maratona</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Etichetta</label>
                  <input
                    value={formLabel}
                    onChange={e => setFormLabel(e.target.value)}
                    placeholder="es. Obiettivo settimana"
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                  />
                </div>
                {formType === 'marathon_date' ? (
                  <div>
                    <label className="text-xs text-muted block mb-1">Data</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-muted block mb-1">Target</label>
                    <input
                      type="number"
                      value={formTarget}
                      onChange={e => setFormTarget(e.target.value)}
                      placeholder={formType === 'pace_target' ? 'min/km (es. 5.5)' : 'km'}
                      className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <button
                    onClick={handleAdd}
                    className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-accent2 w-full"
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Marathon countdown */}
          {marathonGoal?.marathonDate && (
            <div className="mb-6">
              <MarathonCountdown marathonDate={marathonGoal.marathonDate} totalKmToDate={totalKm} />
            </div>
          )}

          {/* Pace calculation method selector */}
          {goals.some(g => g.type === 'pace_target') && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-6">
              <div className="text-xs text-muted uppercase tracking-wider mb-3">Metodo calcolo ritmo</div>
              <div className="flex gap-2 flex-wrap mb-3">
                {(['tempo_only', 'weighted', 'best_recent'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaceMethod(method)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                      paceMethod === method ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent/50'
                    }`}
                  >
                    <div>{paceCalcs[method].label}</div>
                    <div className="font-mono mt-0.5">
                      {paceCalcs[method].value > 0
                        ? `${Math.floor(paceCalcs[method].value)}:${String(Math.round((paceCalcs[method].value % 1) * 60)).padStart(2, '0')}/km`
                        : 'n/a'
                      }
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-[0.65rem] text-muted/70">{paceCalcs[paceMethod].desc}</div>
            </div>
          )}

          {/* Goal cards grid */}
          {goals.filter(g => g.type !== 'marathon_date').length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {goals
                .filter(g => g.type !== 'marathon_date')
                .map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    current={getCurrentForGoal(g.type)}
                    trend={getTrendForGoal(g.type, g.target)}
                    onRemove={removeGoal}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <div className="text-4xl mb-4">◎</div>
              <p>Nessun obiettivo impostato</p>
              <p className="text-sm mt-1">Aggiungi un obiettivo per monitorare i tuoi progressi</p>
            </div>
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}
