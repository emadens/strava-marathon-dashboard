'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlanUpload } from '@/components/training-plan/PlanUpload';
import { PlanViewer } from '@/components/training-plan/PlanViewer';
import { PlanStats } from '@/components/training-plan/PlanStats';
import { Toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { useActivities } from '@/hooks/useActivities';
import { usePlanMatches } from '@/hooks/usePlanMatches';
import type { TrainingWeek, TrainingPlan } from '@/types/training-plan';
import { generateId } from '@/lib/utils';
import { parsePlanCSV } from '@/lib/plan-parser';

const STORAGE_KEY = 'marathon_training_plans';

// Pre-loaded Runna plan CSV
const PRELOADED_CSV = `Settimana,Date,Km Totali,Giorno,Tipologia Allenamento,Km
Week 1,22 Dic - 28 Dic,8.00,Sab,Progressive Long Run,8.0
Week 2,29 Dic - 4 Gen,19.00,Lun,Easy Run,5.0
,,,Mer,1km Repeats (Intervals),5.0
,,,Sab,Hilly Long Run (Rolling),9.0
Week 3,5 Gen - 11 Gen,21.00,Lun,Easy Run,6.0
,,,Mer,Tempo,5.0
,,,Sab,Long Run (Rolling),10.0
Week 4,12 Jan - 18 Jan,15.50,Lun,Easy Run,4.5
,,,Mer,Tempo,4.0
,,,Sab,Long Run,7.0
Week 5,19 Jan - 25 Jan,22.40,Lun,Easy Run,6.0
,,,Mer,Hills,5.4
,,,Sab,Long Run,11.0
Week 6,26 Jan - 1 Feb,25.00,Lun,Easy Run,7.0
,,,Mer,Tempo,6.0
,,,Sab,Long Run,12.0
Week 7,2 Feb - 8 Feb,26.50,Lun,Easy Run,6.0
,,,Mer,Tempo,7.5
,,,Sab,Long Run,13.0
Week 8,9 Feb - 15 Feb,18.50,Lun,Easy Run,5.0
,,,Mer,Time Trial,6.0
,,,Sab,Long Run,7.5
Week 9,16 Feb - 22 Feb,29.00,Lun,Easy Run,7.0
,,,Mer,Tempo,8.0
,,,Sab,Long Run,14.0
Week 10,23 Feb - 1 Mar,30.00,Lun,Easy Run,7.0
,,,Mer,Tempo,8.0
,,,Sab,Long Run (Rolling),15.0
Week 11,2 Mar - 8 Mar,31.50,Lun,Easy Run,5.5
,,,Mer,Intervals,9.0
,,,Sab,Long Run (Rolling),17.0
Week 12,9 Mar - 15 Mar,34.00,Lun,Easy Run,7.0
,,,Mer,Tempo,8.0
,,,Sab,Long Run,19.0
Week 13,16 Mar - 22 Mar,21.00,Lun,Easy Run,5.5
,,,Mer,Tempo,5.5
,,,Sab,Long Run,10.0
Week 14,23 Mar - 29 Mar,35.10,Lun,Easy Run,7.0
,,,Mer,Hills,7.0
,,,Sab,Long Run (Rolling),21.1
Week 15,30 Mar - 5 Apr,38.00,Lun,Easy Run,8.0
,,,Mer,Tempo,7.0
,,,Sab,Long Run,23.0
Week 16,6 Apr - 12 Apr,41.00,Lun,Easy Run,8.0
,,,Mer,Tempo,8.0
,,,Sab,Long Run,25.0
Week 17,13 Apr - 19 Apr,44.00,Lun,Easy Run,9.0
,,,Mer,Intervals,8.0
,,,Sab,Long Run,27.0
Week 18,20 Apr - 26 Apr,26.00,Lun,Easy Run,7.0
,,,Mer,Tempo,6.0
,,,Sab,Long Run,13.0
Week 19,27 Apr - 3 May,48.00,Lun,Easy Run,10.0
,,,Mer,Tempo,8.0
,,,Sab,Long Run,30.0
Week 20,4 Mag - 10 Mag,53.00,Lun,Easy Run,11.0
,,,Mer,Intervals,9.0
,,,Sab,Long Run (Rolling),33.0
Week 21,11 Mag - 17 Mag,38.60,Lun,Easy Run,10.0
,,,Mer,Tempo,7.5
,,,Sab,Long Run (Rolling),21.1
Week 22,18 Mag - 24 Mag,28.00,Lun,Easy Run,9.0
,,,Mer,Tempo,6.0
,,,Sab,Long Run (Rolling),13.0
Week 23,25 Mag - 31 Mag,48.70,Mer,Taper Intervals,6.5
,,,Sab,RACE (Maratona),42.2`;

export default function TrainingPlanPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const { activities } = useActivities();
  // Shared match resolution for stats
  const firstPlanWeeks = plans.length > 0 ? plans[0].weeks : [];
  const { getMatchResult, isSkipped: isSessionSkipped } = usePlanMatches(firstPlanWeeks, activities);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPlans(JSON.parse(saved));
    } else {
      // Auto-load the preloaded plan on first visit
      const weeks = parsePlanCSV(PRELOADED_CSV);
      if (weeks.length > 0) {
        const plan: TrainingPlan = {
          id: generateId(),
          name: 'Piano Maratona Runna — 23 settimane',
          weeks,
          marathonDate: '2026-05-30',
          createdAt: new Date().toISOString(),
          source: 'manual',
        };
        setPlans([plan]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([plan]));
      }
    }
  }, []);

  const savePlans = (updated: TrainingPlan[]) => {
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleExtracted = (data: unknown, type: 'plan' | 'session') => {
    if (type === 'plan') {
      const weeks: TrainingWeek[] = Array.isArray(data)
        ? data.map(w => ({ ...w, sessions: (w.sessions || []).map((s: Record<string, unknown>) => ({ ...s, completed: false })) }))
        : [{ ...data as TrainingWeek, sessions: ((data as TrainingWeek).sessions || []).map(s => ({ ...s, completed: false })) }];

      const plan: TrainingPlan = {
        id: generateId(),
        name: `Piano ${new Date().toLocaleDateString('it', { day: '2-digit', month: 'short' })}`,
        weeks,
        createdAt: new Date().toISOString(),
        source: 'ocr',
      };

      savePlans([plan, ...plans]);
    }
  };

  const handleUpdateMatch = (planId: string, weekIdx: number, sessionIdx: number, activityId: number | null) => {
    const updated = plans.map(p => {
      if (p.id !== planId) return p;
      const newWeeks = [...p.weeks];
      newWeeks[weekIdx] = { ...newWeeks[weekIdx], sessions: [...newWeeks[weekIdx].sessions] };
      newWeeks[weekIdx].sessions[sessionIdx] = {
        ...newWeeks[weekIdx].sessions[sessionIdx],
        completed: activityId !== null,
        matchedActivityId: activityId ?? undefined,
      };
      return { ...p, weeks: newWeeks };
    });
    savePlans(updated);
  };

  const removePlan = (id: string) => {
    savePlans(plans.filter(p => p.id !== id));
  };

  const [showUpload, setShowUpload] = useState(false);

  const handleExtractedAndClose = useCallback((data: unknown, type: 'plan' | 'session') => {
    handleExtracted(data, type);
    setShowUpload(false);
  }, [handleExtracted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-3xl tracking-wide">Piano di allenamento</h1>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                showUpload
                  ? 'bg-surface2 border border-accent text-accent'
                  : 'bg-accent text-white hover:bg-accent2'
              }`}
            >
              {showUpload ? '✕ Chiudi' : '+ Aggiungi piano'}
            </button>
          </div>

          {/* Upload dialog/modal */}
          {showUpload && (
            <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
              {/* Dialog */}
              <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-fade-up mx-4">
                <div className="sticky top-0 bg-surface border-b border-border/50 px-5 py-3 flex items-center justify-between rounded-t-2xl z-10">
                  <span className="font-display text-lg tracking-wide">Aggiungi piano</span>
                  <button
                    onClick={() => setShowUpload(false)}
                    className="text-muted hover:text-text text-lg cursor-pointer transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2"
                  >
                    &#215;
                  </button>
                </div>
                <div className="p-5">
                  <PlanUpload onExtracted={handleExtractedAndClose} />
                </div>
              </div>
            </div>
          )}

          {/* Plan stats dashboard */}
          {plans.length > 0 && activities.length > 0 && (
            <PlanStats
              weeks={firstPlanWeeks}
              activities={activities}
              getMatchResult={getMatchResult}
              isSkipped={isSessionSkipped}
            />
          )}

          {/* Saved plans */}
          {plans.length > 0 ? (
            <div className="space-y-8">
              {plans.map(plan => {
                const totalKm = plan.weeks.reduce((s, w) => s + w.weeklyTotalKm, 0);
                const totalSessions = plan.weeks.reduce((s, w) => s + w.sessions.filter(se => se.type !== 'rest').length, 0);
                const completedSessions = plan.weeks.reduce((s, w) => s + w.sessions.filter(se => se.completed).length, 0);

                return (
                  <div key={plan.id}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-display text-xl tracking-wide">{plan.name}</h2>
                        <div className="text-xs text-muted font-mono">
                          {plan.weeks.length} settimane · {totalKm.toFixed(0)} km totali · {completedSessions}/{totalSessions} sessioni completate
                        </div>
                      </div>
                      <button
                        onClick={() => removePlan(plan.id)}
                        className="text-muted hover:text-red text-xs transition-colors cursor-pointer px-3 py-1 border border-border rounded-lg hover:border-red"
                      >
                        Elimina
                      </button>
                    </div>
                    <PlanViewer
                      weeks={plan.weeks}
                      activities={activities}
                      onUpdateMatch={(wi, si, actId) => handleUpdateMatch(plan.id, wi, si, actId)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Card hover={false}>
              <div className="text-center py-12 text-muted">
                <div className="text-4xl mb-4">&#9636;</div>
                <p>Nessun piano salvato</p>
                <p className="text-sm mt-1">Carica il tuo piano Runna per iniziare</p>
              </div>
            </Card>
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}
