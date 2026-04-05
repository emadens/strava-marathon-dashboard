import useSWR from 'swr';
import type { StravaAthlete } from '@/types/strava';

const fetcher = async (url: string): Promise<StravaAthlete> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Errore caricamento profilo');
  return res.json();
};

export function useAthlete() {
  const { data, error, isLoading } = useSWR<StravaAthlete>(
    '/api/strava/athlete',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 min
    }
  );

  return {
    athlete: data ?? null,
    isLoading,
    error,
  };
}
