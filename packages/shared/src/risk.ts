import { RISK_STATES } from './types';
import type { RiskComponentId, RiskState } from './types';

/**
 * Risk-engine constants. Pure data — the engine reads these, the UI renders
 * them, so score interpretation cannot drift between server and client.
 */

export const RISK_WEIGHTS: Record<RiskComponentId, number> = {
  anomaly: 0.3,
  runoff: 0.2,
  trend: 0.2,
  ecosystem: 0.2,
  spatial: 0.1,
};

export const RISK_COMPONENT_LABELS: Record<RiskComponentId, string> = {
  anomaly: 'Water anomaly',
  runoff: 'Runoff exposure',
  trend: 'Historical trend',
  ecosystem: 'Ecosystem stress',
  spatial: 'Upstream inflow',
};

/** Thresholds on the composite 0..100 score. */
export const RISK_THRESHOLDS = {
  WATCH: 35,
  INVESTIGATE: 60,
  EARLY_WARNING: 75,
} as const;

/** Hysteresis buffer (score points) applied against state flapping. */
export const RISK_HYSTERESIS = 3;

export function riskStateFromScore(score: number, previous?: RiskState): RiskState {
  let state: RiskState = 'NORMAL';
  if (score >= RISK_THRESHOLDS.EARLY_WARNING) state = 'EARLY_WARNING';
  else if (score >= RISK_THRESHOLDS.INVESTIGATE) state = 'INVESTIGATE';
  else if (score >= RISK_THRESHOLDS.WATCH) state = 'WATCH';

  if (!previous || previous === state) return state;

  // Only demote when the score clears the lower threshold by the hysteresis
  // buffer; promotion is immediate (fail loud, recover quiet).
  const severity = (s: RiskState): number => RISK_STATES.indexOf(s);
  if (severity(state) > severity(previous)) return state;

  // The release threshold belongs to the state we are leaving, not the
  // newly-derived lower state. Using `state` here made the guard impossible:
  // a score below WATCH can never also be above WATCH minus hysteresis when
  // demoting to NORMAL. A transition is released only after the score clears
  // the previous state's entry threshold by the hysteresis buffer.
  const previousThreshold = {
    NORMAL: 0,
    WATCH: RISK_THRESHOLDS.WATCH,
    INVESTIGATE: RISK_THRESHOLDS.INVESTIGATE,
    EARLY_WARNING: RISK_THRESHOLDS.EARLY_WARNING,
  }[previous];
  return score >= previousThreshold - RISK_HYSTERESIS ? previous : state;
}

/** UI palette (kept in shared so the 3D scene and panels agree). */
export const RISK_COLORS: Record<RiskState, string> = {
  NORMAL: '#5f8f7a',
  WATCH: '#d9a441',
  INVESTIGATE: '#e07038',
  EARLY_WARNING: '#c93b3b',
};
