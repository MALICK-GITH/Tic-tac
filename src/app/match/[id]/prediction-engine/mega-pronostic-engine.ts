import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import { analyzeBoard, analyzeLiveBoard, extractOddsFromMatch, parseBoards, predictPrematch, predictTicTacToe } from './index';
import { buildUnifiedBetPrediction } from './unified-bet-engine';
import type {
  MegaPronostic,
  MegaPronosticAction,
  MegaPronosticChoice,
  MegaPronosticSource,
  PredictionOutcome,
  UnifiedBetSignal,
} from './types';

type MegaCandidate = {
  source: MegaPronosticSource;
  finalChoice: MegaPronosticChoice;
  label: string;
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
  _boardStatus?: string;
  _roundNumber?: 0 | 1 | 2 | 3;
  _prediction?: unknown;
  _sourceCandidate?: unknown;
  _unified?: unknown;
};

const DISCLAIMER: MegaPronostic['disclaimer'] = 'Analyse mathématique probabiliste — aucun gain garanti.';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
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

function getRoundLabel(index: 0 | 1 | 2 | 3) {
  if (index === 1) return '1 round';
  if (index === 2) return '2 round';
  if (index === 3) return '3 round';
  return 'Match global';
}

function getChoiceLabel(choice: MegaPronosticChoice) {
  switch (choice) {
    case 'V1':
      return 'V1';
    case 'DRAW':
      return 'DRAW';
    case 'V2':
      return 'V2';
    case '1X':
      return '1X';
    case '12':
      return '12';
    case '2X':
      return '2X';
    case 'OVER':
      return 'OVER';
    case 'UNDER':
      return 'UNDER';
    case 'HANDICAP_V1':
      return 'HANDICAP_V1';
    case 'HANDICAP_V2':
      return 'HANDICAP_V2';
    default:
      return 'ATTENDRE';
  }
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

function getRoundCandidates(match: TicTacToeMatch): MegaCandidate[] {
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
    const valueScore = confidence * 0.4 + topTwoMargin(probabilityMap) * 0.5 - (state === 'PREMATCH' ? 10 : state === 'LIVE' ? 4 : 100);
    const margin = topTwoMargin(probabilityMap);
    const choice = mapOutcome(livePrediction.prediction);
    const oddsValue = getMatchingOdds(odds, choice);

    return {
      source: `ROUND_${roundNumber}` as MegaPronosticSource,
      finalChoice: choice,
      label:
        choice === 'ATTENDRE'
          ? `ATTENDRE — ${getRoundLabel(roundNumber)}`
          : `${getChoiceLabel(choice)} — ${getRoundLabel(roundNumber)}`,
      roundLabel: getRoundLabel(roundNumber),
      confidence,
      probability,
      valueScore,
      masterMargin: margin,
      riskLevel: livePrediction.riskLevel === 'CRITICAL' ? 'HIGH' : livePrediction.riskLevel,
      state,
      reason: livePrediction.reason,
      odds: oddsValue,
      choiceFamily: getChoiceFamily(choice),
      _boardStatus: analysis.status,
      _roundNumber: roundNumber,
      _prediction: livePrediction,
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

  return {
    source: 'MATCH' as const,
    finalChoice: choice,
    label:
      choice === 'ATTENDRE'
        ? 'ATTENDRE — Match global'
        : `${getChoiceLabel(choice)} — Match global`,
    roundLabel: 'Match global' as const,
    confidence: prediction.confidence,
    probability,
    valueScore: prediction.confidence * 0.35 + margin * 0.45,
    masterMargin: margin,
    riskLevel: prediction.riskLevel === 'CRITICAL' ? 'HIGH' : prediction.riskLevel,
    state: getState(prediction.mode),
    reason: prediction.reason,
    odds: getMatchingOdds(odds, choice),
    choiceFamily: getChoiceFamily(choice),
    _prediction: prediction,
  };
}

function getUnifiedCandidate(match: TicTacToeMatch): MegaCandidate {
  const unified = buildUnifiedBetPrediction(match);
  const best = unified.bestSignal;
  const choice = best.choice === 'ATTENDRE' ? 'ATTENDRE' : best.choice as MegaPronosticChoice;
  const family = getChoiceFamily(choice);
  const roundNumber = best.roundNumber as 0 | 1 | 2 | 3;
  const roundLabel = best.roundLabel;
  const odds = best.odds;

  return {
    source: 'UNIFIED_BET' as const,
    finalChoice: choice,
    label:
      choice === 'ATTENDRE'
        ? `ATTENDRE — ${roundLabel}`
        : `${best.label} — ${roundLabel}`,
    roundLabel,
    confidence: best.confidence,
    probability: best.probability,
    valueScore: best.valueScore,
    masterMargin: Math.max(0, best.valueScore * 0.25),
    riskLevel: best.riskLevel,
    state: best.state,
    reason: best.reason,
    odds,
    choiceFamily: family,
    _roundNumber: roundNumber,
    _unified: unified,
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
      source: 'MASTER' as const,
      finalChoice: 'ATTENDRE' as const,
      label: 'Favori mathématique détecté : aucun signal clair',
      roundLabel: 'Match global' as const,
      confidence: matchCandidate.confidence,
      probability: matchCandidate.probability,
      valueScore: 0,
      masterMargin: 0,
      riskLevel: 'HIGH' as const,
      state: matchCandidate.state,
      reason: 'Aucun round clair ne se détache.',
      odds: undefined,
      choiceFamily: 'UNKNOWN' as const,
      _sourceCandidate: null,
    };
  }

  return {
    source: 'MASTER' as const,
    finalChoice: best.finalChoice,
    label:
      best.finalChoice === 'ATTENDRE'
        ? `Favori mathématique détecté : ${best.label}`
        : `${best.label}`,
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
    _sourceCandidate: best,
  };
}

function toMegaPronostic(candidate: ReturnType<typeof getMatchCandidate> | ReturnType<typeof getUnifiedCandidate> | ReturnType<typeof buildMasterCandidate> | ReturnType<typeof getRoundCandidates>[number], megaScore: number, action: MegaPronosticAction): MegaPronostic {
  const label =
    candidate.finalChoice === 'ATTENDRE'
      ? candidate.label
      : `${candidate.label}`;

  return {
    finalChoice: candidate.finalChoice,
    label,
    source: candidate.source,
    roundLabel: candidate.roundLabel,
    confidence: Math.min(99, Math.round(candidate.confidence)),
    probability: Math.min(99, Math.round(candidate.probability)),
    valueScore: Number(candidate.valueScore.toFixed(1)),
    masterMargin: Number(candidate.masterMargin.toFixed(1)),
    riskLevel: candidate.riskLevel,
    state: candidate.state,
    reason: candidate.reason,
    action,
    odds: candidate.odds,
    disclaimer: DISCLAIMER,
    megaScore: Number(megaScore.toFixed(1)),
  };
}

export function buildMegaPronostic(match: TicTacToeMatch): MegaPronostic {
  const matchCandidate = getMatchCandidate(match);
  const roundCandidates = getRoundCandidates(match);
  const unifiedCandidate = getUnifiedCandidate(match);
  const masterCandidate = buildMasterCandidate(matchCandidate, roundCandidates);
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
      label: bestRound.finalChoice === 'ATTENDRE'
        ? `Favori mathématique détecté : ${bestRound.label}`
        : `Favori mathématique détecté : ${bestRound.label}`,
      source: bestRound.source,
      roundLabel: bestRound.roundLabel,
      confidence: Math.min(99, Math.round(bestRound.confidence)),
      probability: Math.min(99, Math.round(bestRound.probability)),
      valueScore: Number(bestRound.valueScore.toFixed(1)),
      masterMargin: Number(bestRound.masterMargin.toFixed(1)),
      riskLevel: bestRound.riskLevel,
      state: bestRound.state,
      reason: 'Aucun round clair ne se détache encore.',
      action: 'ATTENDRE',
      odds: bestRound.odds,
      disclaimer: DISCLAIMER,
      megaScore: 0,
    };
  }

  const scored = candidates
    .filter((candidate) => candidate.finalChoice !== 'ATTENDRE')
    .filter((candidate) => typeof candidate.odds === 'number' && Number.isFinite(candidate.odds))
    .filter((candidate) => candidate.state !== 'FINISHED')
    .map((candidate) => {
      const riskPenalty = getRiskPenalty(candidate.riskLevel);
      const statePenalty = getStatePenalty(candidate.state);
      const megaScore =
        candidate.valueScore +
        candidate.masterMargin +
        candidate.confidence * 0.3 +
        candidate.probability * 20 -
        riskPenalty -
        statePenalty;

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
    const fallback = matchCandidate;
    return {
      finalChoice: 'ATTENDRE',
      label: `Favori mathématique détecté : ${fallback.label}`,
      source: fallback.source,
      roundLabel: fallback.roundLabel,
      confidence: Math.min(99, Math.round(fallback.confidence)),
      probability: Math.min(99, Math.round(fallback.probability)),
      valueScore: Number(fallback.valueScore.toFixed(1)),
      masterMargin: Number(fallback.masterMargin.toFixed(1)),
      riskLevel: fallback.riskLevel,
      state: fallback.state,
      reason: 'Aucun signal exploitable.',
      action: 'ATTENDRE',
      odds: fallback.odds,
      disclaimer: DISCLAIMER,
      megaScore: 0,
    };
  }

  if (best.riskLevel === 'HIGH' && best.megaScore < 70) {
    return {
      finalChoice: 'ATTENDRE',
      label: `Favori mathématique détecté : ${best.label}`,
      source: best.source,
      roundLabel: best.roundLabel,
      confidence: Math.min(99, Math.round(best.confidence)),
      probability: Math.min(99, Math.round(best.probability)),
      valueScore: Number(best.valueScore.toFixed(1)),
      masterMargin: Number(best.masterMargin.toFixed(1)),
      riskLevel: best.riskLevel,
      state: best.state,
      reason: 'Risque élevé et score insuffisant pour recommander un pari.',
      action: 'ATTENDRE',
      odds: best.odds,
      disclaimer: DISCLAIMER,
      megaScore: Number(best.megaScore.toFixed(1)),
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
  const label =
    finalChoice === 'ATTENDRE'
      ? `Favori mathématique détecté : ${best.label}`
      : `${best.label}`;

  return toMegaPronostic(
    {
      ...best,
      finalChoice,
      label,
    },
    best.megaScore,
    action,
  );
}

export function MegaPronosticEngine(match: TicTacToeMatch): MegaPronostic {
  return buildMegaPronostic(match);
}
