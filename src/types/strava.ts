export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
  city: string;
  state: string;
  country: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_cadence: number | null;
  calories: number;
  workout_type: number | null;
  description: string | null;
  perceived_exertion: number | null;
  map: {
    id: string;
    summary_polyline: string | null;
    polyline: string | null;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  gear_id: string | null;
  kudos_count: number;
  achievement_count: number;
}

export interface StravaDetailedActivity extends StravaActivity {
  splits_metric: StravaSplit[];
  best_efforts: StravaBestEffort[];
  segment_efforts: StravaSegmentEffort[];
  laps: StravaLap[];
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_heartrate: number | null;
  pace_zone: number;
}

export interface StravaBestEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  start_date: string;
  start_date_local: string;
  activity: { id: number };
}

export interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  start_date: string;
}

export interface StravaLap {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_speed: number;
  average_heartrate: number | null;
  lap_index: number;
}

export interface StravaAthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_run_totals: StravaStatsTotals;
  ytd_run_totals: StravaStatsTotals;
  all_run_totals: StravaStatsTotals;
}

export interface StravaStatsTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: StravaAthlete;
}
