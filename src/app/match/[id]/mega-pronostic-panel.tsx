import type { MegaPronostic } from './prediction-engine/types';
import styles from './detail-prediction.module.css';

type MegaPronosticPanelProps = {
  pronostic: MegaPronostic;
};

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
}

function getMarketLabel(choice: MegaPronostic['finalChoice']) {
  if (choice === 'V1' || choice === 'DRAW' || choice === 'V2') return '1X2';
  if (choice === '1X' || choice === '12' || choice === '2X') return 'Double chance';
  if (choice === 'OVER' || choice === 'UNDER') return 'Total';
  if (choice === 'HANDICAP_V1' || choice === 'HANDICAP_V2') return 'Handicap';
  return 'Inconnu';
}

export function MegaPronosticPanel({ pronostic }: MegaPronosticPanelProps) {
  const isWait = pronostic.finalChoice === 'ATTENDRE';

  return (
    <section className={`${styles.card} ${styles.megaCard}`}>
      <div className={styles.megaHeader}>
        <div>
          <span className={styles.megaEyebrow}>Mega Pronostic</span>
          <h2 className={styles.megaTitle}>Que faire maintenant ?</h2>
          <p className={styles.megaSubtitle}>
            {isWait ? 'Le système estime qu’il faut attendre.' : 'Le système estime qu’un signal exploitable est présent.'}
          </p>
        </div>
        <div className={styles.megaActionPill}>{pronostic.action}</div>
      </div>

      <div className={styles.megaDecision}>
        <strong>
          {isWait ? 'Décision finale : ATTENDRE' : `Choix final : ${pronostic.finalChoice} — ${pronostic.roundLabel}`}
        </strong>
        <span>
          {isWait
            ? pronostic.label
            : `Marché : ${getMarketLabel(pronostic.finalChoice)} · Round concerné : ${pronostic.roundLabel}`}
        </span>
      </div>

      <div className={styles.megaMetrics}>
        <div className={styles.megaMetric}>
          <span>Probabilité</span>
          <strong>{formatPercent(pronostic.probability)}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Confiance</span>
          <strong>{formatPercent(pronostic.confidence)}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Mega Score</span>
          <strong>{Math.max(0, Math.round(pronostic.megaScore))}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Risque</span>
          <strong>{pronostic.riskLevel}</strong>
        </div>
      </div>

      <div className={styles.megaMetrics}>
        <div className={styles.megaMetric}>
          <span>Cote</span>
          <strong>{typeof pronostic.odds === 'number' ? pronostic.odds.toFixed(2) : '—'}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Source</span>
          <strong>{pronostic.source}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Round</span>
          <strong>{pronostic.roundLabel}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Action</span>
          <strong>{pronostic.action}</strong>
        </div>
      </div>

      <p className={styles.megaReason}>{pronostic.reason}</p>
      <p className={styles.megaDisclaimer}>{pronostic.disclaimer}</p>
    </section>
  );
}
