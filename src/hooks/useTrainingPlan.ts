'use client';

import { create } from 'zustand';
import type { TrainingPlan } from '@/types/training-plan';

const PLAN_STORAGE_KEY = 'marathon_training_plans';
const MANUAL_MATCHES_KEY = 'plan_manual_matches';
const SKIPPED_KEY = 'plan_skipped_sessions';

function syncToKV(type: string, data: unknown) {
  fetch('/api/user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {});
}

interface TrainingPlanState {
  plans: TrainingPlan[];
  currentPlan: TrainingPlan | null;
  initialized: boolean;
  load: () => void;
  savePlans: (plans: TrainingPlan[]) => void;
  removePlan: (id: string) => void;
}

export const useTrainingPlanStore = create<TrainingPlanState>((set, get) => ({
  plans: [],
  currentPlan: null,
  initialized: false,

  load: () => {
    if (get().initialized) return;
    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (saved) {
      const plans: TrainingPlan[] = JSON.parse(saved);
      set({ plans, currentPlan: plans[0] || null, initialized: true });
    } else {
      set({ plans: [], currentPlan: null, initialized: true });
      // Try loading from KV (new device)
      fetch('/api/user-data?type=plans')
        .then(r => r.ok ? r.json() : null)
        .then(result => {
          if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
            localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(result.data));
            set({ plans: result.data, currentPlan: result.data[0] });
          }
        })
        .catch(() => {});
    }
  },

  savePlans: (plans: TrainingPlan[]) => {
    const oldPlan = get().currentPlan;
    const newPlan = plans[0] || null;

    if (oldPlan?.id !== newPlan?.id) {
      localStorage.removeItem(MANUAL_MATCHES_KEY);
      localStorage.removeItem(SKIPPED_KEY);
      syncToKV('manual_matches', null);
      syncToKV('skipped_sessions', null);
    }

    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    syncToKV('plans', plans);
    set({ plans, currentPlan: newPlan });
  },

  removePlan: (id: string) => {
    const plans = get().plans.filter(p => p.id !== id);
    if (get().currentPlan?.id === id) {
      localStorage.removeItem(MANUAL_MATCHES_KEY);
      localStorage.removeItem(SKIPPED_KEY);
      syncToKV('manual_matches', null);
      syncToKV('skipped_sessions', null);
    }
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    syncToKV('plans', plans);
    set({ plans, currentPlan: plans[0] || null });
  },
}));

export function useTrainingPlan() {
  const store = useTrainingPlanStore();
  if (!store.initialized && typeof window !== 'undefined') {
    store.load();
  }
  return store;
}
