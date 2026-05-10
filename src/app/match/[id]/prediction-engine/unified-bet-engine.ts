import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import { analyzeBoard, analyzeLiveBoard, extractOddsFromMatch, parseBoards, predictPrematch, predictTicTacToe } from './index';
import type {
  NormalizedProbabilities,
  PredictionOutcome,
  RiskLevel,
  UnifiedBetChoice,
  UnifiedBetMarketType,
  UnifiedBetPrediction,
  UnifiedBetRoundScope,
  UnifiedBetSignal,
  UnifiedBetState,
} from './types';

type SourceView = {
  source: 'MATCH' | 'ROUND_1' | 'ROUND_2' | 'ROUND_3';
  roundScope: UnifiedBetRoundScope;
  roundNumber: 0 | 1 | 2 | 3;
  roundLabel: 'Match global' | '1 round' | '2 round' | '3 round';
  state: UnifiedBetState;
  board: number[];
  boardStatus: ReturnType<typeof analyzeBoard>['status'];
  probabilities: NormalizedProbabilities | null;
  prediction: PredictionOutcome;
  confidence: number;
  riskLevel: RiskLevel;
  reason: string;
  odds: { V1: number | null; X: number | null; V2: number | null } | null;
  boardFilled: number;
  advantage: number;
};

type RawMarketEntry = {
  t: number;
  g: number | null;
  p: number | null;
  price: number;
  available: boolean;
};

const DISCLAIMER = 'Jeu virtuel RNG — signal probabiliste, aucun gain garanti.';

const ROUND_SCOPE: Record<UnifiedBetRoundScope, { number: 0 | 1 | 2 | 3; label: SourceView['roundLabel']; source: SourceView['source'] }> = {
  MATCH: { number: 0, label: 'Match global', source: 'MATCH' },
  ROUND_1: { number: 1, label: '1 round', source: 'ROUND_1' },
  ROUND_2: { number: 2, label: '2 round', source: 'ROUND_2' },
  ROUND_3: { number: 3, label: '3 round', source: 'ROUND_3' },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
}

function normalizeRiskLevel(risk: RiskLevel): UnifiedBetSignal['riskLevel'] {
  if (risk === 'CRITICAL') return 'HIGH';
  return risk;
}

function getStateFromPredictionMode(mode: string): UnifiedBetState {
  if (mode === 'CONFIRMED') {
    return 'FINISHED';
  }

  if (mode.startsWith('LIVE')) {
    return 'LIVE';
  }

  return 'PREMATCH';
}

function getChoiceLabel(choice: UnifiedBetChoice) {
  switch (choice) {
    case 'V1':
      return 'V1';
    case 'DRAW':
      return 'X';
    case 'V2':
      return 'V2';
    case '1X':
      return '1X';
    case '12':
      return '12';
    case '2X':
      return '2X';
    case 'OVER':
      return 'Plus de';
    case 'UNDER':
      return 'Moins de';
    case 'HANDICAP_V1':
      return 'Handicap V1';
    case 'HANDICAP_V2':
      return 'Handicap V2';
    default:
      return 'ATTENDRE';
  }
}

function getOneXTwoMarketType(source: SourceView): UnifiedBetMarketType {
  if (source.source === 'MATCH') {
    return 'MATCH_1X2';
  }

  if (source.roundNumber === 1) return 'ROUND_1_1X2';
  if (source.roundNumber === 2) return 'ROUND_2_1X2';
  return 'ROUND_3_1X2';
}

function getRoundView(match: TicTacToeMatch, source: UnifiedBetRoundScope): SourceView {
  const prediction = source === 'MATCH' ? predictTicTacToe(match) : null;
  const boards = parseBoards(match);
  const roundIndex = ROUND_SCOPE[source].number;
  const board =
    source === 'MATCH'
      ? prediction?.debug.lastBoard ?? boards[boards.length - 1] ?? []
      : boards[roundIndex - 1] ?? [];
  const boardAnalysis = analyzeBoard(board.length ? board : Array.from({ length: 9 }, () => 0));
  const state =
    source === 'MATCH'
      ? getStateFromPredictionMode(prediction?.mode ?? 'PREMATCH')
      : boardAnalysis.status === 'WIN' || boardAnalysis.status === 'DRAW'
        ? 'FINISHED'
        : boardAnalysis.status === 'LIVE'
          ? 'LIVE'
          : 'PREMATCH';
  const sourcePrediction =
    source === 'MATCH'
      ? prediction ?? predictTicTacToe(match)
      : boardAnalysis.status === 'EMPTY'
        ? predictPrematch(extractOddsFromMatch(match))
        : analyzeLiveBoard(board, extractOddsFromMatch(match));
  const filled = board.filter((cell) => cell !== 0).length;
  const left = board.filter((cell) => cell === 0).length;
  const advantage =
    sourcePrediction.probabilities
      ? Math.abs((sourcePrediction.probabilities.V1 ?? 0) - (sourcePrediction.probabilities.V2 ?? 0))
      : 0;

  return {
    source: ROUND_SCOPE[source].source,
    roundScope: source,
    roundNumber: ROUND_SCOPE[source].number,
    roundLabel: ROUND_SCOPE[source].label,
    state,
    board: board.length ? board : Array.from({ length: 9 }, () => 0),
    boardStatus: boardAnalysis.status,
    probabilities: sourcePrediction.probabilities,
    prediction: sourcePrediction.prediction,
    confidence: sourcePrediction.confidence,
    riskLevel: normalizeRiskLevel(sourcePrediction.riskLevel),
    reason: sourcePrediction.reason,
    odds: extractOddsFromMatch(match),
    boardFilled: filled,
    advantage: advantage + left * 0.01,
  };
}

function getActiveMarkets(match: TicTacToeMatch) {
  const raw = match.raw as TicTacToeMatch['raw'] & {
    E?: Array<{ T?: number; G?: number; P?: number; C?: number; B?: boolean }>;
  };

  return (raw.E ?? [])
    .filter((entry) => entry.B !== false && typeof entry.C === 'number' && Number.isFinite(entry.C))
    .map<RawMarketEntry>((entry) => ({
      t: entry.T ?? 0,
      g: entry.G ?? null,
      p: typeof entry.P === 'number' && Number.isFinite(entry.P) ? entry.P : null,
      price: entry.C ?? 0,
      available: entry.B !== false,
    }));
}

function classifyMarket(entry: RawMarketEntry): UnifiedBetMarketType {
  if (entry.t >= 1 && entry.t <= 3) return entry.g === 1 ? `MATCH_1X2` : `ROUND_1_1X2`;
  if (entry.t >= 4 && entry.t <= 6) return 'DOUBLE_CHANCE';
  if (entry.t >= 7 && entry.t <= 8) return 'HANDICAP';
  if (entry.t >= 9 && entry.t <= 14) return 'TOTAL';
  return 'UNKNOWN';
}

function getChoiceForMarket(entry: RawMarketEntry): UnifiedBetChoice {
  if (entry.t === 1) return 'V1';
  if (entry.t === 2) return 'DRAW';
  if (entry.t === 3) return 'V2';
  if (entry.t === 4) return '1X';
  if (entry.t === 5) return '12';
  if (entry.t === 6) return '2X';
  if (entry.t === 7) return 'HANDICAP_V1';
  if (entry.t === 8) return 'HANDICAP_V2';
  if (entry.t % 2 === 1) return 'OVER';
  return 'UNDER';
}

function getMarketLine(entry: RawMarketEntry) {
  if (entry.p === null) {
    return undefined;
  }

  return Math.abs(entry.p);
}

function calculateProbabilityForChoice(
  choice: UnifiedBetChoice,
  probabilities: NormalizedProbabilities | null,
  source: SourceView,
  line?: number,
): number {
  if (!probabilities) {
    return 0;
  }

  switch (choice) {
    case 'V1':
      return probabilities.V1;
    case 'DRAW':
      return probabilities.X;
    case 'V2':
      return probabilities.V2;
    case '1X':
      return probabilities.V1 + probabilities.X;
    case '12':
      return probabilities.V1 + probabilities.V2;
    case '2X':
      return probabilities.V2 + probabilities.X;
    case 'OVER': {
      const progress = source.boardFilled / 9;
      const lineBias = line !== undefined ? clamp(0.54 - line * 0.06, 0.06, 0.22) : 0.12;
      return clamp(0.34 + progress * 0.46 + lineBias, 0.08, 0.92);
    }
    case 'UNDER': {
      const over = calculateProbabilityForChoice('OVER', probabilities, source, line);
      return clamp(1 - over, 0.08, 0.92);
    }
    case 'HANDICAP_V1':
      return clamp(probabilities.V1 + Math.min(0.18, source.advantage * 0.6), 0.08, 0.92);
    case 'HANDICAP_V2':
      return clamp(probabilities.V2 + Math.min(0.18, source.advantage * 0.6), 0.08, 0.92);
    default:
      return 0;
  }
}

function buildSignal(params: {
  source: SourceView;
  marketType: UnifiedBetMarketType;
  choice: UnifiedBetChoice;
  label: string;
  odds?: number;
  line?: number;
  probability: number;
  confidence: number;
  riskLevel: UnifiedBetSignal['riskLevel'];
  reason: string;
}): UnifiedBetSignal {
  const source = params.source;
  return {
    marketType: params.marketType,
    roundScope: source.roundScope,
    roundNumber: source.roundNumber,
    roundLabel: source.roundLabel,
    source: source.source,
    choice: params.choice,
    label: params.label,
    odds: params.odds,
    line: params.line,
    probability: Math.min(99, Math.round(params.probability * 100)),
    confidence: Math.min(99, Math.round(params.confidence)),
    valueScore: 0,
    riskLevel: params.riskLevel,
    reason: params.reason,
    state: source.state,
  };
}

export function calculateValueScore(signal: UnifiedBetSignal) {
  if (signal.state === 'FINISHED') {
    return -100;
  }

  const riskPenalty = signal.riskLevel === 'LOW' ? 0 : signal.riskLevel === 'MEDIUM' ? 8 : 18;
  const uncertaintyPenalty = signal.state === 'PREMATCH' ? 10 : signal.state === 'LIVE' ? 4 : 100;

  if (typeof signal.odds !== 'number' || !Number.isFinite(signal.odds) || signal.odds <= 0) {
    return signal.probability * 0.2 + signal.confidence * 0.15 - riskPenalty - uncertaintyPenalty - 20;
  }

  const impliedProbability = 1 / signal.odds;
  const edge = signal.probability / 100 - impliedProbability;
  const edgePenalty = edge < 0 ? Math.abs(edge) * 120 : 0;

  return edge * 100 + signal.confidence * 0.4 - riskPenalty - uncertaintyPenalty - edgePenalty;
}

function assignBestChoice(
  entries: RawMarketEntry[],
  expected: Record<'1X' | '12' | '2X', number>,
  choices: Array<'1X' | '12' | '2X'>,
) {
  if (entries.length !== choices.length) {
    return new Map<UnifiedBetChoice, RawMarketEntry>();
  }

  const permutations = (items: RawMarketEntry[]): RawMarketEntry[][] => {
    if (items.length <= 1) {
      return [items];
    }

    const result: RawMarketEntry[][] = [];
    items.forEach((item, index) => {
      const remaining = [...items.slice(0, index), ...items.slice(index + 1)];
      permutations(remaining).forEach((tail) => {
        result.push([item, ...tail]);
      });
    });
    return result;
  };

  let bestScore = Infinity;
  let bestMapping = new Map<'1X' | '12' | '2X', RawMarketEntry>();

  permutations(entries).forEach((perm) => {
    let total = 0;
    perm.forEach((entry, index) => {
      const choice = choices[index];
      const implied = 1 / entry.price;
      total += Math.abs(implied - expected[choice]);
    });

    if (total < bestScore) {
      bestScore = total;
      bestMapping = new Map(choices.map((choice, index) => [choice, perm[index]] as const));
    }
  });

  return bestMapping;
}

function buildSignalsForSource(match: TicTacToeMatch, source: SourceView, activeMarkets: RawMarketEntry[]) {
  const signals: UnifiedBetSignal[] = [];
  const probabilities = source.probabilities;
  const baseMarkets = activeMarkets.filter((entry) => classifyMarket(entry) !== 'UNKNOWN');

  const oneXTwoEntry = baseMarkets.filter((entry) => classifyMarket(entry) === 'MATCH_1X2' && source.source === 'MATCH');
  const roundOneXTwo = baseMarkets.filter((entry) => classifyMarket(entry) === 'ROUND_1_1X2' && source.source !== 'MATCH');
  const oneXTwoCandidates = source.source === 'MATCH' ? oneXTwoEntry : roundOneXTwo;

  if (probabilities && source.state !== 'FINISHED') {
    const marketType = getOneXTwoMarketType(source);
    const choice = source.prediction === 'ATTENDRE' ? 'ATTENDRE' : source.prediction === 'X' ? 'DRAW' : source.prediction;
    const oddsKey = choice === 'DRAW' ? 'X' : choice === 'V1' || choice === 'V2' ? choice : null;
    const marketEntry = oneXTwoCandidates.find((entry) => getChoiceForMarket(entry) === choice);

    if (choice !== 'ATTENDRE') {
      signals.push(
        buildSignal({
          source,
          marketType,
          choice,
          label: `${getChoiceLabel(choice)} — ${source.roundLabel}`,
          odds: marketEntry?.price ?? (oddsKey ? source.odds?.[oddsKey] ?? undefined : undefined),
          probability: calculateProbabilityForChoice(choice, probabilities, source),
          confidence: source.confidence,
          riskLevel: normalizeRiskLevel(source.riskLevel),
          reason: source.reason,
        }),
      );
    }

    const drawLow = probabilities.X <= 0.25;
    const vClose = Math.abs(probabilities.V1 - probabilities.V2) <= 0.08;
    const dcChoice: UnifiedBetChoice | null =
      source.prediction === 'V1' && source.riskLevel !== 'HIGH'
        ? '1X'
        : source.prediction === 'V2' && source.riskLevel !== 'HIGH'
          ? '2X'
          : vClose && drawLow
            ? '12'
            : null;

    if (dcChoice) {
      const doubleChanceEntries = baseMarkets.filter((entry) => classifyMarket(entry) === 'DOUBLE_CHANCE');
      const expected = {
        '1X': probabilities.V1 + probabilities.X,
        '12': probabilities.V1 + probabilities.V2,
        '2X': probabilities.V2 + probabilities.X,
      } as const;
      const assigned = assignBestChoice(doubleChanceEntries, expected, ['1X', '12', '2X']);
      const entry = assigned.get(dcChoice);
      const probability = calculateProbabilityForChoice(dcChoice, probabilities, source);
      const confidence = source.confidence - (dcChoice === '12' ? 3 : 0);

      signals.push(
        buildSignal({
          source,
          marketType: 'DOUBLE_CHANCE',
          choice: dcChoice,
          label: `Double chance ${dcChoice} — ${source.roundLabel}`,
          odds: entry?.price,
          probability,
          confidence,
          riskLevel: source.riskLevel === 'HIGH' ? 'MEDIUM' : normalizeRiskLevel(source.riskLevel),
          reason:
            dcChoice === '12'
              ? 'V1 et V2 sont proches, le nul est moins dominant et la couverture est plus prudente.'
              : 'Le signal principal reste lisible, la double chance protège le scénario le plus plausible.',
        }),
      );
    }

    const handicapEntries = baseMarkets.filter((entry) => classifyMarket(entry) === 'HANDICAP');
    if (source.confidence >= 60 && source.state !== 'PREMATCH' && Math.abs(probabilities.V1 - probabilities.V2) >= 0.15) {
      const choice: UnifiedBetChoice = probabilities.V1 >= probabilities.V2 ? 'HANDICAP_V1' : 'HANDICAP_V2';
      const handicapEntry = handicapEntries.find((entry) =>
        choice === 'HANDICAP_V1' ? entry.t === 7 : entry.t === 8,
      );
      const handicapLine = handicapEntry?.p !== null && handicapEntry?.p !== undefined ? Math.abs(handicapEntry.p) : undefined;
      signals.push(
        buildSignal({
          source,
          marketType: 'HANDICAP',
          choice,
          label: `${getChoiceLabel(choice)} — ${source.roundLabel}`,
          odds: handicapEntry?.price,
          line: handicapLine,
          probability: calculateProbabilityForChoice(choice, probabilities, source, handicapLine),
          confidence: Math.min(95, source.confidence + 4),
          riskLevel: normalizeRiskLevel(source.riskLevel === 'LOW' ? 'LOW' : 'MEDIUM'),
          reason: 'Avantage clair et grille suffisamment avancée pour envisager un handicap.',
        }),
      );
    }

    const totalEntries = baseMarkets.filter((entry) => classifyMarket(entry) === 'TOTAL');
    const totalGroups = new Map<string, RawMarketEntry[]>();
    totalEntries.forEach((entry) => {
      const key = `${entry.g ?? 0}|${entry.p ?? 0}`;
      const list = totalGroups.get(key) ?? [];
      list.push(entry);
      totalGroups.set(key, list);
    });

    totalGroups.forEach((group) => {
      if (group.length < 2) {
        return;
      }

      const line = group[0].p !== null ? Math.abs(group[0].p) : undefined;
      const overProbability = calculateProbabilityForChoice('OVER', probabilities, source, line);
      const underProbability = 1 - overProbability;
      const choice: UnifiedBetChoice = overProbability >= underProbability ? 'OVER' : 'UNDER';
      const entry = group.find((item) => getChoiceForMarket(item) === choice);
      const confidence = Math.min(92, Math.round(Math.abs(overProbability - underProbability) * 100 + source.confidence * 0.35));
      const totalRiskLevel: UnifiedBetSignal['riskLevel'] =
        source.state === 'LIVE' && line !== undefined && line <= 1.5 && overProbability > 0.7
          ? 'HIGH'
          : source.riskLevel === 'LOW'
            ? 'LOW'
            : 'MEDIUM';

      if (confidence >= 45) {
        signals.push(
          buildSignal({
            source,
            marketType: 'TOTAL',
            choice,
            label: `${choice === 'OVER' ? 'Plus de' : 'Moins de'} ${formatNumber(line ?? 0)} — ${source.roundLabel}`,
            odds: entry?.price,
            line,
            probability: choice === 'OVER' ? overProbability : underProbability,
            confidence,
            riskLevel: totalRiskLevel,
            reason:
              choice === 'OVER'
                ? 'La progression du match laisse davantage de place à une issue au-dessus de la ligne.'
                : 'Le rythme du match et la ligne disponible favorisent la prudence sur le total.',
          }),
        );
      }
    });
  }

  return signals;
}

function buildFallbackSignal(source: SourceView): UnifiedBetSignal {
  return buildSignal({
    source,
    marketType: 'UNKNOWN',
    choice: 'ATTENDRE',
    label: `ATTENDRE — ${source.roundLabel}`,
    probability: 0,
    confidence: source.confidence,
    riskLevel: normalizeRiskLevel(source.riskLevel),
    reason: 'Aucun signal exploitable pour ce marché.',
  });
}

export function selectBestUnifiedBet(signals: UnifiedBetSignal[]) {
  const ranked = signals
    .filter((signal) => signal.state !== 'FINISHED')
    .filter((signal) => signal.choice !== 'ATTENDRE')
    .filter((signal) => typeof signal.odds === 'number' && Number.isFinite(signal.odds))
    .filter((signal) => signal.confidence >= 45)
    .map((signal) => ({
      ...signal,
      valueScore: calculateValueScore(signal),
    }))
    .filter((signal) => signal.valueScore >= 0)
    .sort((a, b) => {
      if (b.valueScore !== a.valueScore) {
        return b.valueScore - a.valueScore;
      }

      const riskWeight = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
      if (riskWeight[a.riskLevel] !== riskWeight[b.riskLevel]) {
        return riskWeight[a.riskLevel] - riskWeight[b.riskLevel];
      }

      return b.confidence - a.confidence;
    });

  const best = ranked[0];
  if (!best) {
    const fallbackSource: SourceView = {
      source: 'MATCH',
      roundScope: 'MATCH',
      roundNumber: 0,
      roundLabel: 'Match global',
      state: 'PREMATCH',
      board: [],
      boardStatus: 'EMPTY',
      probabilities: null,
      prediction: 'ATTENDRE',
      confidence: 0,
      riskLevel: 'HIGH',
      reason: 'Aucun signal disponible.',
      odds: null,
      boardFilled: 0,
      advantage: 0,
    };

    return {
      bestSignal: buildFallbackSignal(fallbackSource),
      alternatives: [],
      globalRisk: 'HIGH',
      recommendation: 'ATTENDRE',
      summary: 'Aucun signal exploitable.',
      disclaimer: DISCLAIMER,
    } satisfies UnifiedBetPrediction;
  }

  const alternatives = ranked.slice(1, 4);
  const globalRisk: UnifiedBetPrediction['globalRisk'] =
    best.riskLevel === 'HIGH' || alternatives.some((signal) => signal.riskLevel === 'HIGH')
      ? 'HIGH'
      : best.riskLevel === 'MEDIUM' || alternatives.some((signal) => signal.riskLevel === 'MEDIUM')
        ? 'MEDIUM'
        : 'LOW';

  const recommendation: UnifiedBetPrediction['recommendation'] =
    best.valueScore < 6 ? 'JOUER_FAIBLE' : best.valueScore < 12 ? 'JOUER_PRUDENT' : globalRisk === 'HIGH' ? 'MARCHE_DANGEREUX' : 'JOUER_PRUDENT';

  const summary = `${best.label} — ${best.roundLabel} : ${best.choice} avec ${formatPercent(best.probability)} de probabilité estimée et ${formatNumber(best.valueScore)} de value score.`;

  return {
    bestSignal: best,
    alternatives,
    globalRisk,
    recommendation,
    summary,
    disclaimer: DISCLAIMER,
  } satisfies UnifiedBetPrediction;
}

export function buildUnifiedBetPrediction(match: TicTacToeMatch): UnifiedBetPrediction {
  const sources = ['MATCH', 'ROUND_1', 'ROUND_2', 'ROUND_3'] as const;
  const sourceViews: SourceView[] = sources.map((source) =>
    getRoundView(match, source),
  );
  const activeMarkets = getActiveMarkets(match);
  const signals = sourceViews.flatMap((source) => buildSignalsForSource(match, source, activeMarkets));

  if (signals.length === 0) {
    signals.push(...sourceViews.map((source) => buildFallbackSignal(source)));
  }

  const selected = selectBestUnifiedBet(signals);

  return {
    ...selected,
    disclaimer: DISCLAIMER,
  };
}
