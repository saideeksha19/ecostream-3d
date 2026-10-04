import { describe, expect, it } from 'vitest';
import { RISK_THRESHOLDS, RISK_WEIGHTS, riskStateFromScore } from '@ecostream/shared';

/** Risk-state thresholds and weighted-score composition (pure shared logic). */

describe('risk state thresholds', () => {
  it('maps scores to the four states at the configured thresholds', () => {
    expect(riskStateFromScore(0)).toBe('NORMAL');
    expect(riskStateFromScore(34.9)).toBe('NORMAL');
    expect(riskStateFromScore(RISK_THRESHOLDS.WATCH)).toBe('WATCH');
    expect(riskStateFromScore(59.9)).toBe('WATCH');
    expect(riskStateFromScore(RISK_THRESHOLDS.INVESTIGATE)).toBe('INVESTIGATE');
    expect(riskStateFromScore(74.9)).toBe('INVESTIGATE');
    expect(riskStateFromScore(RISK_THRESHOLDS.EARLY_WARNING)).toBe('EARLY_WARNING');
    expect(riskStateFromScore(100)).toBe('EARLY_WARNING');
  });

  it('escalates immediately at the next state threshold', () => {
    expect(riskStateFromScore(76, 'NORMAL')).toBe('EARLY_WARNING');
    expect(riskStateFromScore(RISK_THRESHOLDS.INVESTIGATE, 'WATCH')).toBe('INVESTIGATE');
    expect(riskStateFromScore(RISK_THRESHOLDS.EARLY_WARNING, 'INVESTIGATE')).toBe('EARLY_WARNING');
  });

  it('demotes only after clearing the previous state threshold minus hysteresis', () => {
    expect(riskStateFromScore(RISK_THRESHOLDS.EARLY_WARNING - 2.9, 'EARLY_WARNING')).toBe('EARLY_WARNING');
    expect(riskStateFromScore(RISK_THRESHOLDS.EARLY_WARNING - 3.1, 'EARLY_WARNING')).toBe('INVESTIGATE');
    expect(riskStateFromScore(RISK_THRESHOLDS.INVESTIGATE - 3.1, 'INVESTIGATE')).toBe('WATCH');
    expect(riskStateFromScore(RISK_THRESHOLDS.WATCH - 3.1, 'WATCH')).toBe('NORMAL');
  });

  it('stays in the current state inside each hysteresis band', () => {
    expect(riskStateFromScore(72.5, 'EARLY_WARNING')).toBe('EARLY_WARNING');
    expect(riskStateFromScore(57.5, 'INVESTIGATE')).toBe('INVESTIGATE');
    expect(riskStateFromScore(32.5, 'WATCH')).toBe('WATCH');
  });

  it('supports repeated escalation and recovery transitions', () => {
    let state = riskStateFromScore(35, 'NORMAL');
    expect(state).toBe('WATCH');
    state = riskStateFromScore(60, state);
    expect(state).toBe('INVESTIGATE');
    state = riskStateFromScore(75, state);
    expect(state).toBe('EARLY_WARNING');
    state = riskStateFromScore(71, state);
    expect(state).toBe('INVESTIGATE');
    state = riskStateFromScore(56, state);
    expect(state).toBe('WATCH');
    state = riskStateFromScore(31, state);
    expect(state).toBe('NORMAL');
  });

  it('uses the approved component weights', () => {
    expect(RISK_WEIGHTS).toEqual({ anomaly: 0.3, runoff: 0.2, trend: 0.2, ecosystem: 0.2, spatial: 0.1 });
    const total = Object.values(RISK_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});
