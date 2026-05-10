import type { TicTacToeMatch } from '@/lib/tictactoe-data';
import { MegaPronosticEngine } from './prediction-engine/mega-pronostic-engine';
import { AdvancedAnalysisPanel } from './advanced-analysis-panel';
import { MegaPronosticPanel } from './mega-pronostic-panel';
import styles from './detail-prediction.module.css';

type DetailPredictionProps = {
  match: TicTacToeMatch;
  allMatches: TicTacToeMatch[];
};

export function DetailPrediction({ match, allMatches }: DetailPredictionProps) {
  const megaPronostic = MegaPronosticEngine(match, allMatches);

  return (
    <section className={styles.detailRoot}>
      <MegaPronosticPanel pronostic={megaPronostic} />
      <AdvancedAnalysisPanel debug={megaPronostic.debug} />
    </section>
  );
}
