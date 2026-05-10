'use client';

import { useMemo, useState } from 'react';
import type { MatchRecommendation } from '@/lib/tictactoe-data';

type PredictionPanelProps = {
  recommendation: MatchRecommendation;
};

export function PredictionPanel({ recommendation }: PredictionPanelProps) {
  const [selectedId, setSelectedId] = useState(recommendation.selectedId);

  const selectedChoice = useMemo(
    () => recommendation.choices.find((choice) => choice.id === selectedId) ?? recommendation.choices[0],
    [recommendation.choices, selectedId],
  );

  return (
    <aside className="panel recommendation-panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Signal probabiliste</span>
          <h3>{recommendation.headline}</h3>
          <p>{recommendation.rationale}</p>
        </div>
      </div>

      <div className="recommendation-score">
        <span>Choix recommandé</span>
        <strong>{selectedChoice.displayLabel}</strong>
        <p>{selectedChoice.description}</p>
        <div className="recommendation-price">{selectedChoice.price.toFixed(2)}</div>
      </div>

      <div className="confidence-bar">
        <div className="confidence-bar-fill" style={{ width: `${selectedChoice.confidence}%` }} />
      </div>
      <div className="confidence-row">
        <span>Confiance du moteur</span>
        <strong>{selectedChoice.confidence}%</strong>
      </div>

      <div className="choice-selector">
        {recommendation.choices.map((choice) => {
          const active = choice.id === selectedId;

          return (
            <button
              key={choice.id}
              type="button"
              className={`choice-select ${active ? 'is-active' : ''}`}
              onClick={() => setSelectedId(choice.id)}
            >
              <div className="choice-select-head">
                <span>{choice.displayLabel}</span>
                <strong>{choice.price.toFixed(2)}</strong>
              </div>
              <small>{choice.description}</small>
              <em>{choice.note}</em>
            </button>
          );
        })}
      </div>

      <div className="signal-list">
        {recommendation.signals.map((signal) => (
          <div className="signal-item" key={signal}>
            {signal}
          </div>
        ))}
      </div>

      <button type="button" className="button button--full">
        Confirmer ce choix
      </button>
      <p className="panel-note">Jeu virtuel RNG — signal probabiliste, aucun gain garanti.</p>
    </aside>
  );
}
