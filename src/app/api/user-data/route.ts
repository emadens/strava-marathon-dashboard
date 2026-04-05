import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { kvGet, kvSet, kvDel } from '@/lib/kv';

const VALID_TYPES = ['plans', 'manual_matches', 'skipped_sessions', 'goals', 'hr_zones', 'vo2max', 'saved_date_ranges', 'ocr_count'] as const;
type DataType = typeof VALID_TYPES[number];

/**
 * GET /api/user-data?type=plans
 * GET /api/user-data?type=all (returns all data types)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const type = request.nextUrl.searchParams.get('type');

  if (type === 'all') {
    // Fetch all data types in parallel
    const results = await Promise.all(
      VALID_TYPES.map(async t => ({ type: t, data: await kvGet(session.athleteId, t) }))
    );
    const data: Record<string, unknown> = {};
    results.forEach(r => { data[r.type] = r.data; });
    return NextResponse.json(data);
  }

  if (!type || !VALID_TYPES.includes(type as DataType)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });
  }

  const data = await kvGet(session.athleteId, type as DataType);
  return NextResponse.json({ data });
}

/**
 * POST /api/user-data
 * Body: { type: string, data: any }
 * Or batch: { batch: [{ type: string, data: any }, ...] }
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const body = await request.json();

  // Batch mode
  if (body.batch && Array.isArray(body.batch)) {
    await Promise.all(
      body.batch
        .filter((item: { type: string }) => VALID_TYPES.includes(item.type as DataType))
        .map((item: { type: DataType; data: unknown }) =>
          item.data === null
            ? kvDel(session.athleteId, item.type)
            : kvSet(session.athleteId, item.type, item.data)
        )
    );
    return NextResponse.json({ ok: true });
  }

  // Single mode
  const { type, data } = body;
  if (!type || !VALID_TYPES.includes(type as DataType)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });
  }

  if (data === null) {
    await kvDel(session.athleteId, type as DataType);
  } else {
    await kvSet(session.athleteId, type as DataType, data);
  }

  return NextResponse.json({ ok: true });
}
