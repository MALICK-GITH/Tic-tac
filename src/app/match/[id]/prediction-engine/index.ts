import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import { antiOverconfidenceGuard, capConfidence, deriveRiskLevel } from './confidence';
import type {
  BoardAnalysis,
  MatchLike,
  NormalizedProbabilities,
  OddsLine,
  PredictionDebug,
  PredictionMode,
  PredictionOutcome,
  PredictionResult,
  RoundWinner,
  RiskFlag,
} from './types';

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function toCells(boardString: string) {
  return boardString
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
    .slice(0, 9);
}

function getRawGame(game: MatchLike) {
  return game.raw as MatchLike['raw'] & {
    SC?: {
      I?: string;
      SLS?: string;
      FS?: { S1?: number; S2?: number };
      S?: Array<{ Value?: string }>;
    };
    E?: Array<{ C?: number; G?: number; P?: number; T?: number; B?: boolean }>;
    F?: boolean;
    GNS?: boolean;
    HS?: number;
    S?: number;
  };
}

export function parseBoards(game: MatchLike) {
  const raw = getRawGame(game);
  const source = raw.SC?.S?.[0]?.Value ?? '';

  return source
    .split(';')
    .map((board) => toCells(board))
    .filter((board) => board.length === 9);
}

export function analyzeBoard(board: number[]): BoardAnalysis {
  const cells = board.slice(0, 9);
  while (cells.length < 9) {
    cells.push(0);
  }

  const filledCells = cells.filter((value) => value !== 0).length;

  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (cells[a] !== 0 && cells[a] === cells[b] && cells[b] === cells[c]) {
      return {
        roundIndex: 0,
        boardString: cells.join(','),
        cells,
        status: 'WIN',
        winner: cells[a] === 1 ? 'V1' : 'V2',
        line: [...line],
        filledCells,
      };
    }
  }

  if (filledCells === 0) {
    return {
      roundIndex: 0,
      boardString: cells.join(','),
      cells,
      status: 'EMPTY',
      winner: null,
      line: null,
      filledCells,
    };
  }

  if (cells.every((value) => value !== 0)) {
    return {
      roundIndex: 0,
      boardString: cells.join(','),
      cells,
      status: 'DRAW',
      winner: 'X',
      line: null,
      filledCells,
    };
  }

  return {
    roundIndex: 0,
    boardString: cells.join(','),
    cells,
    status: 'LIVE',
    winner: null,
    line: null,
    filledCells,
  };
}

export function getRoundWinners(boardAnalyses: BoardAnalysis[]) {
  return boardAnalyses.map<RoundWinner>((analysis, index) => ({
    roundIndex: index + 1,
    analysis: {
      ...analysis,
      roundIndex: index + 1,
    },
    winner:
      analysis.status === 'WIN'
        ? (analysis.winner ?? 'ATTENDRE')
        : analysis.status === 'DRAW'
          ? 'X'
          : 'ATTENDRE',
  }));
}

export function getGameWinner(roundWinners: RoundWinner[]): PredictionOutcome {
  const resolved = roundWinners.filter((round) => round.analysis.status !== 'EMPTY');
  const v1Wins = roundWinners.filter((round) => round.winner === 'V1').length;
  const v2Wins = roundWinners.filter((round) => round.winner === 'V2').length;
  const drawCount = roundWinners.filter((round) => round.winner === 'X').length;

  if (v1Wins >= 2 && v1Wins > v2Wins) {
    return 'V1';
  }

  if (v2Wins >= 2 && v2Wins > v1Wins) {
    return 'V2';
  }

  if (resolved.length === 3) {
    if (v1Wins > v2Wins) return 'V1';
    if (v2Wins > v1Wins) return 'V2';
    if (drawCount > 0) return 'X';
  }

  return 'ATTENDRE';
}

function checkWinner(board: number[]): PredictionOutcome | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
      return board[a] === 1 ? 'V1' : 'V2';
    }
  }

  if (!board.includes(0)) {
    return 'X';
  }

  return null;
}

function nextPlayer(board: number[]) {
  const countV1 = board.filter((value) => value === 1).length;
  const countV2 = board.filter((value) => value === 2).length;
  return countV1 <= countV2 ? 1 : 2;
}

function minimax(
  board: number[],
  player: 1 | 2,
  memo = new Map<string, { score: number; bestMoves: number[] }>(),
) {
  const key = `${board.join(',')}|${player}`;
  const cached = memo.get(key);
  if (cached) {
    return cached;
  }

  const terminal = checkWinner(board);
  if (terminal === 'V1') {
    const result = { score: 1, bestMoves: [] };
    memo.set(key, result);
    return result;
  }

  if (terminal === 'V2') {
    const result = { score: -1, bestMoves: [] };
    memo.set(key, result);
    return result;
  }

  if (terminal === 'X') {
    const result = { score: 0, bestMoves: [] };
    memo.set(key, result);
    return result;
  }

  let bestScore = player === 1 ? -Infinity : Infinity;
  let bestMoves: number[] = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== 0) continue;

    const nextBoard = board.slice();
    nextBoard[index] = player;
    const outcome = minimax(nextBoard, player === 1 ? 2 : 1, memo);

    if (
      (player === 1 && outcome.score > bestScore) ||
      (player === 2 && outcome.score < bestScore)
    ) {
      bestScore = outcome.score;
      bestMoves = [index];
    } else if (outcome.score === bestScore) {
      bestMoves.push(index);
    }
  }

  const result = { score: bestScore, bestMoves };
  memo.set(key, result);
  return result;
}

function enumerateOptimalOutcomes(
  board: number[],
  player: 1 | 2,
  memo = new Map<string, PredictionOutcome[]>(),
) {
  const key = `${board.join(',')}|${player}`;
  const cached = memo.get(key);
  if (cached) {
    return cached;
  }

  const terminal = checkWinner(board);
  if (terminal) {
    const result = [terminal];
    memo.set(key, result);
    return result;
  }

  const best = minimax(board, player);
  const outcomes: PredictionOutcome[] = [];

  for (const move of best.bestMoves) {
    const nextBoard = board.slice();
    nextBoard[move] = player;
    outcomes.push(...enumerateOptimalOutcomes(nextBoard, player === 1 ? 2 : 1, memo));
  }

  memo.set(key, outcomes);
  return outcomes;
}

function noVigProb(oddV1?: number | null, oddX?: number | null, oddV2?: number | null) {
  if (
    typeof oddV1 !== 'number' ||
    typeof oddX !== 'number' ||
    typeof oddV2 !== 'number' ||
    !Number.isFinite(oddV1) ||
    !Number.isFinite(oddX) ||
    !Number.isFinite(oddV2) ||
    oddV1 <= 0 ||
    oddX <= 0 ||
    oddV2 <= 0
  ) {
    return null;
  }

  const rawV1 = 1 / oddV1;
  const rawX = 1 / oddX;
  const rawV2 = 1 / oddV2;
  const total = rawV1 + rawX + rawV2;

  if (total === 0) {
    return null;
  }

  return {
    V1: rawV1 / total,
    X: rawX / total,
    V2: rawV2 / total,
  };
}

function extractOddsFromGame(game: MatchLike): OddsLine | null {
  const raw = getRawGame(game);
  const lines = raw.E ?? [];
  const v1 = lines.find((line) => line.T === 1 && typeof line.C === 'number')?.C ?? null;
  const x = lines.find((line) => line.T === 2 && typeof line.C === 'number')?.C ?? null;
  const v2 = lines.find((line) => line.T === 3 && typeof line.C === 'number')?.C ?? null;

  if (v1 === null && x === null && v2 === null) {
    return null;
  }

  return { V1: v1, X: x, V2: v2 };
}

function getBookmakerMargin(odds: OddsLine | null) {
  if (!odds) {
    return null;
  }

  const probs = noVigProb(odds.V1, odds.X, odds.V2);
  if (!probs) {
    return null;
  }

  return Math.max(0, (1 / (odds.V1 ?? 1) + 1 / (odds.X ?? 1) + 1 / (odds.V2 ?? 1)) - 1);
}

function buildRiskFlagsForOdds(odds: OddsLine | null, probabilities: NormalizedProbabilities | null) {
  const flags: RiskFlag[] = [];

  if (!odds) {
    flags.push('NO_ODDS');
    return flags;
  }

  const margin = getBookmakerMargin(odds);
  if (margin !== null && margin > 0.08) {
    flags.push('HIGH_BOOKMAKER_MARGIN');
  }

  if (odds.V1 !== null && odds.V2 !== null && Math.abs(odds.V1 - odds.V2) <= 0.08) {
    flags.push('BALANCED_MARKET');
  }

  if (probabilities && probabilities.X >= 0.3) {
    flags.push('BALANCED_MARKET');
  }

  return [...new Set(flags)];
}

function boardPhase(emptyCells: number): PredictionMode {
  if (emptyCells >= 6) return 'LIVE_OPENING';
  if (emptyCells >= 3) return 'LIVE_MIDGAME';
  return 'LIVE_ENDGAME';
}

function buildProbabilitiesFromOptimalOutcomes(outcomes: PredictionOutcome[]): NormalizedProbabilities {
  const total = outcomes.length || 1;
  const counts = {
    V1: outcomes.filter((value) => value === 'V1').length / total,
    X: outcomes.filter((value) => value === 'X').length / total,
    V2: outcomes.filter((value) => value === 'V2').length / total,
  };

  return counts;
}

export function analyzeLiveBoard(board: number[], odds: OddsLine | null = null): PredictionResult {
  const terminal = checkWinner(board);
  const emptyCells = board.filter((value) => value === 0).length;

  if (terminal) {
    const probabilities: NormalizedProbabilities = {
      V1: terminal === 'V1' ? 1 : 0,
      X: terminal === 'X' ? 1 : 0,
      V2: terminal === 'V2' ? 1 : 0,
    };

    const result: PredictionResult = {
      mode: 'CONFIRMED',
      prediction: terminal,
      probabilities,
      confidence: 95,
      reason: 'Résultat confirmé par les règles Tic-Tac-Toe.',
      riskLevel: 'LOW',
      disclaimer: 'Signal probabiliste. Lecture informative uniquement.',
      debug: {
        gameId: 0,
        matchId: null,
        boardCount: 1,
        validBoardCount: 1,
        lastBoard: board.slice(0, 9),
        bestMove: null,
        minimaxOutcome: terminal,
        bookmakerMargin: getBookmakerMargin(odds),
        noVigProbabilities: noVigProb(odds?.V1, odds?.X, odds?.V2),
        riskFlags: ['CONFIRMED_RESULT'],
        phase: 'CONFIRMED',
      },
    };

    return antiOverconfidenceGuard(result);
  }

  const player = nextPlayer(board) as 1 | 2;
  const outcomeTree = enumerateOptimalOutcomes(board, player);
  const probabilities = buildProbabilitiesFromOptimalOutcomes(outcomeTree);
  const prediction = (Object.entries(probabilities) as Array<['V1' | 'X' | 'V2', number]>)
    .sort((a, b) => b[1] - a[1])[0][0];
  const phase = boardPhase(emptyCells);
  const riskFlags: RiskFlag[] = [
    ...buildRiskFlagsForOdds(odds, probabilities),
    phase === 'LIVE_OPENING' ? 'EARLY_PHASE' : phase === 'LIVE_MIDGAME' ? 'MID_PHASE' : 'END_PHASE',
  ];
  const rawConfidence = Math.round((probabilities[prediction] ?? 0) * 100);
  const confidence = capConfidence(phase, rawConfidence, { riskFlags });

  const result: PredictionResult = {
    mode: phase,
    prediction,
    probabilities,
    confidence,
    reason: 'Analyse live basee sur les regles et le minimax.',
    riskLevel: deriveRiskLevel(phase, confidence, riskFlags),
    disclaimer: 'Signal probabiliste. Lecture informative uniquement.',
    debug: {
      gameId: 0,
      matchId: null,
      boardCount: 1,
      validBoardCount: 1,
      lastBoard: board.slice(0, 9),
      bestMove: minimax(board, player).bestMoves[0] ?? null,
      minimaxOutcome: prediction,
      bookmakerMargin: getBookmakerMargin(odds),
      noVigProbabilities: noVigProb(odds?.V1, odds?.X, odds?.V2),
      riskFlags,
      phase,
    },
  };

  return antiOverconfidenceGuard(result);
}

export function predictPrematch(odds: OddsLine | null): PredictionResult {
  if (!odds) {
    const result: PredictionResult = {
      mode: 'PREMATCH',
      prediction: 'ATTENDRE',
      probabilities: null,
      confidence: 35,
      reason: 'Aucune cote exploitable.',
      riskLevel: 'HIGH',
      disclaimer: 'Signal probabiliste. Lecture informative uniquement.',
      debug: {
        gameId: 0,
        matchId: null,
        boardCount: 0,
        validBoardCount: 0,
        lastBoard: null,
        bestMove: null,
        minimaxOutcome: null,
        bookmakerMargin: null,
        noVigProbabilities: null,
        riskFlags: ['NO_ODDS'],
        phase: 'PREMATCH',
      },
    };

    return antiOverconfidenceGuard(result);
  }

  const probabilities = noVigProb(odds.V1, odds.X, odds.V2);
  if (!probabilities) {
    return predictPrematch(null);
  }

  const prediction = (Object.entries(probabilities) as Array<['V1' | 'X' | 'V2', number]>)
    .sort((a, b) => b[1] - a[1])[0][0];
  const riskFlags = buildRiskFlagsForOdds(odds, probabilities);
  const rawConfidence = Math.round((probabilities[prediction] ?? 0) * 100);
  const confidence = capConfidence('PREMATCH', rawConfidence, { riskFlags });

  const result: PredictionResult = {
    mode: 'PREMATCH',
    prediction,
    probabilities,
    confidence,
    reason: 'Analyse pré-match basée uniquement sur les cotes no-vig.',
    riskLevel: deriveRiskLevel('PREMATCH', confidence, riskFlags),
    disclaimer: 'Signal probabiliste. Lecture informative uniquement.',
    debug: {
      gameId: 0,
      matchId: null,
      boardCount: 0,
      validBoardCount: 0,
      lastBoard: null,
      bestMove: null,
      minimaxOutcome: null,
      bookmakerMargin: getBookmakerMargin(odds),
      noVigProbabilities: probabilities,
      riskFlags,
      phase: 'PREMATCH',
    },
  };

  return antiOverconfidenceGuard(result);
}

export function predictTicTacToe(game: TicTacToeMatch, odds: OddsLine | null = null) {
  const raw = getRawGame(game);
  const boards = parseBoards(game);
  const validBoards = boards.filter((board) => board.length === 9);
  const lastBoard = validBoards.length > 0 ? validBoards[validBoards.length - 1] : null;
  const inputOdds = odds ?? extractOddsFromGame(game);

  let prediction: PredictionResult;

  if (lastBoard) {
    prediction = analyzeLiveBoard(lastBoard, inputOdds);
  } else {
    prediction = predictPrematch(inputOdds);
  }

  const debug: PredictionDebug = {
    ...prediction.debug,
    gameId: typeof raw.I === 'number' ? raw.I : 0,
    matchId: raw.DI ?? null,
    boardCount: boards.length,
    validBoardCount: validBoards.length,
    lastBoard,
    bookmakerMargin: getBookmakerMargin(inputOdds),
    noVigProbabilities: inputOdds ? noVigProb(inputOdds.V1, inputOdds.X, inputOdds.V2) : null,
    phase: prediction.mode,
  };

  const finalResult = antiOverconfidenceGuard({
    ...prediction,
    debug,
    disclaimer: 'Signal probabiliste. Lecture informative uniquement.',
  });

  return {
    ...finalResult,
    probabilities: finalResult.probabilities,
    riskLevel: finalResult.riskLevel,
    disclaimer: finalResult.disclaimer,
    debug: finalResult.debug,
    mode: finalResult.mode,
    prediction: finalResult.prediction,
    confidence: finalResult.confidence,
    reason: finalResult.reason,
  };
}

export function extractOddsFromMatch(game: TicTacToeMatch) {
  return extractOddsFromGame(game);
}
