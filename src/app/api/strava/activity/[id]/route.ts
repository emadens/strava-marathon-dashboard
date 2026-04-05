import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchActivity } from '@/lib/strava';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id } = await params;
  const activityId = parseInt(id, 10);
  if (isNaN(activityId) || activityId <= 0) {
    return NextResponse.json({ error: 'ID attivita non valido' }, { status: 400 });
  }

  try {
    const activity = await fetchActivity(session.accessToken, activityId);
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore caricamento dettagli' },
      { status: 500 }
    );
  }
}
