'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook that syncs data between localStorage and Vercel KV.
 * - On mount: loads from localStorage (instant), then fetches from KV (async)
 * - If KV has data and localStorage doesn't (new device), uses KV data
 * - On save: writes to both localStorage and KV
 *
 * @param localKey - localStorage key
 * @param kvType - KV data type for API
 * @param defaultValue - default value if neither has data
 */
export function useSyncedStorage<T>(localKey: string, kvType: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const syncingRef = useRef(false);

  // Load: localStorage first (instant), then KV (async)
  useEffect(() => {
    // 1. Load from localStorage
    const local = localStorage.getItem(localKey);
    if (local) {
      try {
        setData(JSON.parse(local));
      } catch { /* ignore */ }
    }

    // 2. Fetch from KV in background
    fetch(`/api/user-data?type=${kvType}`)
      .then(r => r.ok ? r.json() : null)
      .then(result => {
        if (result?.data !== null && result?.data !== undefined) {
          // KV has data — use it if it's different from local
          const kvData = result.data;
          const localData = local ? JSON.parse(local) : null;

          // If local is empty but KV has data (new device sync)
          if (!localData && kvData) {
            setData(kvData);
            localStorage.setItem(localKey, JSON.stringify(kvData));
          }
          // If both exist, KV wins (it's the shared state)
          else if (kvData && JSON.stringify(kvData) !== local) {
            setData(kvData);
            localStorage.setItem(localKey, JSON.stringify(kvData));
          }
        }
      })
      .catch(() => { /* KV unavailable, use local */ })
      .finally(() => setLoaded(true));
  }, [localKey, kvType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to both localStorage and KV
  const save = useCallback((newData: T) => {
    setData(newData);
    localStorage.setItem(localKey, JSON.stringify(newData));

    // Debounced KV sync (don't block UI)
    if (!syncingRef.current) {
      syncingRef.current = true;
      setTimeout(() => {
        fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: kvType, data: newData }),
        })
          .catch(() => { /* KV unavailable, data safe in localStorage */ })
          .finally(() => { syncingRef.current = false; });
      }, 500); // 500ms debounce
    }
  }, [localKey, kvType]);

  // Delete from both
  const remove = useCallback(() => {
    setData(defaultValue);
    localStorage.removeItem(localKey);
    fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: kvType, data: null }),
    }).catch(() => {});
  }, [localKey, kvType, defaultValue]);

  return { data, save, remove, loaded };
}
