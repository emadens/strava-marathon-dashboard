import type { StravaActivity, StravaAthlete, StravaAthleteStats, StravaDetailedActivity } from '@/types/strava';

const STRAVA_API = 'https://www.strava.com/api/v3';

async function stravaFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchAthlete(accessToken: string): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>('/athlete', accessToken);
}

export async function fetchAthleteStats(accessToken: string, athleteId: string): Promise<StravaAthleteStats> {
  return stravaFetch<StravaAthleteStats>(`/athletes/${athleteId}/stats`, accessToken);
}

export async function fetchAllActivities(accessToken: string): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const batch = await stravaFetch<StravaActivity[]>(
      `/athlete/activities?per_page=200&page=${page}`,
      accessToken
    );

    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }

  return all.filter(a => a.type === 'Run' || a.sport_type === 'Run');
}

export async function fetchActivity(accessToken: string, activityId: number): Promise<StravaDetailedActivity> {
  return stravaFetch<StravaDetailedActivity>(`/activities/${activityId}`, accessToken);
}
