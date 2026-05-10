import type { PredictionMode, PredictionOutcome, PredictionResult } from './types';

const CONFIDENCE_CAPS: Record<PredictionMode, number> = {
  PREMATCH: 53,
  LIVE_OPENING: 60,
  LIVE_MIDGAME: 72,
  LIVE_ENDGAME: 85,
  CONFIRMED: 95,
  UNKNOWN: 53,
};

const FORBIDDEN_REASON_PATTERNS: Array<[RegExp, string]> = [
  [/\b100\s*%\b/gi, '95%'],
  [/\bgaranti(?:e|es|s)?\b/gi, 'indicatif'],
  [/\bcertain(?:e|es|s)?\b/gi, 'probabiliste'],
  [/\bassur[ée]?(?:e|es|s)?\b/gi, 'probabiliste'],
  [/\binfaillible\b/gi, 'prudent'],
  [/\bs[uû]r(?:e|es|s)?\b/gi, 'prudent'],
];

function sanitizeReason(reason: string) {
  return FORBIDDEN_REASON_PATTERNS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    reason,
  );
}

export function capConfidence(
  mode: PredictionMode,
  rawConfidence: number,
  context?: { riskFlags?: string[] },
) {
  const cap = CONFIDENCE_CAPS[mode] ?? CONFIDENCE_CAPS.UNKNOWN;
  const riskPenalty = context?.riskFlags?.length ? Math.min(context.riskFlags.length * 2, 10) : 0;
  const normalized = Math.max(0, Math.min(cap, Math.round(rawConfidence - riskPenalty)));

  return normalized >= 100 ? cap : normalized;
}

export function antiOverconfidenceGuard(prediction: PredictionResult) {
  const confidence = Math.min(95, Math.max(0, Math.round(prediction.confidence)));
  const capped = capConfidence(prediction.mode, confidence);

  return {
    ...prediction,
    confidence: capped,
    reason: sanitizeReason(prediction.reason),
    disclaimer: sanitizeReason(prediction.disclaimer),
  };
}

export function deriveRiskLevel(
  mode: PredictionMode,
  confidence: number,
  riskFlags: string[],
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (mode === 'CONFIRMED') {
    return 'LOW';
  }

  if (riskFlags.includes('HIGH_BOOKMAKER_MARGIN')) {
    return 'HIGH';
  }

  if (confidence >= 75) {
    return 'LOW';
  }

  if (confidence >= 60) {
    return 'MEDIUM';
  }

  if (confidence >= 45) {
    return 'HIGH';
  }

  return 'CRITICAL';
}

export function normalizeOutcomeLabel(outcome: PredictionOutcome) {
  switch (outcome) {
    case 'V1':
      return 'Victoire Croisillons';
    case 'V2':
      return 'Victoire Ronds';
    case 'X':
      return 'Match nul';
    default:
      return 'ATTENDRE';
  }
}
