import type { TicTacToeMatch } from '@/lib/tictactoe-data';

export type PredictionMode =
  | 'PREMATCH'
  | 'LIVE_OPENING'
  | 'LIVE_MIDGAME'
  | 'LIVE_ENDGAME'
  | 'CONFIRMED'
  | 'UNKNOWN';

export type PredictionOutcome = 'V1' | 'X' | 'V2' | 'ATTENDRE';

export type OddsLine = {
  V1: number | null;
  X: number | null;
  V2: number | null;
};

export type NormalizedProbabilities = {
  V1: number;
  X: number;
  V2: number;
};

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskFlag =
  | 'NO_ODDS'
  | 'NO_BOARD'
  | 'HIGH_BOOKMAKER_MARGIN'
  | 'BALANCED_MARKET'
  | 'EARLY_PHASE'
  | 'MID_PHASE'
  | 'END_PHASE'
  | 'CONFIRMED_RESULT';

export type BoardStatus = 'EMPTY' | 'LIVE' | 'WIN' | 'DRAW';

export type BoardAnalysis = {
  roundIndex: number;
  boardString: string;
  cells: number[];
  status: BoardStatus;
  winner: 'V1' | 'V2' | 'X' | null;
  line: number[] | null;
  filledCells: number;
};

export type RoundWinner = {
  roundIndex: number;
  analysis: BoardAnalysis;
  winner: PredictionOutcome;
};

export type PredictionDebug = {
  gameId: number;
  matchId: string | number | null;
  boardCount: number;
  validBoardCount: number;
  lastBoard: number[] | null;
  bestMove: number | null;
  minimaxOutcome: PredictionOutcome | null;
  bookmakerMargin: number | null;
  noVigProbabilities: NormalizedProbabilities | null;
  riskFlags: RiskFlag[];
  phase: PredictionMode;
};

export type PredictionResult = {
  mode: PredictionMode;
  prediction: PredictionOutcome;
  probabilities: NormalizedProbabilities | null;
  confidence: number;
  reason: string;
  riskLevel: RiskLevel;
  disclaimer: string;
  debug: PredictionDebug;
};

export type PredictionSample = {
  prediction: PredictionResult;
  result: {
    winner: Exclude<PredictionOutcome, 'ATTENDRE'>;
  };
};

export type MatchLike = TicTacToeMatch;
