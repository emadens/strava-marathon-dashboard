'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlanUpload } from '@/components/training-plan/PlanUpload';
import { PlanViewer } from '@/components/training-plan/PlanViewer';
import { Toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import type { TrainingWeek, TrainingPlan } from '@/types/training-plan';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'marathon_training_plans';

export default function TrainingPlanPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPlans(JSON.parse(saved));
  }, []);

  const savePlans = (updated: TrainingPlan[]) => {
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleExtracted = (data: unknown, type: 'plan' | 'session') => {
    if (type === 'plan') {
      // Data could be a single week or array of weeks
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
    } else {
      // Session detail — show as JSON for now, can be improved
      // Could match to a specific day in the plan
      console.log('Session detail extracted:', data);
    }
  };

  const removePlan = (id: string) => {
    savePlans(plans.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen relative z-[1]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-[1400px] mx-auto">
          <h1 className="font-display text-3xl tracking-wide mb-6">Piano di allenamento</h1>

          {/* Upload section */}
          <div className="mb-8">
            <PlanUpload onExtracted={handleExtracted} />
          </div>

          {/* Saved plans */}
          {plans.length > 0 ? (
            <div className="space-y-8">
              {plans.map(plan => (
                <div key={plan.id}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-xl tracking-wide">{plan.name}</h2>
                      <div className="text-xs text-muted font-mono">
                        {new Date(plan.createdAt).toLocaleDateString('it', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {' · '}{plan.weeks.length} settimane
                        {' · '}via {plan.source === 'ocr' ? 'OCR Runna' : 'inserimento manuale'}
                      </div>
                    </div>
                    <button
                      onClick={() => removePlan(plan.id)}
                      className="text-muted hover:text-red text-xs transition-colors cursor-pointer px-3 py-1 border border-border rounded-lg hover:border-red"
                    >
                      Elimina
                    </button>
                  </div>
                  <PlanViewer weeks={plan.weeks} />
                </div>
              ))}
            </div>
          ) : (
            <Card hover={false}>
              <div className="text-center py-12 text-muted">
                <div className="text-4xl mb-4">▤</div>
                <p>Nessun piano salvato</p>
                <p className="text-sm mt-1">Carica uno screenshot dal tuo piano Runna per iniziare</p>
              </div>
            </Card>
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}
