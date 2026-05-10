export type BoardCell = 'X' | 'O' | '';

export type LiveMarketLine = {
  B?: boolean;
  C?: number;
  CV?: string;
  G?: number;
  P?: number;
  T?: number;
  CE?: number;
};

export type LiveRound = {
  Key?: number;
  Value?: {
    NF?: string;
    S1?: number;
    S2?: number;
  };
};

export type LiveScoreState = {
  CPS?: string;
  FS?: { S1?: number; S2?: number };
  I?: string;
  PS?: LiveRound[];
  S?: Array<{ Value?: string }>;
  SLS?: string;
  STU?: number;
  TD?: number;
  TS?: number;
  TR?: number;
};

export type LiveFeedItem = {
  I?: number;
  N?: number;
  DI?: string;
  CE?: string;
  CN?: string;
  CO?: number;
  COI?: number;
  LI?: number;
  SI?: number;
  T?: number;
  V?: string;
  E?: LiveMarketLine[];
  O1?: string;
  O2?: string;
  O1R?: string;
  O2R?: string;
  O1I?: number;
  O2I?: number;
  O1C?: number;
  O2C?: number;
  S?: number;
  SC?: LiveScoreState;
  GNS?: boolean;
  F?: boolean;
  HMH?: number;
  HS?: number;
  Z?: number;
  R?: number;
  CHIMG?: string;
  L?: unknown[];
  [key: string]: unknown;
};

export type MarketRow = {
  index: number;
  group: string;
  type: string;
  price: number;
  priceText: string;
  handicap: string;
  available: boolean;
};

export type RoundRow = {
  index: number;
  label: string;
  homeScore: string;
  awayScore: string;
  note: string;
};

export type RecommendationChoice = {
  id: 'home' | 'draw' | 'away';
  label: string;
  displayLabel: string;
  description: string;
  price: number;
  confidence: number;
  note: string;
};

export type MatchRecommendation = {
  selectedId: RecommendationChoice['id'];
  headline: string;
  confidence: number;
  rationale: string;
  signals: string[];
  choices: RecommendationChoice[];
};

export type TicTacToeMatch = {
  id: number;
  title: string;
  competition: string;
  competitionLabel: string;
  roundId: string;
  status: 'En direct' | 'À venir' | 'Terminé';
  phase: string;
  scoreText: string;
  remaining: string;
  sportId: number;
  leagueId: number;
  countryCode: number;
  matchType: number;
  eventTime: number | null;
  oddsLabels: { home: string; draw: string; away: string };
  referenceOdds: { home: number; draw: number; away: number };
  markets: MarketRow[];
  rounds: RoundRow[];
  recommendation: MatchRecommendation;
  raw: LiveFeedItem;
};

export const LIVE_FEED_URL =
  'https://1xbet.com/service-api/LiveFeed/Get1x2_VZip?sports=320&champs=2945387&count=40&lng=fr&gr=285&mode=4&country=96&getEmpty=true&virtualSports=true&noFilterBlockEvent=true';

export const LIVE_SHORT_URL =
  'https://1xbet.com/service-api/LiveFeed/GetSportsShortZip?sports=320&champs=2945387&lng=fr&gr=285&country=96&virtualSports=true&groupChamps=true';

const fallbackFeedItems: LiveFeedItem[] = [
  {
    I: 720013501,
    N: 2945387,
    DI: '454',
    CE: 'World',
    CN: 'Monde',
    CO: 79,
    COI: 225,
    LI: 2945387,
    SI: 320,
    T: 50,
    O1: 'Crosses',
    O2: 'Noughts',
    O1R: 'Croix',
    O2R: 'Ronds',
    S: 1778425560,
    SC: {
      CPS: '',
      FS: { S1: 1, S2: 1 },
      I: 'Half time',
      PS: [
        { Key: 1, Value: { NF: '1 round', S1: 1 } },
        { Key: 2, Value: { NF: '2 round', S2: 1 } },
        { Key: 3, Value: { NF: '3 round' } },
      ],
      SLS: '1 min. restantes',
      STU: 1778425600,
      TD: -1,
      TS: 23,
    },
    E: [
      { B: true, C: 1.78, CV: '1.78', G: 1, T: 1 },
      { B: true, C: 3.08, CV: '3.08', G: 1, T: 2 },
      { B: true, C: 2.02, CV: '2.02', G: 1, T: 3 },
    ],
  },
  {
    I: 720014257,
    N: 2945387,
    DI: '455',
    CE: 'World',
    CN: 'Monde',
    CO: 79,
    COI: 225,
    LI: 2945387,
    SI: 320,
    T: 50,
    O1: 'Crosses',
    O2: 'Noughts',
    O1R: 'Croix',
    O2R: 'Ronds',
    S: 1778425680,
    SC: {
      CPS: '',
      FS: {},
      I: 'Paris avant le début du jeu',
      PS: [
        { Key: 1, Value: { NF: '1 round' } },
        { Key: 2, Value: { NF: '2 round' } },
        { Key: 3, Value: { NF: '3 round' } },
      ],
      SLS: 'Début dans 2 minutes',
      STU: 1778425680,
      TD: -1,
      TS: 109,
    },
    E: [
      { B: true, C: 1.95, CV: '1.95', G: 1, T: 1 },
      { B: true, C: 3.08, CV: '3.08', G: 1, T: 2 },
      { B: true, C: 1.98, CV: '1.98', G: 1, T: 3 },
    ],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);
}

function getStatus(rawStatus?: string, label?: string): TicTacToeMatch['status'] {
  const text = normalizeText(`${rawStatus ?? ''} ${label ?? ''}`);

  if (text.includes('termin') || text.includes('fini')) {
    return 'Terminé';
  }

  if (text.includes('debut') || text.includes('avant le debut') || text.includes('paris ouverts')) {
    return 'À venir';
  }

  return 'En direct';
}

function buildMarketRows(item: LiveFeedItem): MarketRow[] {
  return (item.E ?? []).map((market, index) => ({
    index: index + 1,
    group: market.G !== undefined ? `G${market.G}` : 'G-',
    type: market.T !== undefined ? `T${market.T}` : 'T-',
    price: market.C ?? 0,
    priceText: market.C ? formatPrice(market.C) : '—',
    handicap: market.P !== undefined ? formatPrice(market.P) : '—',
    available: market.B !== false,
  }));
}

function buildRounds(item: LiveFeedItem): RoundRow[] {
  return (item.SC?.PS ?? []).map((round, index) => ({
    index: index + 1,
    label: round.Value?.NF ?? `Round ${index + 1}`,
    homeScore: round.Value?.S1 !== undefined ? String(round.Value.S1) : '—',
    awayScore: round.Value?.S2 !== undefined ? String(round.Value.S2) : '—',
    note: round.Value?.S1 !== undefined || round.Value?.S2 !== undefined ? 'Score observé' : 'Sans variation',
  }));
}

function buildReferenceOdds(item: LiveFeedItem) {
  const homeScore = item.SC?.FS?.S1 ?? 0;
  const awayScore = item.SC?.FS?.S2 ?? 0;
  const scoreDelta = homeScore - awayScore;
  const phase = normalizeText(item.SC?.I ?? '');

  return {
    home: scoreDelta >= 0 ? 1.78 : 1.95,
    draw: phase.includes('debut') ? 3.12 : 3.08,
    away: scoreDelta <= 0 ? 1.8 : 2.02,
  };
}

function buildRecommendation(item: LiveFeedItem): MatchRecommendation {
  const homeScore = item.SC?.FS?.S1 ?? 0;
  const awayScore = item.SC?.FS?.S2 ?? 0;
  const phase = normalizeText(item.SC?.I ?? '');
  const rounds = item.SC?.PS?.length ?? 0;
  const scoreDelta = homeScore - awayScore;
  const status = getStatus(item.SC?.I, item.SC?.SLS);

  let selectedId: RecommendationChoice['id'] = 'draw';
  let headline = 'Position conservatrice sur le nul';
  let rationale =
    'Le match reste équilibré et le système privilégie une approche prudente.';

  if (status === 'À venir') {
    selectedId = 'draw';
    headline = 'Attente du premier signal';
    rationale =
      'Le coup d’envoi n’a pas encore produit d’avantage structurel visible.';
  } else if (scoreDelta > 0) {
    selectedId = 'home';
    headline = 'Avantage à Croisillons';
    rationale =
      'Le score et la séquence courante donnent un avantage lisible à l’option home.';
  } else if (scoreDelta < 0) {
    selectedId = 'away';
    headline = 'Avantage à Ronds';
    rationale =
      'Le score et la dynamique actuelle favorisent l’option away.';
  } else if (phase.includes('half')) {
    selectedId = 'draw';
    headline = 'Lecture neutre à mi-parcours';
    rationale =
      'L’égalité affichée et la phase du match maintiennent le nul comme scénario central.';
  }

  const referenceOdds = buildReferenceOdds(item);
  const choices: RecommendationChoice[] = [
    {
      id: 'home',
      label: item.O1R ?? item.O1 ?? 'Croix',
      displayLabel: 'Victoire Croisillons',
      description: 'Parie sur la victoire de l’équipe des croix.',
      price: referenceOdds.home,
      confidence: Math.min(72 + Math.max(scoreDelta, 0) * 5 + rounds, 92),
      note: 'Option orientée sur l’avantage du camp Croisillons.',
    },
    {
      id: 'draw',
      label: 'Nul',
      displayLabel: 'Match nul',
      description: 'Parie sur une égalité à la fin du match.',
      price: referenceOdds.draw,
      confidence: Math.min(68 + (status === 'À venir' ? 6 : 0), 90),
      note: 'Option de stabilité quand le match reste verrouillé.',
    },
    {
      id: 'away',
      label: item.O2R ?? item.O2 ?? 'Ronds',
      displayLabel: 'Victoire Ronds',
      description: 'Parie sur la victoire de l’équipe des ronds.',
      price: referenceOdds.away,
      confidence: Math.min(72 + Math.max(-scoreDelta, 0) * 5 + rounds, 92),
      note: 'Option orientée sur l’avantage du camp Ronds.',
    },
  ];

  const confidence = Math.min(
    66 + Math.abs(scoreDelta) * 8 + Math.min(rounds, 3) * 2 + (phase.includes('half') ? 2 : 0),
    93,
  );

  return {
    selectedId,
    headline,
    confidence,
    rationale,
    signals: [
      `Score actuel: ${homeScore} - ${awayScore}`,
      `Phase: ${item.SC?.I ?? 'Non renseignée'}`,
      `Marchés actifs: ${(item.E ?? []).length}`,
    ],
    choices,
  };
}

function buildTitle(item: LiveFeedItem) {
  return `Tic Tac Toe • Match ${item.DI ?? item.N ?? item.I ?? 'live'}`;
}

export function createMatchSnapshot(item: LiveFeedItem): TicTacToeMatch | null {
  if (typeof item.I !== 'number') {
    return null;
  }

  return {
    id: item.I,
    title: buildTitle(item),
    competition: item.CE ?? 'Esports',
    competitionLabel: item.CN ?? 'Monde',
    roundId: item.DI ?? '—',
    status: getStatus(item.SC?.I, item.SC?.SLS),
    phase: item.SC?.I ?? 'Non renseignée',
    scoreText: `${item.SC?.FS?.S1 ?? 0} - ${item.SC?.FS?.S2 ?? 0}`,
    remaining: item.SC?.SLS ?? '—',
    sportId: item.SI ?? 320,
    leagueId: item.LI ?? 2945387,
    countryCode: item.CO ?? 0,
    matchType: item.T ?? 0,
    eventTime: item.S ?? null,
    oddsLabels: {
      home: 'Croisillons',
      draw: 'Nul',
      away: 'Ronds',
    },
    referenceOdds: buildReferenceOdds(item),
    markets: buildMarketRows(item),
    rounds: buildRounds(item),
    recommendation: buildRecommendation(item),
    raw: item,
  };
}

function fallbackSnapshots() {
  return fallbackFeedItems
    .map((item) => createMatchSnapshot(item))
    .filter((match): match is TicTacToeMatch => match !== null);
}

export async function fetchLiveMatches(): Promise<TicTacToeMatch[]> {
  try {
    const response = await fetch(LIVE_FEED_URL, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return fallbackSnapshots();
    }

    const data: { Value?: LiveFeedItem[] } = await response.json();
    const matches = (data.Value ?? [])
      .map((item) => createMatchSnapshot(item))
      .filter((match): match is TicTacToeMatch => match !== null);

    return matches.length > 0 ? matches : fallbackSnapshots();
  } catch {
    return fallbackSnapshots();
  }
}

export async function fetchLiveMatchById(matchId: number) {
  const matches = await fetchLiveMatches();
  return matches.find((match) => match.id === matchId) ?? null;
}

export function getMatchById(matchId: number, matches: TicTacToeMatch[] = fallbackSnapshots()) {
  return matches.find((match) => match.id === matchId) ?? null;
}

export function formatMarkets(marketRows: MarketRow[]) {
  return marketRows.map((market) => `${market.group}/${market.type}: ${market.priceText}`).join(' | ');
}

export function formatRawValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
