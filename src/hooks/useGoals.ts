'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Goal } from '@/types/goals';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'marathon_goals';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setGoals(JSON.parse(saved));
  }, []);

  const save = useCallback((updated: Goal[]) => {
    setGoals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

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
