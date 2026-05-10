import Link from 'next/link';
import type { TicTacToeMatch } from '@/lib/tictactoe-data';

type MatchCardProps = {
  match: TicTacToeMatch;
};

function formatTime(value: number | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value * 1000));
}

function statusClass(status: TicTacToeMatch['status']) {
  return status
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <article className="match-row">
      <div className="match-main">
        <div className="match-title-line">
          <span className={`status-tag status-tag--${statusClass(match.status)}`}>
            {match.status}
          </span>
          <h3>{match.title}</h3>
        </div>

        <div className="match-meta-grid">
          <div className="meta-item">
            <span>ID événement</span>
            <strong>{match.id}</strong>
          </div>
          <div className="meta-item">
            <span>Compétition</span>
            <strong>
              {match.competitionLabel} · {match.competition}
            </strong>
          </div>
          <div className="meta-item">
            <span>Phase</span>
            <strong>{match.phase}</strong>
          </div>
          <div className="meta-item">
            <span>Début / restant</span>
            <strong>{match.remaining}</strong>
          </div>
        </div>
      </div>

      <div className="match-score-box">
        <span>Score</span>
        <strong>{match.scoreText}</strong>
        <small>{formatTime(match.eventTime)}</small>
      </div>

      <div className="match-odds">
        <div className="odds-line">
          <span>{match.oddsLabels.home}</span>
          <strong>{match.referenceOdds.home.toFixed(2)}</strong>
        </div>
        <div className="odds-line">
          <span>Nul</span>
          <strong>{match.referenceOdds.draw.toFixed(2)}</strong>
        </div>
        <div className="odds-line">
          <span>{match.oddsLabels.away}</span>
          <strong>{match.referenceOdds.away.toFixed(2)}</strong>
        </div>
      </div>

      <div className="match-markets-box">
        <span>Marchés</span>
        <strong>{match.markets.length}</strong>
        <small>{match.markets[0] ? `${match.markets[0].group} · ${match.markets[0].type}` : '—'}</small>
      </div>

      <div className="match-action">
        <span className="action-label">Dossier du match</span>
        <Link className="button-secondary button-secondary--compact" href={`/match/${match.id}`}>
          Détails de la prédiction
        </Link>
      </div>
    </article>
  );
}
