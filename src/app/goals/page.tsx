'use client';

import { useState } from 'react';
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

  const getCurrentForGoal = (type: GoalType): number => {
    switch (type) {
      case 'weekly_km': return thisWeekKm;
      case 'long_run_target': return longestRun;
      case 'marathon_date': {
        const marathonGoal = goals.find(g => g.type === 'marathon_date');
        if (!marathonGoal?.marathonDate) return 0;
        return Math.max(0, Math.ceil((new Date(marathonGoal.marathonDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
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
