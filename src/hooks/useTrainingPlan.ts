'use client';

import { create } from 'zustand';
import type { TrainingPlan } from '@/types/training-plan';

const PLAN_STORAGE_KEY = 'marathon_training_plans';
const MANUAL_MATCHES_KEY = 'plan_manual_matches';
const SKIPPED_KEY = 'plan_skipped_sessions';

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
    }
  },

  savePlans: (plans: TrainingPlan[]) => {
    const oldPlan = get().currentPlan;
    const newPlan = plans[0] || null;

    // If the plan changed (different id or no old plan), clear stale match data
    if (oldPlan?.id !== newPlan?.id) {
      localStorage.removeItem(MANUAL_MATCHES_KEY);
      localStorage.removeItem(SKIPPED_KEY);
    }

    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    set({ plans, currentPlan: newPlan });
  },

  removePlan: (id: string) => {
    const plans = get().plans.filter(p => p.id !== id);
    // Clear match data for removed plan
    if (get().currentPlan?.id === id) {
      localStorage.removeItem(MANUAL_MATCHES_KEY);
      localStorage.removeItem(SKIPPED_KEY);
    }
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
    set({ plans, currentPlan: plans[0] || null });
  },
}));

// Convenience hook
export function useTrainingPlan() {
  const store = useTrainingPlanStore();

  // Auto-load on first use
  if (!store.initialized && typeof window !== 'undefined') {
    store.load();
  }

  return store;
}
