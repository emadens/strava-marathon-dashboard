export type SessionType = 'easy' | 'tempo' | 'interval' | 'long_run' | 'recovery' | 'rest' | 'cross_training';

export interface TrainingSession {
  dayOfWeek: string;
  type: SessionType;
  distanceKm: number;
  targetPaceMinKm: string | null;
  intervals: string | null;
  notes: string | null;
  completed: boolean;
  matchedActivityId?: number;
}

export interface TrainingWeek {
  weekNumber: number;
  sessions: TrainingSession[];
  weeklyTotalKm: number;
}

export interface TrainingPlan {
  id: string;
  name: string;
  weeks: TrainingWeek[];
  marathonDate?: string;
  createdAt: string;
  source: 'ocr' | 'manual';
}
