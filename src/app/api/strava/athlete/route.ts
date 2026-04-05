import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchAthlete } from '@/lib/strava';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const athlete = await fetchAthlete(session.accessToken);
    return NextResponse.json(athlete);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore caricamento profilo' },
      { status: 500 }
    );
  }
}
