import type { CSSProperties } from 'react';
import type { RiskState } from '@ecostream/shared';
import { PROVENANCE_LABELS, PROVENANCE_NOTES } from './presentation';

export function Provenance({ value }: { value: string | null }) {
  const label = value ? (PROVENANCE_LABELS[value] ?? value) : 'DERIVED';
  const note = value ? (PROVENANCE_NOTES[value] ?? 'No provenance note') : 'Computed from input data by the demonstration engine.';
  const className = value ? `prov-${value.toLowerCase().replaceAll('_', '-')}` : 'prov-derived';
  return <span className={className} title={note}>{label}</span>;
}

const PRESENTATION_RISK_COLORS: Record<RiskState, string> = {
  NORMAL: '#68745f',
  WATCH: '#aa8150',
  INVESTIGATE: '#b96843',
  EARLY_WARNING: '#984f3e',
};

export function RiskStateLabel({ state }: { state: RiskState }) {
  return <span className="risk-state" style={{ '--risk-color': PRESENTATION_RISK_COLORS[state] } as CSSProperties}><i aria-hidden="true" />{state.replaceAll('_', ' ')}</span>;
}

export function Meter({ value, label }: { value: number; label: string }) {
  return <div className="meter" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
