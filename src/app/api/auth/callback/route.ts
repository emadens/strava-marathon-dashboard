import { NextRequest, NextResponse } from 'next/server';
import { encrypt, getStateCookie, setSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  // Validate CSRF state
  const savedState = await getStateCookie();
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${siteUrl}/login?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${siteUrl}/login?error=token_exchange_failed`);
    }

    const data = await tokenRes.json();

    // Encrypt session data into JWT
    const token = await encrypt({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete?.id?.toString() || '',
    });

    // Redirect to dashboard with session cookie (NO tokens in URL)
    const response = NextResponse.redirect(siteUrl);
    setSessionCookie(response, token);

    // Clear the state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch {
    return NextResponse.redirect(`${siteUrl}/login?error=server_error`);
  }
}
