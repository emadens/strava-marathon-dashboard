export type GoalType = 'weekly_km' | 'marathon_date' | 'pace_target' | 'long_run_target';

export interface Goal {
  id: string;
  type: GoalType;
  label: string;
  target: number;           // km, seconds/km, or km for long run
  marathonDate?: string;    // ISO date string
  createdAt: string;
}
