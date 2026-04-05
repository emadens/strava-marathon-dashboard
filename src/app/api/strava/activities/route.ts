import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchAllActivities } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const afterParam = searchParams.get('after');
    const after = afterParam ? parseInt(afterParam, 10) : undefined;

    const activities = await fetchAllActivities(session.accessToken, after);
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore caricamento attivita' },
      { status: 500 }
    );
  }
}
