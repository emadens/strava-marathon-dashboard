'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TrainingWeek } from '@/types/training-plan';
import type { StravaActivity } from '@/types/strava';

const MANUAL_MATCHES_KEY = 'plan_manual_matches';
const SKIPPED_KEY = 'plan_skipped_sessions';

const MONTHS: Record<string, number> = {
  'gen': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'may': 4,
  'giu': 5, 'jun': 5, 'lug': 6, 'jul': 6, 'ago': 7, 'aug': 7,
  'set': 8, 'sep': 8, 'ott': 9, 'oct': 9, 'nov': 10, 'dic': 11, 'dec': 11,
};

const DAY_ORDER = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

function parseWeekStart(dateRange: string): Date | null {
  const parts = dateRange.split('-');
  if (!parts.length) return null;
  const match = parts[0].trim().match(/(\d+)\s+(\w+)/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthKey = match[2].toLowerCase().slice(0, 3);
  const month = MONTHS[monthKey];
  if (month === undefined) return null;
  const year = month >= 11 ? 2025 : 2026;
  return new Date(year, month, day);
}

function autoMatch(
  session: TrainingWeek['sessions'][0],
  weekDateRange: string | undefined,
  activities: StravaActivity[]
): StravaActivity | null {
  if (!activities.length || !weekDateRange) return null;
  const start = parseWeekStart(weekDateRange);
  if (!start) return null;
  const dayIdx = DAY_ORDER.indexOf(session.dayOfWeek);
  if (dayIdx < 0) return null;
  const planned = new Date(start);
  planned.setDate(start.getDate() + dayIdx);

  const toleranceMs = 2 * 24 * 60 * 60 * 1000;
  const candidates = activities.filter(a =>
    Math.abs(new Date(a.start_date).getTime() - planned.getTime()) <= toleranceMs
  );
  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    const daysDiffA = Math.abs(new Date(a.start_date).getTime() - planned.getTime()) / (24 * 60 * 60 * 1000);
    const daysDiffB = Math.abs(new Date(b.start_date).getTime() - planned.getTime()) / (24 * 60 * 60 * 1000);
    const distDiffA = session.distanceKm > 0 ? Math.abs(a.distance / 1000 - session.distanceKm) / session.distanceKm : 1;
    const distDiffB = session.distanceKm > 0 ? Math.abs(b.distance / 1000 - session.distanceKm) / session.distanceKm : 1;
    return (daysDiffA * 3 + distDiffA) - (daysDiffB * 3 + distDiffB);
  })[0];
}

export function usePlanMatches(weeks: TrainingWeek[], activities: StravaActivity[]) {
  const [manualMatches, setManualMatches] = useState<Record<string, number | null>>({});
  const [skippedSessions, setSkippedSessions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedMatches = localStorage.getItem(MANUAL_MATCHES_KEY);
    if (savedMatches) setManualMatches(JSON.parse(savedMatches));
    const savedSkipped = localStorage.getItem(SKIPPED_KEY);
    if (savedSkipped) setSkippedSessions(JSON.parse(savedSkipped));
  }, []);

  // Build set of activity IDs that are manually confirmed (these are "taken")
  const confirmedActivityIds = useMemo(() => {
    const ids = new Set<number>();
    // From manual overrides
    Object.values(manualMatches).forEach(id => {
      if (id !== null) ids.add(id);
    });
    // From session.matchedActivityId (persisted via plan save)
    weeks.forEach(week => {
      week.sessions.forEach(s => {
        if (s.matchedActivityId) ids.add(s.matchedActivityId);
      });
    });
    return ids;
  }, [manualMatches, weeks]);

  const getMatchResult = useCallback((wi: number, si: number, session: TrainingWeek['sessions'][0]): { activity: StravaActivity; isManual: boolean } | null => {
    const key = `${wi}-${si}`;
    // 1. Manual override — always wins
    if (key in manualMatches) {
      if (manualMatches[key] === null) return null;
      const act = activities.find(a => a.id === manualMatches[key]);
      return act ? { activity: act, isManual: true } : null;
    }
    // 2. Previously saved match on session object
    if (session.matchedActivityId) {
      const act = activities.find(a => a.id === session.matchedActivityId);
      return act ? { activity: act, isManual: true } : null;
    }
    // 3. Auto-match — exclude activities already confirmed elsewhere
    const weekData = weeks[wi] as TrainingWeek & { dateRange?: string };
    const availableActivities = activities.filter(a => !confirmedActivityIds.has(a.id));
    const auto = autoMatch(session, weekData.dateRange, availableActivities);
    return auto ? { activity: auto, isManual: false } : null;
  }, [weeks, activities, manualMatches, confirmedActivityIds]);

  const isSkipped = useCallback((wi: number, si: number) => {
    return skippedSessions[`${wi}-${si}`] === true;
  }, [skippedSessions]);

  return { getMatchResult, isSkipped };
}
