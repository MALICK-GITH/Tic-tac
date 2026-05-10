import type { MegaPronostic } from './prediction-engine/types';
import styles from './detail-prediction.module.css';

type MegaPronosticPanelProps = {
  pronostic: MegaPronostic;
};

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
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
            {isWait
              ? 'Le systeme estime qu’il faut attendre.'
              : 'Le systeme estime qu’un signal exploitable est present.'}
          </p>
        </div>
        <div className={styles.megaActionPill}>{pronostic.state}</div>
      </div>

      <div className={styles.megaDecision}>
        <strong>
          {isWait ? 'Decision : ATTENDRE' : `Choix final : ${pronostic.label}`}
        </strong>
        <span>
          {isWait
            ? `Favori detecte : ${pronostic.label}`
            : `Marché : ${pronostic.marketLabel} · Round concerné : ${pronostic.roundLabel}`}
        </span>
      </div>

      <div className={styles.megaMetrics}>
        <div className={styles.megaMetric}>
          <span>Décision finale</span>
          <strong>{pronostic.action}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Choix final</span>
          <strong>{isWait ? 'ATTENDRE' : pronostic.label}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Round concerné</span>
          <strong>{pronostic.roundLabel}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Marché concerné</span>
          <strong>{pronostic.marketLabel}</strong>
        </div>
      </div>

      <div className={styles.megaMetrics}>
        <div className={styles.megaMetric}>
          <span>Cote utilisée</span>
          <strong>{typeof pronostic.odds === 'number' ? pronostic.odds.toFixed(2) : '—'}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Probabilité</span>
          <strong>{formatPercent(pronostic.probability)}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Confiance</span>
          <strong>{formatPercent(pronostic.confidence)}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Risque</span>
          <strong>{pronostic.riskLevel}</strong>
        </div>
      </div>

      <div className={styles.megaMetrics}>
        <div className={styles.megaMetric}>
          <span>Mega Score</span>
          <strong>{Math.max(0, Math.round(pronostic.megaScore))}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Source</span>
          <strong>{pronostic.source}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Etat</span>
          <strong>{pronostic.state}</strong>
        </div>
        <div className={styles.megaMetric}>
          <span>Action recommandee</span>
          <strong>{pronostic.action}</strong>
        </div>
      </div>

      <p className={styles.megaReason}>Raison : {pronostic.reason}</p>
      <p className={styles.megaDisclaimer}>{pronostic.disclaimer}</p>
    </section>
  );
}
