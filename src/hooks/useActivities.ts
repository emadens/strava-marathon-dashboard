import useSWR from 'swr';
import type { StravaActivity } from '@/types/strava';

const fetcher = async (url: string): Promise<StravaActivity[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Errore caricamento attivita');
  return res.json();
};

export function useActivities() {
  const { data, error, isLoading, mutate } = useSWR<StravaActivity[]>(
    '/api/strava/activities',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    activities: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
