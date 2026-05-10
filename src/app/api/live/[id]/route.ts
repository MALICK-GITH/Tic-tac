import { NextResponse } from 'next/server';
import { fetchLiveMatches, getMatchById } from '@/lib/tictactoe-data';

export const dynamic = 'force-dynamic';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params;
  const matchId = Number(id);
  const matches = await fetchLiveMatches();
  const match = getMatchById(matchId, matches);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  return NextResponse.json({ match });
}
