import type { MegaPronosticDebug } from './prediction-engine/types';
import { MatchDashboardTabs, type DashboardRoundView } from './match-dashboard-tabs';
import styles from './detail-prediction.module.css';

type AdvancedAnalysisPanelProps = {
  debug: MegaPronosticDebug;
};

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
}

export function AdvancedAnalysisPanel({ debug }: AdvancedAnalysisPanelProps) {
  const master = debug.masterSignal;
  const rounds: DashboardRoundView[] = debug.roundViews.map((round) => ({
    ...round,
    tab: `ROUND ${round.roundIndex}` as DashboardRoundView['tab'],
  }));

  return (
    <details className={styles.advancedDetails}>
      <summary className={styles.advancedSummary}>Voir analyse avancée</summary>
      <div className={styles.advancedContent}>
        <MatchDashboardTabs
          master={{
            choice: master.choice,
            source: master.source,
            sourceTab: master.sourceTab,
            confidence: master.confidence,
            safetyMargin: master.safetyMargin,
            riskLevel: master.riskLevel,
            reason: master.reason,
            oddsText: master.oddsText,
            state: master.state,
            disclaimer: master.disclaimer,
          }}
          matchSummary={debug.matchSummary}
          rounds={rounds}
          unifiedPrediction={debug.unifiedPrediction}
        />

        <div className={styles.calibrationGrid}>
          <article className={`${styles.analysisCard} ${styles.calibrationSummaryCard}`}>
            <h4>Calibration</h4>
            <div className={styles.metricGrid}>
              <div className={styles.metricTile}>
                <span>Brier Score</span>
                <strong>{debug.calibration.brierScore.toFixed(3)}</strong>
              </div>
              <div className={styles.metricTile}>
                <span>Chi²</span>
                <strong>{debug.calibration.chiSquare.toFixed(2)}</strong>
              </div>
              <div className={styles.metricTile}>
                <span>ddl</span>
                <strong>{debug.calibration.degreesOfFreedom}</strong>
              </div>
              <div className={styles.metricTile}>
                <span>Echantillons</span>
                <strong>{debug.calibration.sampleCount}</strong>
              </div>
            </div>
            <p className={styles.calibrationNote}>
              Les matchs terminés servent uniquement à mesurer la qualité du signal.
            </p>
          </article>

          <article className={`${styles.analysisCard} ${styles.calibrationBucketsCard}`}>
            <div className={styles.calibrationBucketsHeader}>
              <h4>Détails techniques</h4>
              <div className={styles.calibrationChip}>{debug.displayMode}</div>
            </div>
            <div className={styles.analysisRows}>
              <div className={styles.analysisRow}>
                <span>Dernière grille</span>
                <strong>{debug.lastBoard ? 'Disponible' : 'ATTENDRE'}</strong>
              </div>
              <div className={styles.analysisRow}>
                <span>Flags risque</span>
                <strong>{debug.riskFlags.length}</strong>
              </div>
              <div className={styles.analysisRow}>
                <span>Value Score</span>
                <strong>{debug.unifiedPrediction.bestSignal.valueScore.toFixed(1)}</strong>
              </div>
              <div className={styles.analysisRow}>
                <span>Marge maître</span>
                <strong>{master.safetyMargin}</strong>
              </div>
              <div className={styles.analysisRow}>
                <span>Probabilité principale</span>
                <strong>{formatPercent(debug.prediction.confidence)}</strong>
              </div>
              <div className={styles.analysisRow}>
                <span>Résultat final</span>
                <strong>{debug.finalWinner}</strong>
              </div>
            </div>
          </article>
        </div>

        <article className={styles.analysisCard}>
          <h4>Risk flags</h4>
          <div className={styles.chipList}>
            {debug.riskFlags.length > 0 ? (
              debug.riskFlags.map((flag) => (
                <span key={flag} className={styles.chip}>
                  {flag}
                </span>
              ))
            ) : (
              <span className={styles.mutedText}>Aucun risque majeur détecté.</span>
            )}
          </div>
        </article>
      </div>
    </details>
  );
}
