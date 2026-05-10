'use client';

import { useState } from 'react';
import type { NormalizedProbabilities, PredictionOutcome, RiskLevel } from './prediction-engine/types';
import styles from './detail-prediction.module.css';

export type DashboardState = 'PREMATCH' | 'LIVE' | 'FINISHED';
export type DashboardTab = 'MATCH' | 'ROUND 1' | 'ROUND 2' | 'ROUND 3';

export type DashboardRoundView = {
  tab: DashboardTab;
  roundIndex: number;
  state: DashboardState;
  board: number[];
  stateLabel: string;
  oddsText: string;
  probabilities: NormalizedProbabilities | null;
  prediction: PredictionOutcome;
  minimaxOutcome: PredictionOutcome | null;
  confidence: number;
  safetyMargin: number;
  riskLevel: RiskLevel;
  reason: string;
  threats: string[];
  remainingCells: string[];
  continuations: string[];
  chosenOdds: string;
};

export type DashboardMasterSignal = {
  choice: string;
  source: string;
  sourceTab: DashboardTab;
  confidence: number;
  safetyMargin: number;
  riskLevel: RiskLevel;
  reason: string;
  oddsText: string;
  state: DashboardState;
  disclaimer: string;
};

export type DashboardMatchSummary = {
  state: DashboardState;
  roundScore: string;
  potentialWinner: string;
  overallStatus: string;
  roundSummaries: Array<{
    roundIndex: number;
    state: DashboardState;
    choice: string;
    confidence: number;
    riskLevel: RiskLevel;
    reason: string;
  }>;
};

export type DashboardTabsProps = {
  master: DashboardMasterSignal;
  matchSummary: DashboardMatchSummary;
  rounds: DashboardRoundView[];
};

function formatPercent(value: number) {
  return `${Math.min(99, Math.max(0, Math.round(value)))}%`;
}

function boardCellLabel(value: number) {
  if (value === 1) return 'X';
  if (value === 2) return 'O';
  return '·';
}

function boardCellClass(value: number) {
  if (value === 1) return `${styles.cell} ${styles.cellV1}`;
  if (value === 2) return `${styles.cell} ${styles.cellV2}`;
  return `${styles.cell} ${styles.cellEmpty}`;
}

export function MatchDashboardTabs({ master, matchSummary, rounds }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('MATCH');

  const activeRound = rounds.find((round) => round.tab === activeTab) ?? rounds[0];

  return (
    <section className={styles.dashboardShell}>
      <article className={`${styles.card} ${styles.masterCard}`}>
        <div className={styles.masterHeader}>
          <div>
            <span className={styles.masterEyebrow}>Maître Pronostic</span>
            <h3 className={styles.masterChoice}>Choix ultime : {master.choice}</h3>
            <p className={styles.masterSource}>Source : {master.source}</p>
          </div>
          <span className={styles.stateBadge}>{master.state}</span>
        </div>

        <div className={styles.masterStats}>
          <div className={styles.masterStat}>
            <span>Confiance</span>
            <strong>{formatPercent(master.confidence)}</strong>
          </div>
          <div className={styles.masterStat}>
            <span>Marge de sécurité</span>
            <strong>{Math.max(0, Math.round(master.safetyMargin))}</strong>
          </div>
          <div className={styles.masterStat}>
            <span>Niveau de risque</span>
            <strong>{master.riskLevel}</strong>
          </div>
          <div className={styles.masterStat}>
            <span>Cote utilisée</span>
            <strong>{master.oddsText}</strong>
          </div>
        </div>

        <p className={styles.masterReason}>
          Raison : {master.reason}
        </p>
        <p className={styles.masterDisclaimer}>{master.disclaimer}</p>

        <div className={styles.masterActions}>
          <button type="button" className={styles.masterButton} onClick={() => setActiveTab(master.sourceTab)}>
            Voir le round analysé
          </button>
        </div>
      </article>

      <div className={styles.tabRail} role="tablist" aria-label="Vue détaillée des pronostics">
        {(['MATCH', 'ROUND 1', 'ROUND 2', 'ROUND 3'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {activeTab === 'MATCH' ? (
          <div className={styles.matchPanel}>
            <div className={styles.panelGrid}>
              <article className={`${styles.analysisCard} ${styles.matchSummaryCard}`}>
                <h4>État général</h4>
                <div className={styles.metricStack}>
                  <div className={styles.metricLine}>
                    <span>État</span>
                    <strong>{matchSummary.state}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Score des rounds</span>
                    <strong>{matchSummary.roundScore}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Vainqueur potentiel</span>
                    <strong>{matchSummary.potentialWinner}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Statut</span>
                    <strong>{matchSummary.overallStatus}</strong>
                  </div>
                </div>
              </article>

              <article className={`${styles.analysisCard} ${styles.matchSummaryCard}`}>
                <h4>Choix du Maître Pronostic</h4>
                <div className={styles.matchChoiceCard}>
                  <strong>{master.choice}</strong>
                  <span>{master.source}</span>
                  <p>{master.reason}</p>
                </div>
              </article>
            </div>

            <article className={styles.analysisCard}>
              <div className={styles.sectionHeaderInline}>
                <h4>Résumé des 3 rounds</h4>
                <span className={styles.mutedText}>Chaque round est évalué séparément</span>
              </div>
              <div className={styles.roundSummaryGrid}>
                {matchSummary.roundSummaries.map((round) => (
                  <div key={round.roundIndex} className={styles.roundSummaryCard}>
                    <span>{`Round ${round.roundIndex}`}</span>
                    <strong>{round.choice}</strong>
                    <small>
                      {round.state} · {formatPercent(round.confidence)} · {round.riskLevel}
                    </small>
                    <p>{round.reason}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <article className={styles.roundPanel}>
            <div className={styles.panelGrid}>
              <article className={styles.analysisCard}>
                <h4>État du round</h4>
                <div className={styles.metricStack}>
                  <div className={styles.metricLine}>
                    <span>État</span>
                    <strong>{activeRound.state}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Cotes du round</span>
                    <strong>{activeRound.oddsText}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Confiance</span>
                    <strong>{formatPercent(activeRound.confidence)}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>RiskLevel</span>
                    <strong>{activeRound.riskLevel}</strong>
                  </div>
                </div>
              </article>

              <article className={styles.analysisCard}>
                <h4>Lecture rapide</h4>
                <div className={styles.metricStack}>
                  <div className={styles.metricLine}>
                    <span>Résultat minimax</span>
                    <strong>{activeRound.minimaxOutcome ?? 'ATTENDRE'}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Cote utilisée</span>
                    <strong>{activeRound.chosenOdds}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Cases restantes</span>
                    <strong>{activeRound.remainingCells.length}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Marge de sécurité</span>
                    <strong>{Math.max(0, Math.round(activeRound.safetyMargin))}</strong>
                  </div>
                  <div className={styles.metricLine}>
                    <span>Raison</span>
                    <strong>{activeRound.reason}</strong>
                  </div>
                </div>
              </article>
            </div>

            <div className={styles.roundDetailGrid}>
              <article className={styles.analysisCard}>
                <h4>Grille 3x3</h4>
                <div className={styles.board} aria-label={`Grille ${activeTab}`}>
                  {activeRound.board.map((cell, index) => (
                    <div key={`${activeTab}-${index}`} className={boardCellClass(cell)}>
                      {boardCellLabel(cell)}
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.analysisCard}>
                <h4>Probabilités V1 / X / V2</h4>
                <div className={styles.metricStack}>
                  {(activeRound.probabilities ? (['V1', 'X', 'V2'] as const) : []).map((key) => (
                    <div className={styles.metricLine} key={key}>
                      <span>{key}</span>
                      <strong>{formatPercent((activeRound.probabilities?.[key] ?? 0) * 100)}</strong>
                    </div>
                  ))}
                  {!activeRound.probabilities ? (
                    <div className={styles.mutedText}>ATTENDRE: aucune probabilité exploitable.</div>
                  ) : null}
                </div>
              </article>

              <article className={styles.analysisCard}>
                <h4>Menaces détectées</h4>
                <div className={styles.chipList}>
                  {activeRound.threats.length > 0 ? (
                    activeRound.threats.map((threat) => (
                      <span key={threat} className={styles.chip}>
                        {threat}
                      </span>
                    ))
                  ) : (
                    <span className={styles.mutedText}>Aucune menace immédiate.</span>
                  )}
                </div>
              </article>

              <article className={styles.analysisCard}>
                <h4>Continuations possibles</h4>
                <div className={styles.chipList}>
                  {activeRound.continuations.length > 0 ? (
                    activeRound.continuations.map((continuation) => (
                      <span key={continuation} className={styles.chip}>
                        {continuation}
                      </span>
                    ))
                  ) : (
                    <span className={styles.mutedText}>Aucune continuation disponible.</span>
                  )}
                </div>
              </article>
            </div>

            <article className={styles.analysisCard}>
              <h4>Cases restantes</h4>
              <div className={styles.caseList}>
                {activeRound.remainingCells.length > 0 ? (
                  activeRound.remainingCells.map((cell) => (
                    <span key={cell} className={styles.caseChip}>
                      Case {cell}
                    </span>
                  ))
                ) : (
                  <span className={styles.mutedText}>FINISHED</span>
                )}
              </div>
            </article>
          </article>
        )}
      </div>
    </section>
  );
}
