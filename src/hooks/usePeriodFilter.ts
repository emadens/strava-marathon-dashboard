import { useMemo } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { StravaActivity } from '@/types/strava';

export function usePeriodFilter(activities: StravaActivity[]) {
  const { period, customStart, customEnd } = useDashboardStore();

  const filtered = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      return activities.filter(a => {
        const d = new Date(a.start_date);
        return d >= customStart && d <= customEnd;
      });
    }

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return activities;
    }

    return activities.filter(a => new Date(a.start_date) >= startDate);
  }, [activities, period, customStart, customEnd]);

  const previous = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      const duration = customEnd.getTime() - customStart.getTime();
      endDate = new Date(customStart);
      startDate = new Date(endDate.getTime() - duration);
    } else {
      switch (period) {
        case 'week':
          endDate = new Date(now);
          endDate.setDate(now.getDate() - 7);
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 14);
          break;
        case 'month':
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case '3months':
          endDate = new Date(now);
          endDate.setMonth(now.getMonth() - 3);
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          endDate = new Date(now.getFullYear(), 0, 1);
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
        default:
          return [];
      }
    }

    return activities.filter(a => {
      const d = new Date(a.start_date);
      return d >= startDate && d < endDate;
    });
  }, [activities, period, customStart, customEnd]);

  return { filtered, previous };
}
