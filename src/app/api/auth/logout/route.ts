import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(`${siteUrl}/login`);
  clearSessionCookie(response);
  return response;
}
