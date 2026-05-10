import type { NormalizedProbabilities, PredictionSample } from './types';

type ResultRow = {
  winner: 'V1' | 'X' | 'V2';
};

type CalibrationBucket = {
  bucket: string;
  samples: number;
  meanConfidence: number;
  accuracy: number;
};

function oneHot(result: ResultRow['winner']) {
  return {
    V1: result === 'V1' ? 1 : 0,
    X: result === 'X' ? 1 : 0,
    V2: result === 'V2' ? 1 : 0,
  };
}

export function brierScore(
  predictions: Array<{ probabilities: NormalizedProbabilities | null }>,
  results: ResultRow[],
) {
  const total = Math.min(predictions.length, results.length);

  if (total === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < total; index += 1) {
    const probabilities = predictions[index].probabilities ?? { V1: 0, X: 0, V2: 0 };
    const actual = oneHot(results[index].winner);

    sum +=
      (probabilities.V1 - actual.V1) ** 2 +
      (probabilities.X - actual.X) ** 2 +
      (probabilities.V2 - actual.V2) ** 2;
  }

  return sum / total;
}

export function calibrationBuckets(
  predictions: Array<{ confidence: number; probabilities: NormalizedProbabilities | null; prediction: string }>,
  results: ResultRow[],
): CalibrationBucket[] {
  const buckets = new Map<string, { samples: number; hits: number; confidenceSum: number }>();
  const total = Math.min(predictions.length, results.length);

  for (let index = 0; index < total; index += 1) {
    const sample = predictions[index];
    const actual = results[index].winner;
    const bucketStart = Math.floor(sample.confidence / 10) * 10;
    const bucketEnd = Math.min(bucketStart + 9, 95);
    const key = `${bucketStart}-${bucketEnd}`;
    const current = buckets.get(key) ?? { samples: 0, hits: 0, confidenceSum: 0 };

    current.samples += 1;
    current.confidenceSum += sample.confidence;
    if (sample.prediction === actual) {
      current.hits += 1;
    }

    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .sort((a, b) => Number(a[0].split('-')[0]) - Number(b[0].split('-')[0]))
    .map(([bucket, value]) => ({
      bucket,
      samples: value.samples,
      meanConfidence: Math.round(value.confidenceSum / value.samples),
      accuracy: Math.round((value.hits / value.samples) * 100),
    }));
}

export function predictionAuditLog(
  prediction: PredictionSample['prediction'],
  result: PredictionSample['result'],
) {
  return {
    timestamp: new Date().toISOString(),
    mode: prediction.mode,
    predicted: prediction.prediction,
    actual: result.winner,
    confidence: prediction.confidence,
    correct: prediction.prediction === result.winner,
    riskLevel: prediction.riskLevel,
    probabilities: prediction.probabilities,
    disclaimer: prediction.disclaimer,
  };
}
