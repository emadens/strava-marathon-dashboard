import type { TrainingWeek, TrainingSession, SessionType } from '@/types/training-plan';

/**
 * Parse a CSV training plan in the Runna export format:
 * Week,Date,Total Km,Day,Workout Type,Km
 * Week 1,22 Dic - 28 Dic,8.00,Sab,Progressive Long Run,8.0
 * ,,,Mer,Intervals,5.0
 */
export function parsePlanCSV(csv: string): TrainingWeek[] {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  const weeks: TrainingWeek[] = [];
  let currentWeek: TrainingWeek | null = null;

  for (const line of lines) {
    // Skip header
    if (line.toLowerCase().startsWith('settimana,') || line.toLowerCase().startsWith('week,')) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 6) continue;

    const [weekLabel, dateRange, totalKm, dayRaw, typeRaw, kmRaw] = cols;

    // New week starts when weekLabel is not empty
    if (weekLabel.trim()) {
      if (currentWeek) weeks.push(currentWeek);
      const weekNum = parseInt(weekLabel.replace(/\D/g, ''), 10) || weeks.length + 1;
      currentWeek = {
        weekNumber: weekNum,
        sessions: [],
        weeklyTotalKm: parseFloat(totalKm) || 0,
        // Store date range as metadata
        ...(dateRange.trim() ? { dateRange: dateRange.trim() } : {}),
      } as TrainingWeek & { dateRange?: string };
    }

    if (!currentWeek) continue;

    const day = normalizeDayOfWeek(dayRaw.trim());
    if (!day) continue;

    const session: TrainingSession = {
      dayOfWeek: day,
      type: normalizeSessionType(typeRaw.trim()),
      distanceKm: parseFloat(kmRaw) || 0,
      targetPaceMinKm: null,
      intervals: extractIntervalInfo(typeRaw.trim()),
      notes: extractNotes(typeRaw.trim()),
      completed: false,
    };

    currentWeek.sessions.push(session);
  }

  if (currentWeek) weeks.push(currentWeek);
  return weeks;
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { cols.push(current); current = ''; continue; }
    current += ch;
  }
  cols.push(current);
  return cols;
}

function normalizeDayOfWeek(raw: string): string | null {
  const map: Record<string, string> = {
    'lun': 'lunedi', 'mon': 'lunedi',
    'mar': 'martedi', 'tue': 'martedi',
    'mer': 'mercoledi', 'wed': 'mercoledi',
    'gio': 'giovedi', 'thu': 'giovedi',
    'ven': 'venerdi', 'fri': 'venerdi',
    'sab': 'sabato', 'sat': 'sabato',
    'dom': 'domenica', 'sun': 'domenica',
  };
  const key = raw.toLowerCase().slice(0, 3);
  return map[key] || null;
}

function normalizeSessionType(raw: string): SessionType {
  const lower = raw.toLowerCase();
  if (lower.includes('race') || lower.includes('gara')) return 'long_run'; // race is a special long run
  if (lower.includes('easy')) return 'easy';
  if (lower.includes('recovery')) return 'recovery';
  if (lower.includes('tempo')) return 'tempo';
  if (lower.includes('interval') || lower.includes('repeat') || lower.includes('hills') || lower.includes('hill') || lower.includes('taper interval')) return 'interval';
  if (lower.includes('long run') || lower.includes('long') || lower.includes('progressive')) return 'long_run';
  if (lower.includes('time trial')) return 'tempo';
  if (lower.includes('cross')) return 'cross_training';
  if (lower.includes('rest')) return 'rest';
  return 'easy';
}

function extractIntervalInfo(raw: string): string | null {
  // Extract interval details like "1km Repeats" or "Taper Intervals"
  const lower = raw.toLowerCase();
  if (lower.includes('repeat') || lower.includes('interval')) return raw;
  if (lower.includes('hills') || lower.includes('hill')) return raw;
  return null;
}

function extractNotes(raw: string): string | null {
  if (raw.toLowerCase().includes('rolling')) return 'Rolling (collinare)';
  if (raw.toLowerCase().includes('progressive')) return 'Progressiva';
  if (raw.toLowerCase().includes('hilly')) return 'Collinare';
  if (raw.toLowerCase().includes('race')) return 'GARA';
  if (raw.toLowerCase().includes('time trial')) return 'Time trial';
  if (raw.toLowerCase().includes('taper')) return 'Taper';
  return null;
}

/** Color scheme matching Runna app */
export const SESSION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  easy: { bg: 'rgba(57,211,83,0.12)', text: '#39d353', dot: '#39d353' },
  recovery: { bg: 'rgba(57,211,83,0.08)', text: '#39d353', dot: '#2da44e' },
  tempo: { bg: 'rgba(255,140,66,0.12)', text: '#ff8c42', dot: '#ff8c42' },
  interval: { bg: 'rgba(255,77,0,0.12)', text: '#ff4d00', dot: '#ff4d00' },
  long_run: { bg: 'rgba(157,78,221,0.12)', text: '#9d4edd', dot: '#9d4edd' },
  rest: { bg: 'rgba(102,102,102,0.08)', text: '#666', dot: '#444' },
  cross_training: { bg: 'rgba(77,166,255,0.12)', text: '#4da6ff', dot: '#4da6ff' },
};
