import type { StravaActivity, StravaAthlete } from '@/types/strava';

export const mockAthlete: StravaAthlete = {
  id: 12345,
  firstname: 'Emanuele',
  lastname: 'D.',
  profile: '',
  profile_medium: '',
  city: 'Roma',
  state: 'Lazio',
  country: 'Italy',
};

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateActivity(daysAgo: number, i: number): StravaActivity {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(6 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

  const types = [
    { name: 'Easy Run', distance: randomBetween(5000, 10000), pace: randomBetween(310, 360) },
    { name: 'Tempo Run', distance: randomBetween(8000, 12000), pace: randomBetween(280, 320) },
    { name: 'Long Run', distance: randomBetween(15000, 30000), pace: randomBetween(320, 370) },
    { name: 'Interval Training', distance: randomBetween(6000, 10000), pace: randomBetween(260, 310) },
    { name: 'Recovery Run', distance: randomBetween(4000, 7000), pace: randomBetween(350, 400) },
  ];

  const type = types[i % types.length];
  const distance = type.distance;
  const paceSecsPerKm = type.pace;
  const movingTime = Math.round((distance / 1000) * paceSecsPerKm);
  const avgSpeed = 1000 / paceSecsPerKm;
  const hr = Math.round(randomBetween(120, 175));
  const elev = Math.round(randomBetween(20, distance / 200));

  // Generate a fake polyline (Rome area)
  const baseLat = 41.89 + randomBetween(-0.05, 0.05);
  const baseLng = 12.49 + randomBetween(-0.05, 0.05);
  const points: string[] = [];
  let lat = baseLat;
  let lng = baseLng;
  for (let p = 0; p < 20; p++) {
    lat += randomBetween(-0.003, 0.003);
    lng += randomBetween(-0.003, 0.003);
    // Simplified encoding (not real polyline, just for mock)
    points.push(`${lat.toFixed(5)},${lng.toFixed(5)}`);
  }

  // Generate a real-ish encoded polyline
  const polyline = encodePolyline(points.map(p => {
    const [la, lo] = p.split(',').map(Number);
    return [la, lo] as [number, number];
  }));

  const names = [
    'Corsa mattutina al Colosseo', 'Giro Villa Borghese', 'Lungarno pre-alba',
    'Allenamento Circo Massimo', 'Easy lungo il Tevere', 'Ripetute Villa Pamphili',
    'Corsa del sabato', 'Recovery domenicale', 'Tempo run centro storico',
    'Long run Appia Antica', 'Intervalli Foro Italico', 'Easy EUR',
    'Collinare Gianicolo', 'Progressivo Pincio', 'Trail Caffarella',
  ];

  return {
    id: 10000 + i,
    name: names[i % names.length],
    type: 'Run',
    sport_type: 'Run',
    distance,
    moving_time: movingTime,
    elapsed_time: movingTime + Math.round(randomBetween(30, 300)),
    total_elevation_gain: elev,
    start_date: date.toISOString(),
    start_date_local: date.toISOString(),
    timezone: 'Europe/Rome',
    average_speed: avgSpeed,
    max_speed: avgSpeed * randomBetween(1.1, 1.4),
    average_heartrate: hr,
    max_heartrate: hr + Math.round(randomBetween(10, 30)),
    average_cadence: Math.round(randomBetween(160, 185)),
    calories: Math.round(movingTime / 60 * randomBetween(10, 14)),
    workout_type: null,
    description: null,
    perceived_exertion: null,
    map: {
      id: `map_${i}`,
      summary_polyline: polyline,
      polyline: null,
    },
    trainer: false,
    commute: false,
    manual: false,
    gear_id: null,
    kudos_count: Math.floor(randomBetween(0, 15)),
    achievement_count: Math.floor(randomBetween(0, 5)),
  };
}

// Simple polyline encoder
function encodePolyline(coords: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coords) {
    const dLat = Math.round(lat * 1e5) - prevLat;
    const dLng = Math.round(lng * 1e5) - prevLng;
    prevLat += dLat;
    prevLng += dLng;
    encoded += encodeValue(dLat) + encodeValue(dLng);
  }

  return encoded;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : (value << 1);
  let encoded = '';
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

export function generateMockActivities(): StravaActivity[] {
  const activities: StravaActivity[] = [];
  let dayOffset = 0;

  // Generate ~4 runs per week over 6 months
  for (let week = 0; week < 26; week++) {
    const runsThisWeek = 3 + Math.floor(Math.random() * 3); // 3-5 runs
    const runDays = [1, 3, 5, 6, 0].slice(0, runsThisWeek); // Mon, Wed, Fri, Sat, Sun

    for (const day of runDays) {
      const daysAgo = (25 - week) * 7 + (6 - day);
      if (daysAgo >= 0) {
        activities.push(generateActivity(daysAgo, activities.length));
      }
    }
  }

  return activities.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
}
