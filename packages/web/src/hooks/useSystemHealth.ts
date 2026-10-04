import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { api, type HealthDTO } from '../services/api';

/** Read-only telemetry from the existing endpoint; no polling or inferred totals. */
export function useSystemHealth() {
  const ready = useApp((state) => state.ready);
  const busy = useApp((state) => state.busy);
  const runId = useApp((state) => state.activeRun?.id);
  const [health, setHealth] = useState<HealthDTO | null>(null);
  useEffect(() => {
    if (!ready || busy) return;
    let cancelled = false;
    setHealth(null);
    api.health().then((value) => { if (!cancelled) setHealth(value); }).catch(() => { if (!cancelled) setHealth(null); });
    return () => { cancelled = true; };
  }, [ready, busy, runId]);
  return health;
}
