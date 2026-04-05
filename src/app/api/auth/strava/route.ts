import { NextResponse } from 'next/server';
import { setStateCookie } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.json({ error: 'STRAVA_CLIENT_ID non configurato' }, { status: 500 });
  }

  // Generate CSRF state parameter
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/auth/callback`,
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
    state,
  });

  const response = NextResponse.json({
    url: `https://www.strava.com/oauth/authorize?${params}`,
  });

  setStateCookie(response, state);
  return response;
}
