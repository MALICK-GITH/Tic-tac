import { LiveMatchesFeed } from '@/components/live-matches-feed';
import { SiteHeader } from '@/components/site-header';
import { fetchLiveMatches } from '@/lib/tictactoe-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const matches = await fetchLiveMatches();

  return (
    <main className="page-shell">
      <SiteHeader />
      <LiveMatchesFeed initialMatches={matches} />
    </main>
  );
}
