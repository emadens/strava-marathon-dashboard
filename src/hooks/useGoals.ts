'use client';

import { useCallback } from 'react';
import type { Goal } from '@/types/goals';
import { generateId } from '@/lib/utils';
import { useSyncedStorage } from './useSyncedStorage';

export function useGoals() {
  const { data: goals, save } = useSyncedStorage<Goal[]>('marathon_goals', 'goals', []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    save([...goals, { ...goal, id: generateId(), createdAt: new Date().toISOString() }]);
  }, [goals, save]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    save(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [goals, save]);

  const removeGoal = useCallback((id: string) => {
    save(goals.filter(g => g.id !== id));
  }, [goals, save]);

  return { goals, addGoal, updateGoal, removeGoal };
}
