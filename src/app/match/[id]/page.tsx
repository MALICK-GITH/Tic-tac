import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchLiveMatches } from '@/lib/tictactoe-data';
import { DetailPrediction } from './detail-prediction';

export const dynamic = 'force-dynamic';

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const matchId = Number(id);
  const allMatches = await fetchLiveMatches();
  const match = allMatches.find((item) => item.id === matchId);

  if (!match) {
    notFound();
  }

  return (
    <main className="page-shell">
      <header className="topbar topbar--detail">
        <div className="brand">
          <div className="brand-mark">MD</div>
          <div>
            <h1>Détail de prédiction</h1>
            <p>Analyse des rounds, du gagnant et du prochain match non commencé</p>
          </div>
        </div>
        <Link className="button-secondary button-secondary--compact" href="/">
          Retour à la liste
        </Link>
      </header>

      <DetailPrediction match={match} allMatches={allMatches} />
    </main>
  );
}
