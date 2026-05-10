import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import { analyzeBoard, analyzeLiveBoard, extractOddsFromMatch, getGameWinner, getRoundWinners, parseBoards, predictPrematch, predictTicTacToe } from './prediction-engine';
import { MegaPronosticEngine } from './prediction-engine/mega-pronostic-engine';
import { buildUnifiedBetPrediction } from './prediction-engine/unified-bet-engine';
import { brierScore } from './prediction-engine/scoring';
import type { PredictionOutcome } from './prediction-engine/types';
import { MegaPronosticPanel } from './mega-pronostic-panel';
import {
  MatchDashboardTabs,
  type DashboardMatchSummary,
  type DashboardRoundView,
  type DashboardState,
  type DashboardTab,
} from './match-dashboard-tabs';
import styles from './detail-prediction.module.css';

type DetailPredictionProps = {
  match: TicTacToeMatch;
  allMatches: TicTacToeMatch[];
};

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatScore(score?: { S1?: number; S2?: number }) {
  if (!score) {
    return '—';
  }

  return `${score.S1 ?? 0} - ${score.S2 ?? 0}`;
}

function formatTime(value?: number) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value * 1000));
}

function getCellLabel(value: number) {
  if (value === 1) return 'X';
  if (value === 2) return 'O';
  return '·';
}

function getCellClass(value: number, isHighlighted: boolean) {
  if (value === 1) {
    return `${styles.cell} ${styles.cellV1} ${isHighlighted ? styles.cellHighlight : ''}`;
  }

  if (value === 2) {
    return `${styles.cell} ${styles.cellV2} ${isHighlighted ? styles.cellHighlight : ''}`;
  }

  return `${styles.cell} ${styles.cellEmpty}`;
}

function getBoardOutcome(analysis: ReturnType<typeof analyzeBoard>) {
  if (analysis.status === 'WIN') {
    return analysis.winner === 'V1' ? 'V1' : 'V2';
  }

  if (analysis.status === 'DRAW') {
    return 'Nul';
  }

  if (analysis.status === 'LIVE') {
    return 'En cours';
  }

  return 'Vide';
}

function getActualWinner(match: TicTacToeMatch): PredictionOutcome {
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

function getWinnerLabel(winner: PredictionOutcome) {
  switch (winner) {
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

function getDisplayMode(mode: string) {
  if (mode === 'CONFIRMED') return 'CONFIRMED';
  if (mode.startsWith('LIVE')) return 'LIVE';
  return 'PREMATCH';
}

function getBookmakerMarginFromPrediction(prediction: ReturnType<typeof predictTicTacToe>) {
  const margin = prediction.debug.bookmakerMargin;
  if (typeof margin !== 'number') {
    return '—';
  }

  return `${Math.round(margin * 1000) / 10}%`;
}

function mapDashboardState(mode: string): DashboardState {
  if (mode === 'CONFIRMED') return 'FINISHED';
  if (mode.startsWith('LIVE')) return 'LIVE';
  return 'PREMATCH';
}

function formatOutcomeLabel(outcome: PredictionOutcome) {
  if (outcome === 'V1') return 'V1';
  if (outcome === 'V2') return 'V2';
  if (outcome === 'X') return 'X';
  return 'ATTENDRE';
}

function getSafetyMargin(probabilities: { V1: number; X: number; V2: number } | null) {
  if (!probabilities) {
    return 0;
  }

  const sorted = [probabilities.V1, probabilities.X, probabilities.V2].sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const runnerUp = sorted[1] ?? 0;

  return Math.round((top - runnerUp) * 100);
}

function getStateFromBoardStatus(status: ReturnType<typeof analyzeBoard>['status']): DashboardState {
  if (status === 'WIN' || status === 'DRAW') return 'FINISHED';
  if (status === 'LIVE') return 'LIVE';
  return 'PREMATCH';
}

function getRemainingCells(cells: number[]) {
  return cells
    .map((value, index) => ({ value, index }))
    .filter((cell) => cell.value === 0)
    .map((cell) => String(cell.index + 1));
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

function getContinuations(cells: number[]) {
  return getRemainingCells(cells).map((cell) => `Case ${cell}`);
}

function formatOddsText(odds: { V1: number | null; X: number | null; V2: number | null } | null) {
  if (!odds) {
    return '—';
  }

  const parts = (['V1', 'X', 'V2'] as const).map((key) => `${key} ${formatPrice(odds[key])}`);
  return parts.join(' · ');
}

function computeCalibrationChiSquare(
  samples: Array<{
    prediction: {
      confidence: number;
      prediction: PredictionOutcome;
    };
    result: {
      winner: Exclude<PredictionOutcome, 'ATTENDRE'>;
    };
  }>,
) {
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
      const chiSquareContribution =
        expectedHits > 0 ? ((value.hits - expectedHits) ** 2) / expectedHits : 0;

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
    chiSquare: rows.reduce((sum, row) => sum + row.chiSquareContribution, 0),
    degreesOfFreedom: Math.max(rows.length - 1, 0),
    rows,
  };
}

export function DetailPrediction({ match, allMatches }: DetailPredictionProps) {
  const prediction = predictTicTacToe(match);
  const raw = match.raw as TicTacToeMatch['raw'] & {
    SC?: {
      I?: string;
      SLS?: string;
      FS?: { S1?: number; S2?: number };
      S?: Array<{ Value?: string }>;
    };
    E?: Array<{ C?: number; G?: number; P?: number; T?: number; B?: boolean }>;
    I?: number;
    DI?: string;
    LI?: number;
    SI?: number;
    O1?: string;
    O2?: string;
    O1R?: string;
    O2R?: string;
    S?: number;
    CHIMG?: string;
  };

  const boards = parseBoards(match);
  const roundAnalyses = Array.from({ length: 3 }, (_, index) => {
    const board = boards[index] ?? Array.from({ length: 9 }, () => 0);
    return {
      ...analyzeBoard(board),
      roundIndex: index + 1,
    };
  });
  const finalWinner = getGameWinner(getRoundWinners(roundAnalyses));
  const lastBoard = prediction.debug.lastBoard;
  const isLive = prediction.mode !== 'PREMATCH' && prediction.mode !== 'CONFIRMED';
  const odds = extractOddsFromMatch(match);

  const roundViews: DashboardRoundView[] = roundAnalyses.map((analysis) => {
    const boardPrediction =
      analysis.status === 'EMPTY'
        ? predictPrematch(odds)
        : analyzeLiveBoard(analysis.cells, odds);
    const state = getStateFromBoardStatus(analysis.status);
    const safetyMargin = getSafetyMargin(boardPrediction.probabilities);
    const remainingCells = getRemainingCells(analysis.cells);

    return {
      tab: `ROUND ${analysis.roundIndex}` as DashboardTab,
      roundIndex: analysis.roundIndex,
      state,
      board: analysis.cells,
      stateLabel: state,
      oddsText: formatOddsText(odds),
      probabilities: boardPrediction.probabilities,
      prediction: boardPrediction.prediction,
      minimaxOutcome: boardPrediction.debug.minimaxOutcome,
      confidence: boardPrediction.confidence,
      safetyMargin,
      riskLevel: boardPrediction.riskLevel,
      reason: boardPrediction.reason,
      threats: getThreats(analysis.cells),
      remainingCells,
      continuations: getContinuations(analysis.cells),
      chosenOdds:
        boardPrediction.prediction !== 'ATTENDRE' && odds?.[boardPrediction.prediction] !== undefined
          ? formatPrice(odds[boardPrediction.prediction])
          : '—',
    };
  });

  const unifiedPrediction = buildUnifiedBetPrediction(match);
  const megaPronostic = MegaPronosticEngine(match);

  const matchSummary: DashboardMatchSummary = {
    state: mapDashboardState(prediction.mode),
    roundScore: roundAnalyses
      .map((analysis) => {
        if (analysis.status === 'WIN' && analysis.winner) return analysis.winner;
        if (analysis.status === 'DRAW') return 'X';
        return 'ATTENDRE';
      })
      .join(' / '),
    potentialWinner: getWinnerLabel(finalWinner),
    overallStatus: prediction.mode === 'CONFIRMED' ? 'FINISHED' : mapDashboardState(prediction.mode),
    roundSummaries: roundViews.map((round) => ({
      roundIndex: round.roundIndex,
      state: round.state,
      choice: formatOutcomeLabel(round.prediction),
      confidence: round.confidence,
      riskLevel: round.riskLevel,
      reason: round.reason,
    })),
  };

  const finishedMatches = allMatches.filter((item) => {
    const winner = getActualWinner(item);
    return winner !== 'ATTENDRE' && item.id !== match.id;
  });

  const calibrationSamples = finishedMatches.slice(-20).map((item) => {
    const odds = extractOddsFromMatch(item);
    const prematch = predictPrematch(odds);
    return {
      prediction: prematch,
      result: {
        winner: getActualWinner(item) as Exclude<PredictionOutcome, 'ATTENDRE'>,
      },
    };
  });

  const brier = calibrationSamples.length
    ? brierScore(
        calibrationSamples.map((sample) => sample.prediction),
        calibrationSamples.map((sample) => sample.result),
      )
    : 0;

  const chiSquareStats = calibrationSamples.length
    ? computeCalibrationChiSquare(calibrationSamples)
    : { chiSquare: 0, degreesOfFreedom: 0, rows: [] as Array<{
        bucket: string;
        samples: number;
        hits: number;
        meanConfidence: number;
        expectedHits: number;
        chiSquareContribution: number;
      }> };

  const probabilities = prediction.probabilities;
  const riskFlags = prediction.debug.riskFlags;
  const topChoice = prediction.prediction === 'ATTENDRE' ? null : getWinnerLabel(prediction.prediction);
  const disclaimer = prediction.disclaimer;
  const displayMode = getDisplayMode(prediction.mode);

  return (
    <div className={styles.detailRoot}>
      <MegaPronosticPanel pronostic={megaPronostic} />

      <details className={styles.advancedDetails}>
        <summary className={styles.advancedSummary}>Voir analyse avancée</summary>
        <div className={styles.advancedContent}>
          <div className={styles.layout}>
      <div className={styles.main}>
        <section className={`${styles.card} ${styles.hero}`}>
          <div className={styles.heroHeader}>
            <div>
              <span className="eyebrow">Tic-Tac-Toe / GetSportsShortZip</span>
              <h2 className={styles.heroTitle}>
                Dossier du match {raw.I ?? match.id}
              </h2>
              <p className={styles.heroSubtitle}>
                Signal probabiliste, lecture des grilles, marge bookmaker, risques détectés et
                résultat minimax pour les matchs en cours.
              </p>
            </div>
            <div className={styles.matchState}>
              <span className={styles.stateBadge}>{displayMode}</span>
              <span className={styles.stateHint}>{prediction.disclaimer}</span>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Match ID / DI</span>
              <div className={styles.metaValue}>
                {raw.I ?? match.id} / {raw.DI ?? match.roundId}
              </div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Etat</span>
              <div className={styles.metaValue}>{displayMode}</div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Temps restant</span>
              <div className={styles.metaValue}>{raw.SC?.SLS ?? '—'}</div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>V1</span>
              <div className={styles.metaValue}>Crosses</div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>V2</span>
              <div className={styles.metaValue}>Noughts</div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Score actuel</span>
              <div className={styles.metaValue}>{formatScore(raw.SC?.FS)}</div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaLabel}>Marge bookmaker</span>
              <div className={styles.metaValue}>{getBookmakerMarginFromPrediction(prediction)}</div>
            </div>
          </div>
        </section>

        <MatchDashboardTabs
          master={{
            choice: unifiedPrediction.bestSignal.label,
            source: unifiedPrediction.bestSignal.roundLabel,
            sourceTab: unifiedPrediction.bestSignal.roundScope === 'MATCH'
              ? 'MATCH'
              : unifiedPrediction.bestSignal.roundScope === 'ROUND_1'
                ? 'ROUND 1'
                  : unifiedPrediction.bestSignal.roundScope === 'ROUND_2'
                    ? 'ROUND 2'
                    : 'ROUND 3',
            confidence: unifiedPrediction.bestSignal.confidence,
            safetyMargin: Math.max(0, Math.round(unifiedPrediction.bestSignal.valueScore)),
            riskLevel: unifiedPrediction.bestSignal.riskLevel,
            reason: unifiedPrediction.bestSignal.reason,
            oddsText:
              typeof unifiedPrediction.bestSignal.odds === 'number'
                ? unifiedPrediction.bestSignal.odds.toFixed(2)
                : '—',
            state: unifiedPrediction.bestSignal.state,
            disclaimer: unifiedPrediction.disclaimer,
          }}
          matchSummary={matchSummary}
          rounds={roundViews}
          unifiedPrediction={unifiedPrediction}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Grilles 3x3</h3>
              <p>
                Lecture des rondes depuis `SC.S[0].Value` et résultat minimax pour la grille
                active.
              </p>
            </div>
            <span className={styles.mutedText}>
              Gagnant détecté: {getWinnerLabel(finalWinner)}
            </span>
          </div>

          <div className={styles.roundsGrid}>
            {roundAnalyses.map((analysis) => (
              <article key={`round-${analysis.roundIndex}`} className={styles.roundCard}>
                <div className={styles.roundTop}>
                  <div>
                    <h4 className={styles.roundTitle}>Round {analysis.roundIndex}</h4>
                    <div className={styles.roundMeta}>
                      {analysis.boardString ? 'Grille lue' : 'Pas encore disponible'}
                    </div>
                  </div>
                  <div className={styles.roundWinner}>{getBoardOutcome(analysis)}</div>
                </div>

                <div className={styles.board} aria-label={`Grille round ${analysis.roundIndex}`}>
                  {analysis.cells.map((cell, index) => (
                    <div
                      key={`${analysis.roundIndex}-${index}`}
                      className={getCellClass(cell, Boolean(analysis.line?.includes(index)))}
                    >
                      {getCellLabel(cell)}
                    </div>
                  ))}
                </div>

                <div className={styles.roundStatus}>
                  {analysis.status === 'WIN' && analysis.winner
                    ? `Victoire ${getWinnerLabel(analysis.winner)}`
                    : analysis.status === 'DRAW'
                      ? 'Match nul'
                      : analysis.status === 'LIVE'
                        ? 'Round en cours'
                        : 'Grille vide'}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionElevated}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Calibration</h3>
              <p>Les matchs terminés servent uniquement à mesurer la qualité du signal.</p>
            </div>
            <span className={styles.mutedText}>{calibrationSamples.length} échantillons</span>
          </div>

          <div className={styles.calibrationGrid}>
            <article className={`${styles.analysisCard} ${styles.calibrationSummaryCard}`}>
              <h4>Scores de calibration</h4>
              <div className={styles.metricGrid}>
                <div className={styles.metricTile}>
                  <span>Brier Score</span>
                  <strong>{brier.toFixed(3)}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Chi²</span>
                  <strong>{chiSquareStats.chiSquare.toFixed(2)}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>ddl</span>
                  <strong>{chiSquareStats.degreesOfFreedom}</strong>
                </div>
                <div className={styles.metricTile}>
                  <span>Échantillons</span>
                  <strong>{calibrationSamples.length}</strong>
                </div>
              </div>
              <p className={styles.calibrationNote}>
                Plus le chi² est bas, plus les buckets de confiance suivent les résultats observés.
              </p>
            </article>

            <article className={`${styles.analysisCard} ${styles.calibrationBucketsCard}`}>
              <div className={styles.calibrationBucketsHeader}>
                <h4>Bucket calibration</h4>
                <div className={styles.calibrationChip}>Confiance {prediction.confidence}%</div>
              </div>
              <div className={styles.calibrationBucketsList}>
                {chiSquareStats.rows.length > 0 ? (
                  chiSquareStats.rows.slice(0, 4).map((bucket) => (
                    <div className={styles.calibrationBucketRow} key={bucket.bucket}>
                      <div className={styles.calibrationBucketMeta}>
                        <strong>{bucket.bucket}</strong>
                        <span>{bucket.samples} matchs</span>
                      </div>
                      <div className={styles.calibrationBucketStats}>
                        <span>Acc.</span>
                        <strong>{Math.round((bucket.hits / bucket.samples) * 100)}%</strong>
                      </div>
                      <div className={styles.calibrationBucketStats}>
                        <span>Exp.</span>
                        <strong>{bucket.meanConfidence}%</strong>
                      </div>
                      <div className={styles.calibrationBucketStats}>
                        <span>χ²</span>
                        <strong>{bucket.chiSquareContribution.toFixed(2)}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.mutedText}>ATTENDRE: pas assez de données pour calibrer.</div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>

      <aside className={styles.side}>
        <section className={`${styles.card} ${styles.predictionCard}`}>
          <div className={styles.predictionTitle}>Signal probabiliste</div>
          <div className={styles.predictionHeadline}>{topChoice ?? 'ATTENDRE'}</div>
          <div className={styles.predictionLabel}>{prediction.reason}</div>

          <div className={styles.predictionScore}>
            <strong>{prediction.confidence}%</strong>
            <span>Confiance plafonnée selon le mode</span>
          </div>

          <div className={styles.progress} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${prediction.confidence}%` }} />
          </div>

          <div className={styles.confidenceRow}>
                  <span>Mode</span>
                  <strong>{displayMode}</strong>
          </div>
          <div className={styles.confidenceRow}>
            <span>Risk level</span>
            <strong>{prediction.riskLevel}</strong>
          </div>
          <div className={styles.confidenceRow}>
            <span>Marge bookmaker</span>
            <strong>{getBookmakerMarginFromPrediction(prediction)}</strong>
          </div>
          <div className={styles.confidenceRow}>
            <span>Raison courte</span>
            <strong>{prediction.reason}</strong>
          </div>
        </section>

        <section className={`${styles.card} ${styles.analysisCard}`}>
          <h4>Probabilités V1 / X / V2</h4>
          <div className={styles.analysisRows}>
            {probabilities ? (
              (['V1', 'X', 'V2'] as const).map((key) => (
                <div className={styles.analysisRow} key={key}>
                  <span>{key}</span>
                  <strong>{Math.round(probabilities[key] * 100)}%</strong>
                </div>
              ))
            ) : (
              <div className={styles.mutedText}>ATTENDRE: aucune probabilité exploitable.</div>
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.analysisCard}`}>
          <h4>Cotes brutes</h4>
          <div className={styles.analysisRows}>
            {odds ? (
              (['V1', 'X', 'V2'] as const).map((key) => (
                <div className={styles.analysisRow} key={key}>
                  <span>{key}</span>
                  <strong>{formatPrice(odds[key])}</strong>
                </div>
              ))
            ) : (
              <div className={styles.mutedText}>ATTENDRE: aucune cote brute disponible.</div>
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.analysisCard}`}>
          <h4>Options traduites</h4>
          <div className={styles.analysisRows}>
            {prediction.prediction === 'ATTENDRE' ? (
              <div className={styles.mutedText}>ATTENDRE: aucune option fiable.</div>
            ) : (
              (['V1', 'X', 'V2'] as const).map((key) => {
                const label =
                  key === 'V1' ? 'Victoire Croisillons' : key === 'V2' ? 'Victoire Ronds' : 'Match nul';
                return (
                  <div className={styles.analysisRow} key={key}>
                    <span>{label}</span>
                    <strong>{prediction.prediction === key ? 'Choisi' : 'Alternative'}</strong>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.analysisCard}`}>
          <h4>Risk flags</h4>
          <div className={styles.analysisRows}>
            {riskFlags.length > 0 ? (
              riskFlags.map((flag) => (
                <div className={styles.analysisRow} key={flag}>
                  <span>{flag}</span>
                  <strong>Actif</strong>
                </div>
              ))
            ) : (
              <div className={styles.mutedText}>Aucun risque majeur détecté.</div>
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.analysisCard}`}>
          <h4>Résultat minimax</h4>
          <div className={styles.analysisRows}>
            <div className={styles.analysisRow}>
              <span>Résultat</span>
              <strong>{prediction.debug.minimaxOutcome ?? 'ATTENDRE'}</strong>
            </div>
            <div className={styles.analysisRow}>
              <span>Dernière grille</span>
              <strong>{lastBoard ? 'Disponible' : 'ATTENDRE'}</strong>
            </div>
            <div className={styles.analysisRow}>
              <span>Base</span>
              <strong>{isLive ? 'LIVE' : 'PREMATCH'}</strong>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.warningCard}`}>
          <h4>Prudence</h4>
          <p>{disclaimer}</p>
          <p className={styles.oddsNotice}>
            Aucun texte ne doit promettre de gain. Les cotes ne sont affichées que lorsqu’elles
            sont réellement présentes dans l’API.
          </p>
        </section>
      </aside>
          </div>
        </div>
      </details>
    </div>
  );
}
