import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import {
  analyzeBoard,
  analyzeLiveBoard,
  extractOddsFromMatch,
  getGameWinner,
  getRoundWinners,
  parseBoards,
  predictPrematch,
  predictTicTacToe,
} from './index';
import { buildUnifiedBetPrediction } from './unified-bet-engine';
import { brierScore } from './scoring';
import type {
  MegaPronostic,
  MegaPronosticAction,
  MegaPronosticChoice,
  MegaPronosticDebug,
  MegaPronosticSource,
  MegaPronosticDebug as MegaPronosticDebugType,
  MegaPronosticRoundView,
  PredictionOutcome,
  PredictionResult,
  UnifiedBetSignal,
} from './types';

type MegaCandidate = {
  source: MegaPronosticSource;
  finalChoice: MegaPronosticChoice;
  label: string;
  marketLabel: string;
  roundLabel: MegaPronostic['roundLabel'];
  confidence: number;
  probability: number;
  valueScore: number;
  masterMargin: number;
  riskLevel: MegaPronostic['riskLevel'];
  state: MegaPronostic['state'];
  reason: string;
  odds?: number;
  megaScore?: number;
  choiceFamily: 'MATCH_1X2' | 'DOUBLE_CHANCE' | 'TOTAL' | 'HANDICAP' | 'UNKNOWN';
  roundScope: 'MATCH' | 'ROUND_1' | 'ROUND_2' | 'ROUND_3';
  roundNumber: 0 | 1 | 2 | 3;
  sourceTab: 'MATCH' | 'ROUND 1' | 'ROUND 2' | 'ROUND 3';
  prediction?: PredictionResult;
  unified?: ReturnType<typeof buildUnifiedBetPrediction>;
  boardStatus?: string;
};

const DISCLAIMER: MegaPronostic['disclaimer'] = 'Analyse mathématique probabiliste — aucun gain garanti.';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getState(mode: string): MegaPronostic['state'] {
  if (mode === 'CONFIRMED') {
    return 'FINISHED';
  }

  if (mode.startsWith('LIVE')) {
    return 'LIVE';
  }

  return 'PREMATCH';
}

function getDisplayMode(state: MegaPronostic['state']): MegaPronosticDebug['displayMode'] {
  if (state === 'FINISHED') {
    return 'FINISHED';
  }

  if (state === 'LIVE') {
    return 'LIVE';
  }

  return 'PREMATCH';
}

function getRoundLabel(index: 0 | 1 | 2 | 3) {
  if (index === 1) return '1 round';
  if (index === 2) return '2 round';
  if (index === 3) return '3 round';
  return 'Match global';
}

function getMarketLabel(choiceFamily: MegaCandidate['choiceFamily']) {
  if (choiceFamily === 'MATCH_1X2') return '1X2';
  if (choiceFamily === 'DOUBLE_CHANCE') return 'Double chance';
  if (choiceFamily === 'TOTAL') return 'Total';
  if (choiceFamily === 'HANDICAP') return 'Handicap';
  return 'Inconnu';
}

function getChoiceFamily(choice: MegaPronosticChoice): MegaCandidate['choiceFamily'] {
  if (choice === 'V1' || choice === 'DRAW' || choice === 'V2') return 'MATCH_1X2';
  if (choice === '1X' || choice === '12' || choice === '2X') return 'DOUBLE_CHANCE';
  if (choice === 'OVER' || choice === 'UNDER') return 'TOTAL';
  if (choice === 'HANDICAP_V1' || choice === 'HANDICAP_V2') return 'HANDICAP';
  return 'UNKNOWN';
}

function getRiskPenalty(risk: MegaPronostic['riskLevel']) {
  if (risk === 'LOW') return 0;
  if (risk === 'MEDIUM') return 10;
  return 25;
}

function getStatePenalty(state: MegaPronostic['state']) {
  if (state === 'PREMATCH') return 12;
  if (state === 'LIVE') return 4;
  return 100;
}

function mapOutcome(outcome: PredictionOutcome): MegaPronosticChoice {
  if (outcome === 'V1') return 'V1';
  if (outcome === 'V2') return 'V2';
  if (outcome === 'X') return 'DRAW';
  return 'ATTENDRE';
}

function topTwoMargin(probabilityMap: { V1: number; X: number; V2: number } | null) {
  if (!probabilityMap) {
    return 0;
  }

  const sorted = [probabilityMap.V1, probabilityMap.X, probabilityMap.V2].sort((a, b) => b - a);
  return clamp((sorted[0] ?? 0) - (sorted[1] ?? 0), 0, 1) * 100;
}

function getMatchingOdds(odds: { V1: number | null; X: number | null; V2: number | null } | null, choice: MegaPronosticChoice) {
  if (!odds) return undefined;

  switch (choice) {
    case 'V1':
      return odds.V1 ?? undefined;
    case 'DRAW':
      return odds.X ?? undefined;
    case 'V2':
      return odds.V2 ?? undefined;
    default:
      return undefined;
  }
}

function getVisibleLabel(choice: MegaPronosticChoice, roundLabel: MegaPronostic['roundLabel'], isWaiting: boolean) {
  if (!isWaiting) {
    return `${choice} — ${roundLabel}`;
  }

  if (choice === 'V1') return 'V1 / Crosses';
  if (choice === 'V2') return 'V2 / Rounds';
  if (choice === 'DRAW') return 'DRAW / Match global';
  return `${choice} / ${roundLabel}`;
}

function getWaitingLabel(choice: MegaPronosticChoice) {
  if (choice === 'V2') return 'V2 / Rounds';
  if (choice === 'DRAW') return 'DRAW / Match global';
  return 'V1 / Crosses';
}

function getThreats(cells: number[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const threats = new Set<string>();

  lines.forEach((line) => {
    const values = line.map((index) => cells[index] ?? 0);
    const v1Count = values.filter((value) => value === 1).length;
    const v2Count = values.filter((value) => value === 2).length;
    const emptyCount = values.filter((value) => value === 0).length;

    if (v1Count === 2 && emptyCount === 1) {
      threats.add(`Menace V1 sur ${line.map((index) => index + 1).join('-')}`);
    }

    if (v2Count === 2 && emptyCount === 1) {
      threats.add(`Menace V2 sur ${line.map((index) => index + 1).join('-')}`);
    }
  });

  if (threats.size === 0) {
    threats.add('Aucune menace immédiate');
  }

  return [...threats];
}

function getRoundViews(match: TicTacToeMatch): MegaPronosticRoundView[] {
  const odds = extractOddsFromMatch(match);
  const boards = parseBoards(match);

  return Array.from({ length: 3 }, (_, index) => {
    const roundNumber = (index + 1) as 1 | 2 | 3;
    const board = boards[index] ?? Array.from({ length: 9 }, () => 0);
    const analysis = analyzeBoard(board);
    const livePrediction = analysis.status === 'EMPTY' ? predictPrematch(odds) : analyzeLiveBoard(board, odds);
    const state = getState(livePrediction.mode);
    const probabilityMap = livePrediction.probabilities;
    const probability = probabilityMap ? Math.max(probabilityMap.V1, probabilityMap.X, probabilityMap.V2) * 100 : 0;
    const confidence = livePrediction.confidence;
    const margin = topTwoMargin(probabilityMap);
    const choice = mapOutcome(livePrediction.prediction);
    const oddsValue = getMatchingOdds(odds, choice);

    return {
      roundIndex: roundNumber,
      state,
      board,
      stateLabel: state,
      oddsText: odds
        ? `V1 ${odds.V1 ?? '—'} · X ${odds.X ?? '—'} · V2 ${odds.V2 ?? '—'}`
        : '—',
      probabilities: probabilityMap,
      prediction: livePrediction.prediction,
      minimaxOutcome: livePrediction.debug.minimaxOutcome,
      confidence,
      safetyMargin: margin,
      riskLevel: livePrediction.riskLevel === 'CRITICAL' ? 'HIGH' : livePrediction.riskLevel,
      reason: livePrediction.reason,
      threats: getThreats(board),
      remainingCells: board
        .map((value, cellIndex) => ({ value, cellIndex }))
        .filter((cell) => cell.value === 0)
        .map((cell) => String(cell.cellIndex + 1)),
      continuations: board
        .map((value, cellIndex) => ({ value, cellIndex }))
        .filter((cell) => cell.value === 0)
        .map((cell) => `Case ${cell.cellIndex + 1}`),
      chosenOdds:
        livePrediction.prediction !== 'ATTENDRE' && oddsValue !== undefined ? oddsValue.toFixed(2) : '—',
    };
  });
}

function getMatchCandidate(match: TicTacToeMatch): MegaCandidate {
  const prediction = predictTicTacToe(match);
  const probabilityMap = prediction.probabilities;
  const choice = mapOutcome(prediction.prediction);
  const odds = extractOddsFromMatch(match);
  const probability = probabilityMap ? Math.max(probabilityMap.V1, probabilityMap.X, probabilityMap.V2) * 100 : 0;
  const margin = topTwoMargin(probabilityMap);
  const choiceFamily = getChoiceFamily(choice);

  return {
    source: 'MATCH',
    finalChoice: choice,
    label: choice === 'ATTENDRE' ? 'V1 / Crosses' : `${choice} — Match global`,
    marketLabel: getMarketLabel(choiceFamily),
    roundLabel: 'Match global',
    confidence: prediction.confidence,
    probability,
    valueScore: prediction.confidence * 0.35 + margin * 0.45,
    masterMargin: margin,
    riskLevel: prediction.riskLevel === 'CRITICAL' ? 'HIGH' : prediction.riskLevel,
    state: getState(prediction.mode),
    reason: prediction.reason,
    odds: getMatchingOdds(odds, choice),
    choiceFamily,
    roundScope: 'MATCH',
    roundNumber: 0,
    sourceTab: 'MATCH',
    prediction,
  };
}

function getRoundCandidate(match: TicTacToeMatch, roundIndex: 1 | 2 | 3): MegaCandidate {
  const odds = extractOddsFromMatch(match);
  const boards = parseBoards(match);
  const board = boards[roundIndex - 1] ?? Array.from({ length: 9 }, () => 0);
  const analysis = analyzeBoard(board);
  const livePrediction = analysis.status === 'EMPTY' ? predictPrematch(odds) : analyzeLiveBoard(board, odds);
  const probabilityMap = livePrediction.probabilities;
  const choice = mapOutcome(livePrediction.prediction);
  const probability = probabilityMap ? Math.max(probabilityMap.V1, probabilityMap.X, probabilityMap.V2) * 100 : 0;
  const margin = topTwoMargin(probabilityMap);
  const choiceFamily = getChoiceFamily(choice);
  const state = getState(livePrediction.mode);

  return {
    source: `ROUND_${roundIndex}` as MegaPronosticSource,
    finalChoice: choice,
    label: choice === 'ATTENDRE' ? getVisibleLabel(choice, getRoundLabel(roundIndex), true) : `${choice} — ${getRoundLabel(roundIndex)}`,
    marketLabel: getMarketLabel(choiceFamily),
    roundLabel: getRoundLabel(roundIndex),
    confidence: livePrediction.confidence,
    probability,
    valueScore: livePrediction.confidence * 0.4 + margin * 0.5 - (state === 'PREMATCH' ? 10 : state === 'LIVE' ? 4 : 100),
    masterMargin: margin,
    riskLevel: livePrediction.riskLevel === 'CRITICAL' ? 'HIGH' : livePrediction.riskLevel,
    state,
    reason: livePrediction.reason,
    odds: getMatchingOdds(odds, choice),
    choiceFamily,
    roundScope: `ROUND_${roundIndex}`,
    roundNumber: roundIndex,
    sourceTab: `ROUND ${roundIndex}`,
    prediction: livePrediction,
    boardStatus: analysis.status,
  };
}

function getUnifiedCandidate(match: TicTacToeMatch): MegaCandidate {
  const unified = buildUnifiedBetPrediction(match);
  const best = unified.bestSignal;
  const choice = best.choice === 'ATTENDRE' ? 'ATTENDRE' : (best.choice as MegaPronosticChoice);
  const choiceFamily = getChoiceFamily(choice);

  return {
    source: 'UNIFIED_BET',
    finalChoice: choice,
    label: choice === 'ATTENDRE' ? 'V1 / Crosses' : `${best.choice} — ${best.roundLabel}`,
    marketLabel: getMarketLabel(choiceFamily),
    roundLabel: best.roundLabel,
    confidence: best.confidence,
    probability: best.probability,
    valueScore: best.valueScore,
    masterMargin: Math.max(0, best.valueScore * 0.25),
    riskLevel: best.riskLevel,
    state: best.state,
    reason: best.reason,
    odds: best.odds,
    choiceFamily,
    roundScope: best.roundScope,
    roundNumber: best.roundNumber,
    sourceTab: best.roundScope === 'MATCH' ? 'MATCH' : `ROUND ${best.roundNumber}` as 'ROUND 1' | 'ROUND 2' | 'ROUND 3',
    unified,
  };
}

function buildMasterCandidate(matchCandidate: MegaCandidate, roundCandidates: MegaCandidate[]): MegaCandidate {
  const pool = [matchCandidate, ...roundCandidates].filter((candidate) => candidate.finalChoice !== 'ATTENDRE' && candidate.odds !== undefined);
  const best = pool
    .slice()
    .sort((a, b) => {
      const left = a.masterMargin + a.confidence * 0.35;
      const right = b.masterMargin + b.confidence * 0.35;
      return right - left;
    })[0];

  if (!best) {
    return {
      source: 'MASTER',
      finalChoice: 'ATTENDRE',
      label: 'Favori detecte : V1 / Crosses',
      marketLabel: '1X2',
      roundLabel: 'Match global',
      confidence: matchCandidate.confidence,
      probability: matchCandidate.probability,
      valueScore: 0,
      masterMargin: 0,
      riskLevel: 'HIGH',
      state: matchCandidate.state,
      reason: 'Aucun round clair ne se detache.',
      odds: undefined,
      choiceFamily: 'UNKNOWN',
      roundScope: 'MATCH',
      roundNumber: 0,
      sourceTab: 'MATCH',
    };
  }

  const visibleLabel = best.finalChoice === 'ATTENDRE' ? getVisibleLabel(best.finalChoice, best.roundLabel, true) : `${best.finalChoice} — ${best.roundLabel}`;

  return {
    source: 'MASTER',
    finalChoice: best.finalChoice,
    label: visibleLabel,
    marketLabel: best.marketLabel,
    roundLabel: best.roundLabel,
    confidence: best.confidence,
    probability: best.probability,
    valueScore: best.valueScore + best.masterMargin * 0.5,
    masterMargin: best.masterMargin,
    riskLevel: best.riskLevel,
    state: best.state,
    reason: best.reason,
    odds: best.odds,
    choiceFamily: best.choiceFamily,
    roundScope: best.roundScope,
    roundNumber: best.roundNumber,
    sourceTab: best.sourceTab,
  };
}

function computeActualWinner(match: TicTacToeMatch): PredictionOutcome {
  const boards = parseBoards(match);
  const analyses = boards.map((board) => analyzeBoard(board));
  const roundWinners = getRoundWinners(analyses);
  const winner = getGameWinner(roundWinners);

  if (winner !== 'ATTENDRE') {
    return winner;
  }

  const raw = match.raw as TicTacToeMatch['raw'] & {
    SC?: { FS?: { S1?: number; S2?: number } };
  };
  const s1 = raw.SC?.FS?.S1 ?? 0;
  const s2 = raw.SC?.FS?.S2 ?? 0;

  if (s1 > s2) return 'V1';
  if (s2 > s1) return 'V2';
  return 'X';
}

function computeCalibration(allMatches: TicTacToeMatch[], currentMatchId: number) {
  const finishedMatches = allMatches.filter((item) => item.id !== currentMatchId && computeActualWinner(item) !== 'ATTENDRE');
  const samples = finishedMatches.slice(-20).map((item) => {
    const odds = extractOddsFromMatch(item);
    const prematch = predictPrematch(odds);
    return {
      prediction: prematch,
      result: {
        winner: computeActualWinner(item) as Exclude<PredictionOutcome, 'ATTENDRE'>,
      },
    };
  });

  const buckets = new Map<
    string,
    {
      samples: number;
      hits: number;
      confidenceSum: number;
    }
  >();

  samples.forEach((sample) => {
    const bucketStart = Math.floor(sample.prediction.confidence / 10) * 10;
    const bucketEnd = Math.min(bucketStart + 9, 95);
    const key = `${bucketStart}-${bucketEnd}`;
    const current = buckets.get(key) ?? { samples: 0, hits: 0, confidenceSum: 0 };

    current.samples += 1;
    current.confidenceSum += sample.prediction.confidence;
    if (sample.prediction.prediction === sample.result.winner) {
      current.hits += 1;
    }

    buckets.set(key, current);
  });

  const rows = [...buckets.entries()]
    .sort((a, b) => Number(a[0].split('-')[0]) - Number(b[0].split('-')[0]))
    .map(([bucket, value]) => {
      const expectedHits = (value.samples * value.confidenceSum) / (value.samples * 100);
      const chiSquareContribution = expectedHits > 0 ? ((value.hits - expectedHits) ** 2) / expectedHits : 0;

      return {
        bucket,
        samples: value.samples,
        hits: value.hits,
        meanConfidence: Math.round(value.confidenceSum / value.samples),
        expectedHits,
        chiSquareContribution,
      };
    });

  return {
    brierScore: samples.length
      ? brierScore(
          samples.map((sample) => sample.prediction),
          samples.map((sample) => sample.result),
        )
      : 0,
    chiSquare: rows.reduce((sum, row) => sum + row.chiSquareContribution, 0),
    degreesOfFreedom: Math.max(rows.length - 1, 0),
    sampleCount: samples.length,
    rows,
  } satisfies MegaPronosticDebugType['calibration'];
}

function getRiskFlags(prediction: PredictionResult) {
  return prediction.debug.riskFlags;
}

function buildMegaDebug(
  match: TicTacToeMatch,
  matchCandidate: MegaCandidate,
  roundCandidates: MegaCandidate[],
  unifiedPrediction: ReturnType<typeof buildUnifiedBetPrediction>,
  masterCandidate: MegaCandidate,
  allMatches: TicTacToeMatch[],
): MegaPronosticDebug {
  const prediction = matchCandidate.prediction ?? predictTicTacToe(match);
  const roundViews = getRoundViews(match);
  const finalWinner = computeActualWinner(match);
  const displayMode = getDisplayMode(matchCandidate.state);
  const odds = extractOddsFromMatch(match);
  const calibration = computeCalibration(allMatches.length > 0 ? allMatches : [match], match.id);

  return {
    prediction,
    displayMode,
    riskFlags: getRiskFlags(prediction),
    odds,
    lastBoard: prediction.debug.lastBoard,
    isLive: prediction.mode !== 'PREMATCH' && prediction.mode !== 'CONFIRMED',
    finalWinner,
    roundViews,
    matchSummary: {
      state: matchCandidate.state,
      roundScore: roundCandidates
        .map((candidate) => {
          if (candidate.finalChoice === 'V1') return 'V1';
          if (candidate.finalChoice === 'V2') return 'V2';
          if (candidate.finalChoice === 'DRAW') return 'X';
          return 'ATTENDRE';
        })
        .join(' / '),
      potentialWinner:
        finalWinner === 'V1' ? 'Victoire Croisillons' : finalWinner === 'V2' ? 'Victoire Ronds' : 'Match nul',
      overallStatus: displayMode,
      roundSummaries: roundCandidates.map((candidate) => ({
        roundIndex: candidate.roundNumber,
        state: candidate.state,
        choice: candidate.finalChoice,
        confidence: candidate.confidence,
        riskLevel: candidate.riskLevel,
        reason: candidate.reason,
      })),
    },
    unifiedPrediction,
    calibration,
    masterSignal: {
      choice: masterCandidate.label,
      source: masterCandidate.roundLabel,
      sourceTab: masterCandidate.sourceTab,
      confidence: masterCandidate.confidence,
      safetyMargin: Math.max(0, Math.round(masterCandidate.valueScore)),
      riskLevel: masterCandidate.riskLevel,
      reason: masterCandidate.reason,
      oddsText: typeof masterCandidate.odds === 'number' ? masterCandidate.odds.toFixed(2) : '—',
      state: masterCandidate.state,
      disclaimer: unifiedPrediction.disclaimer,
    },
  };
}

function toMegaPronostic(candidate: MegaCandidate, megaScore: number, action: MegaPronosticAction, debug: MegaPronosticDebug): MegaPronostic {
  return {
    finalChoice: candidate.finalChoice,
    label: candidate.label,
    marketLabel: candidate.marketLabel,
    source: candidate.source,
    roundLabel: candidate.roundLabel,
    confidence: Math.min(99, Math.round(candidate.confidence)),
    probability: Math.min(99, Math.round(candidate.probability)),
    valueScore: Number(candidate.valueScore.toFixed(1)),
    masterMargin: Number(candidate.masterMargin.toFixed(1)),
    megaScore: Number(megaScore.toFixed(1)),
    riskLevel: candidate.riskLevel,
    state: candidate.state,
    reason: candidate.reason,
    action,
    odds: candidate.odds,
    disclaimer: DISCLAIMER,
    debug,
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

export function buildMegaPronostic(match: TicTacToeMatch, allMatches: TicTacToeMatch[] = []): MegaPronostic {
  const matchCandidate = getMatchCandidate(match);
  const roundCandidates = [1, 2, 3].map((round) => getRoundCandidate(match, round as 1 | 2 | 3));
  const unifiedCandidate = getUnifiedCandidate(match);
  const masterCandidate = buildMasterCandidate(matchCandidate, roundCandidates);
  const debug = buildMegaDebug(
    match,
    matchCandidate,
    roundCandidates,
    unifiedCandidate.unified as ReturnType<typeof buildUnifiedBetPrediction>,
    masterCandidate,
    allMatches,
  );
  const candidates = [masterCandidate, unifiedCandidate, matchCandidate, ...roundCandidates];

  const roundClear = roundCandidates.some(
    (candidate) => candidate.finalChoice !== 'ATTENDRE' && candidate.odds !== undefined && candidate.state !== 'PREMATCH',
  );

  if (!roundClear) {
    const bestRound = roundCandidates
      .slice()
      .sort((a, b) => b.masterMargin + b.confidence * 0.35 - (a.masterMargin + a.confidence * 0.35))[0] ?? matchCandidate;

    return {
      finalChoice: 'ATTENDRE',
      label: getWaitingLabel(matchCandidate.finalChoice),
      marketLabel: bestRound.marketLabel,
      source: bestRound.source,
      roundLabel: bestRound.roundLabel,
      confidence: Math.min(99, Math.round(bestRound.confidence)),
      probability: Math.min(99, Math.round(bestRound.probability)),
      valueScore: Number(bestRound.valueScore.toFixed(1)),
      masterMargin: Number(bestRound.masterMargin.toFixed(1)),
      megaScore: 0,
      riskLevel: bestRound.riskLevel,
      state: bestRound.state,
      reason: 'Aucun round clair ne se detache encore.',
      action: 'ATTENDRE',
      odds: bestRound.odds,
      disclaimer: DISCLAIMER,
      debug,
    };
  }

  const scored = candidates
    .filter((candidate) => candidate.finalChoice !== 'ATTENDRE')
    .filter((candidate) => typeof candidate.odds === 'number' && Number.isFinite(candidate.odds))
    .filter((candidate) => candidate.state !== 'FINISHED')
    .map((candidate) => {
      const megaScore =
        candidate.valueScore +
        candidate.masterMargin +
        candidate.confidence * 0.3 +
        candidate.probability * 20 -
        getRiskPenalty(candidate.riskLevel) -
        getStatePenalty(candidate.state);

      return {
        ...candidate,
        megaScore,
      };
    })
    .sort((a, b) => {
      if (b.megaScore !== a.megaScore) {
        return b.megaScore - a.megaScore;
      }

      const riskWeight = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
      if (riskWeight[a.riskLevel] !== riskWeight[b.riskLevel]) {
        return riskWeight[a.riskLevel] - riskWeight[b.riskLevel];
      }

      return b.confidence - a.confidence;
    });

  const best = scored[0];
  if (!best) {
    return {
      finalChoice: 'ATTENDRE',
      label: getWaitingLabel(matchCandidate.finalChoice),
      marketLabel: '1X2',
      source: 'MATCH',
      roundLabel: 'Match global',
      confidence: Math.min(99, Math.round(matchCandidate.confidence)),
      probability: Math.min(99, Math.round(matchCandidate.probability)),
      valueScore: Number(matchCandidate.valueScore.toFixed(1)),
      masterMargin: Number(matchCandidate.masterMargin.toFixed(1)),
      megaScore: 0,
      riskLevel: matchCandidate.riskLevel,
      state: matchCandidate.state,
      reason: 'Aucun signal exploitable.',
      action: 'ATTENDRE',
      odds: matchCandidate.odds,
      disclaimer: DISCLAIMER,
      debug,
    };
  }

  if (best.riskLevel === 'HIGH' && best.megaScore < 70) {
    return {
      finalChoice: 'ATTENDRE',
      label: getWaitingLabel(matchCandidate.finalChoice),
      marketLabel: best.marketLabel,
      source: best.source,
      roundLabel: best.roundLabel,
      confidence: Math.min(99, Math.round(best.confidence)),
      probability: Math.min(99, Math.round(best.probability)),
      valueScore: Number(best.valueScore.toFixed(1)),
      masterMargin: Number(best.masterMargin.toFixed(1)),
      megaScore: Number(best.megaScore.toFixed(1)),
      riskLevel: best.riskLevel,
      state: best.state,
      reason: 'Risque eleve et score insuffisant pour recommander un pari.',
      action: 'ATTENDRE',
      odds: best.odds,
      disclaimer: DISCLAIMER,
      debug,
    };
  }

  let action: MegaPronosticAction = 'ATTENDRE';
  if (best.megaScore < 45) {
    action = 'ATTENDRE';
  } else if (best.megaScore <= 55) {
    action = 'SIGNAL_FAIBLE';
  } else if (best.megaScore <= 70) {
    action = 'SIGNAL_MOYEN';
  } else {
    action = 'SIGNAL_FORT';
  }

  const finalChoice = action === 'ATTENDRE' ? 'ATTENDRE' : best.finalChoice;
  const label = finalChoice === 'ATTENDRE' ? getVisibleLabel(best.finalChoice, best.roundLabel, true) : `${best.finalChoice} — ${best.roundLabel}`;

  return toMegaPronostic(
    {
      ...best,
      finalChoice,
      label,
    },
    best.megaScore,
    action,
    debug,
  );
}

export function MegaPronosticEngine(match: TicTacToeMatch, allMatches: TicTacToeMatch[] = []): MegaPronostic {
  return buildMegaPronostic(match, allMatches);
}
