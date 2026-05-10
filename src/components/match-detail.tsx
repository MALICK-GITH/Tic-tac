import { formatRawValue, type TicTacToeMatch } from '@/lib/tictactoe-data';

type MatchDetailProps = {
  match: TicTacToeMatch;
};

const rawFieldOrder = [
  'I',
  'N',
  'DI',
  'CE',
  'CN',
  'CO',
  'COI',
  'LI',
  'SI',
  'T',
  'S',
  'V',
  'O1',
  'O2',
  'O1R',
  'O2R',
  'O1I',
  'O2I',
  'O1C',
  'O2C',
  'HMH',
  'HS',
  'GNS',
  'F',
  'Z',
  'R',
  'CHIMG',
];

function formatTimestamp(value: number | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date(value * 1000));
}

function statusClass(status: TicTacToeMatch['status']) {
  return status
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function MatchDetail({ match }: MatchDetailProps) {
  const rawEntries = rawFieldOrder
    .map((key) => ({
      key,
      value: formatRawValue((match.raw as Record<string, unknown>)[key]),
    }))
    .filter((entry) => entry.value !== '—');

  return (
    <div className="detail-main">
      <div className="panel panel--hero">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Dossier du match</span>
            <h2>{match.title}</h2>
            <p>
              {match.competitionLabel} · {match.competition} · ID {match.id}
            </p>
          </div>
          <span className={`status-tag status-tag--${statusClass(match.status)}`}>
            {match.status}
          </span>
        </div>

        <div className="overview-grid">
          <div className="stat-card">
            <span>Phase</span>
            <strong>{match.phase}</strong>
          </div>
          <div className="stat-card">
            <span>Score</span>
            <strong>{match.scoreText}</strong>
          </div>
          <div className="stat-card">
            <span>Temps restant</span>
            <strong>{match.remaining}</strong>
          </div>
          <div className="stat-card">
            <span>Début</span>
            <strong>{formatTimestamp(match.eventTime)}</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Cotes de référence</h3>
            <p>Lecture principale affichée pour l’utilisateur avant ouverture du détail.</p>
          </div>
        </div>

        <div className="choice-grid">
          <div className="choice-card">
            <span>{match.oddsLabels.home}</span>
            <strong>{match.referenceOdds.home.toFixed(2)}</strong>
            <p>Option Croisillons</p>
          </div>
          <div className="choice-card">
            <span>Nul</span>
            <strong>{match.referenceOdds.draw.toFixed(2)}</strong>
            <p>Option d’équilibre</p>
          </div>
          <div className="choice-card">
            <span>{match.oddsLabels.away}</span>
            <strong>{match.referenceOdds.away.toFixed(2)}</strong>
            <p>Option Ronds</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Marchés disponibles</h3>
            <p>Extraction du champ E renvoyé par le feed live.</p>
          </div>
        </div>

        <div className="market-table">
          <div className="market-table-head">
            <span>#</span>
            <span>Groupe</span>
            <span>Type</span>
            <span>Cote</span>
            <span>Ligne</span>
            <span>Disponibilité</span>
          </div>
          {match.markets.map((market) => (
            <div className="market-table-row" key={`${match.id}-${market.index}`}>
              <span>{market.index}</span>
              <span>{market.group}</span>
              <span>{market.type}</span>
              <span>{market.priceText}</span>
              <span>{market.handicap}</span>
              <span>{market.available ? 'Active' : 'Bloquée'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Chronologie technique</h3>
            <p>Historique brut des rounds de SC.PS.</p>
          </div>
        </div>

        <div className="timeline">
          {match.rounds.map((round) => (
            <div className="timeline-row" key={`${match.id}-${round.index}`}>
              <strong>{round.label}</strong>
              <span>Home {round.homeScore}</span>
              <span>Away {round.awayScore}</span>
              <span>{round.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Données techniques complètes</h3>
            <p>Champ brut de l’événement avec les coordonnées disponibles.</p>
          </div>
        </div>

        <dl className="field-grid">
          <div className="field-row">
            <dt>Identifiant événement</dt>
            <dd>{match.id}</dd>
          </div>
          <div className="field-row">
            <dt>Identifiant round</dt>
            <dd>{match.roundId}</dd>
          </div>
          <div className="field-row">
            <dt>Sport ID</dt>
            <dd>{match.sportId}</dd>
          </div>
          <div className="field-row">
            <dt>League ID</dt>
            <dd>{match.leagueId}</dd>
          </div>
          <div className="field-row">
            <dt>Code pays</dt>
            <dd>{match.countryCode}</dd>
          </div>
          <div className="field-row">
            <dt>Type de match</dt>
            <dd>{match.matchType}</dd>
          </div>
          <div className="field-row">
            <dt>Phase</dt>
            <dd>{match.phase}</dd>
          </div>
          <div className="field-row">
            <dt>Score</dt>
            <dd>{match.scoreText}</dd>
          </div>
          <div className="field-row">
            <dt>Temps restant</dt>
            <dd>{match.remaining}</dd>
          </div>
          <div className="field-row">
            <dt>Marchés</dt>
            <dd>{match.markets.length}</dd>
          </div>
        </dl>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Champs bruts du flux</h3>
            <p>Vue condensée des attributs directement exposés par l’API.</p>
          </div>
        </div>

        <dl className="field-grid">
          {rawEntries.map((entry) => (
            <div className="field-row" key={entry.key}>
              <dt>{entry.key}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="panel raw-panel">
        <summary>Payload brut complet</summary>
        <pre>{JSON.stringify(match.raw, null, 2)}</pre>
      </details>
    </div>
  );
}
