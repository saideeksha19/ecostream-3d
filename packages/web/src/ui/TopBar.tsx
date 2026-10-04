import { RISK_STATES } from '@ecostream/shared';
import { useApp } from '../store';
import type { HealthDTO } from '../services/api';
import { RiskStateLabel } from './Primitives';

export function TopBar({ health }: { health: HealthDTO | null }) {
  const ready = useApp((s) => s.ready);
  const zones = useApp((s) => s.zones);
  const points = useApp((s) => s.points);
  const busy = useApp((s) => s.busy);

  return (
    <header className="topbar">
      <a className="workspace-label" href="#watershed-view">TWIN WORKSPACE <span>/ ENVIRONMENTAL INTELLIGENCE</span></a>
      <div className="topbar-right" aria-label="System telemetry">
        <span className={`system-state ${health?.status === 'ok' ? 'system-online' : ''}`} title="Local API connection, not a live sensor feed"><i />{busy ? 'UPDATING TWIN' : health?.status === 'ok' ? 'SYSTEM ONLINE' : ready ? 'API UNCONFIRMED' : 'CONNECTING'}</span>
        <span className="header-stat"><b>{ready ? zones.length : '—'}</b> ZONES</span>
        <span className="header-stat"><b>{ready ? points.length : '—'}</b> MONITORING POINTS</span>
        <span className="header-stat"><b>{health?.observations.toLocaleString() ?? '—'}</b> OBSERVATIONS</span>
      </div>
    </header>
  );
}

export function Legend() {
  return <div className="legend">{RISK_STATES.map((state) => <RiskStateLabel key={state} state={state} />)}</div>;
}
