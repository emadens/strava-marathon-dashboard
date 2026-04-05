import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchAllActivities } from '@/lib/strava';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const activities = await fetchAllActivities(session.accessToken);
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore caricamento attivita' },
      { status: 500 }
    );
  }
}
