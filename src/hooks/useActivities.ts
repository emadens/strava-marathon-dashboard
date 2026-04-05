'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StravaActivity } from '@/types/strava';

const CACHE_KEY = 'strava_activities_cache';
const SYNC_KEY = 'strava_last_sync';

interface CachedData {
  activities: StravaActivity[];
  lastSync: number; // epoch seconds
}

function loadCache(): CachedData {
  if (typeof window === 'undefined') return { activities: [], lastSync: 0 };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedData;
      return parsed;
    }
  } catch { /* ignore */ }
  return { activities: [], lastSync: 0 };
}

function saveCache(data: CachedData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(SYNC_KEY, String(Date.now()));
}

export function useActivities() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<number>(0);

  // Load from cache on mount
  useEffect(() => {
    const cached = loadCache();
    if (cached.activities.length > 0) {
      setActivities(cached.activities);
      setLastSync(cached.lastSync);
      setIsLoading(false);
      // Auto-sync in background if cache is older than 1 hour
      const ageMs = Date.now() / 1000 - cached.lastSync;
      if (ageMs > 3600) {
        syncNew(cached);
      }
    } else {
      // No cache, do full sync
      syncFull();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Incremental sync: fetch only activities after the latest one we have
  const syncNew = useCallback(async (cached?: CachedData) => {
    const data = cached || loadCache();
    setIsSyncing(true);
    try {
      // Find the latest activity timestamp
      let afterEpoch = data.lastSync;
      if (data.activities.length > 0) {
        const latestDate = Math.max(...data.activities.map(a => Math.floor(new Date(a.start_date).getTime() / 1000)));
        afterEpoch = latestDate;
      }

      const res = await fetch(`/api/strava/activities?after=${afterEpoch}`);
      if (!res.ok) throw new Error('Errore sync');
      const newActivities: StravaActivity[] = await res.json();

      if (newActivities.length > 0) {
        // Merge: add new, deduplicate by ID
        const existingIds = new Set(data.activities.map(a => a.id));
        const unique = newActivities.filter(a => !existingIds.has(a.id));
        const merged = [...data.activities, ...unique].sort(
          (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );

        const now = Math.floor(Date.now() / 1000);
        saveCache({ activities: merged, lastSync: now });
        setActivities(merged);
        setLastSync(now);
        return unique.length;
      } else {
        // Update lastSync even if no new activities
        const now = Math.floor(Date.now() / 1000);
        saveCache({ ...data, lastSync: now });
        setLastSync(now);
        return 0;
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Sync error'));
      return -1;
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  // Full sync: clear cache and re-fetch everything
  const syncFull = useCallback(async () => {
    setIsLoading(true);
    setIsSyncing(true);
    try {
      const res = await fetch('/api/strava/activities');
      if (!res.ok) throw new Error('Errore sync completo');
      const all: StravaActivity[] = await res.json();

      const sorted = all.sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );

      const now = Math.floor(Date.now() / 1000);
      saveCache({ activities: sorted, lastSync: now });
      setActivities(sorted);
      setLastSync(now);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Full sync error'));
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Refresh = incremental sync
  const refresh = useCallback(async () => {
    return syncNew();
  }, [syncNew]);

  // Deep refresh = full sync (clears cache)
  const deepRefresh = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    return syncFull();
  }, [syncFull]);

  const lastSyncLabel = lastSync
    ? new Date(lastSync * 1000).toLocaleDateString('it', { day: '2-digit', month: 'short' })
      + ' ' + new Date(lastSync * 1000).toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' })
    : null;

  return {
    activities,
    isLoading,
    isSyncing,
    error,
    refresh,
    deepRefresh,
    lastSyncLabel,
    cachedCount: activities.length,
  };
}
