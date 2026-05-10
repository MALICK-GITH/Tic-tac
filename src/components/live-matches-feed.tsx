'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MatchCard } from '@/components/match-card';
import type { TicTacToeMatch } from '@/lib/tictactoe-data';

type LiveMatchesFeedProps = {
  initialMatches: TicTacToeMatch[];
  refreshIntervalMs?: number;
};

export function LiveMatchesFeed({ initialMatches, refreshIntervalMs = 10000 }: LiveMatchesFeedProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setHasError(false);

    try {
      const response = await fetch('/api/live', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: { matches?: TicTacToeMatch[] } = await response.json();

      if (mountedRef.current && data.matches) {
        setMatches(data.matches);
        setLastUpdated(new Date());
      }
    } catch {
      if (mountedRef.current) {
        setHasError(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);
    const timer = setInterval(refresh, refreshIntervalMs);

    return () => {
      clearTimeout(initialRefresh);
      clearInterval(timer);
    };
  }, [refresh, refreshIntervalMs]);

  return (
    <>
      <section className="panel overview-strip">
        <div className="overview-strip-item">
          <span>Matchs affichés</span>
          <strong>{matches.length}</strong>
        </div>
        <div className="overview-strip-item">
          <span>Sport suivi</span>
          <strong>320 · Tic Tac Toe</strong>
        </div>
        <div className="overview-strip-item">
          <span>Source technique</span>
          <strong>1x2_VZip / ShortZip</strong>
        </div>
        <div className="overview-strip-item overview-strip-item--wide">
          <div className="refresh-head">
            <div>
              <span>État du rafraîchissement</span>
              <strong>
                {isRefreshing ? 'Mise à jour en cours...' : 'Actualisation automatique active'}
              </strong>
            </div>
            <button type="button" className="refresh-button" onClick={refresh} disabled={isRefreshing}>
              Rafraîchir maintenant
            </button>
          </div>
          <small className="refresh-meta">
            {lastUpdated
              ? `Dernière mise à jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`
              : 'Chargement initial'}
            {hasError ? ' · Source momentanément indisponible' : ''}
          </small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>Liste complète des matchs</h2>
            <p>Chaque ligne ouvre le dossier détaillé du match et de son pronostic.</p>
          </div>
        </div>

        <div className="match-list-head">
          <span>Statut</span>
          <span>Match</span>
          <span>Score</span>
          <span>Marchés</span>
          <span>Action</span>
        </div>

        <div className="match-list">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </>
  );
}
