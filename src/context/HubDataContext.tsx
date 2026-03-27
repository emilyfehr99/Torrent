import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { HubPayload } from '../types/hub';
import { fetchHub } from '../lib/api';

type Ctx = {
  data: HubPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const HubDataContext = createContext<Ctx | null>(null);

export function HubDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<HubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchHub(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let payload = await fetchHub(false);
        // Stale in-memory API cache may omit newer keys (lines/pairings/viz) until ?refresh=1
        if (
          alive &&
          (!('line_combos_season' in payload) ||
            !('pairings_season' in payload) ||
            !('viz_shots' in payload) ||
            !('viz_shot_games' in payload) ||
            !('viz_lane_efficiency' in payload) ||
            !('rink_report' in payload) ||
            !('period_recap_avg' in payload))
        ) {
          payload = await fetchHub(true);
        }
        if (alive) setData(payload);
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setData(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <HubDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </HubDataContext.Provider>
  );
}

export function useHubData(): Ctx {
  const c = useContext(HubDataContext);
  if (!c) throw new Error('useHubData must be used inside HubDataProvider');
  return c;
}
