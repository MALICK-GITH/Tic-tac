import { NextResponse } from 'next/server';
import { fetchLiveMatches, LIVE_SHORT_URL } from '@/lib/tictactoe-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = await fetchLiveMatches();

  return NextResponse.json({
    source: '1xbet live feed',
    shortFeed: LIVE_SHORT_URL,
    count: matches.length,
    matches,
  });
}
