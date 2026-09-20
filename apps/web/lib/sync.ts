'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, bumpRefresh } from './api';

/**
 * The sync heartbeat.
 *
 * The engine bumps a version number on every single write (booking, payment,
 * loyalty point, expense...). Every dashboard polls /api/state and refetches
 * its data whenever the version changes — this is what keeps all four
 * dashboards showing the same truth.
 */
export function useEngineVersion(intervalMs = 4000): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const j = await api<{ version: number }>('/api/state');
        if (!stopped) setVersion(j.version);
      } catch {
        /* server not ready yet — retry next tick */
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    const onRefresh = () => tick();
    window.addEventListener('obb:refresh', onRefresh);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('obb:refresh', onRefresh);
    };
  }, [intervalMs]);

  return version;
}

/** Refetch a data URL whenever the engine version changes. */
export function useEngineData<T>(url: string, init?: RequestInit) {
  const version = useEngineVersion();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const j = await api<T>(url, init as RequestInit | undefined);
      setData(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, JSON.stringify((init as { headers?: unknown } | undefined)?.headers ?? null)]);

  useEffect(() => {
    setLoading(true);
    load();
    const onRefresh = () => load();
    window.addEventListener('obb:refresh', onRefresh);
    return () => window.removeEventListener('obb:refresh', onRefresh);
  }, [load, version]);

  const refresh = () => {
    load();
    bumpRefresh();
  };

  return { data, error, loading, version, refresh };
}
