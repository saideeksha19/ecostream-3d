import { describe, expect, it } from 'vitest';
import type { Observation, WaterVariable } from '@ecostream/shared';
import { ANALYSIS_BASELINE_HOURS, ANOMALY_Z_THRESHOLD, detectAnomaly, dataCompleteness, madOf, medianOf, theilSenSlope, trendPressure, windowFor } from '../src/analysis/anomaly';

/** Analysis layer: robust statistics (pure functions). */

function obs(variable: WaterVariable, values: number[], startHour = 0): Observation[] {
  return values.map((value, i) => ({
    id: `t:${variable}:${startHour + i}`,
    pointId: 'p1',
    variable,
    value,
    unit: '',
    ts: new Date(Date.parse('2026-04-01T00:00:00Z') + (startHour + i) * 3_600_000).toISOString(),
    provenance: 'OBSERVED' as const,
    quality: 1,
    scenarioRunId: null,
  }));
}

const NOW = '2026-04-04T00:00:00.000Z';

describe('median / MAD', () => {
  it('computes medians and scaled MAD', () => {
    expect(medianOf([1, 2, 3, 4, 5])).toBe(3);
    expect(medianOf([1, 2, 3, 4])).toBe(2.5);
    // MAD of a tight cluster ≈ 0.7413 × 1.4826 ≈ 1.0 for [0,1,2,3,4].
    expect(madOf([0, 1, 2, 3, 4])).toBeCloseTo(1.4826, 3);
  });
});

describe('anomaly detection', () => {
  it('flags a extreme latest reading above the z threshold', () => {
    const values = Array.from({ length: 60 }, (_, i) => 10 + Math.sin(i) * 0.5);
    values.push(30);
    const win = windowFor(obs('turbidity', values), 'turbidity', NOW);
    const res = detectAnomaly(win);
    expect(res.isAnomaly).toBe(true);
    expect(Math.abs(res.z)).toBeGreaterThan(ANOMALY_Z_THRESHOLD);
  });

  it('stays quiet on stable series', () => {
    const values = Array.from({ length: 60 }, (_, i) => 10 + Math.sin(i) * 0.5);
    const res = detectAnomaly(windowFor(obs('turbidity', values), 'turbidity', NOW));
    expect(res.isAnomaly).toBe(false);
  });

  it('returns z=0 when there is insufficient baseline', () => {
    const res = detectAnomaly(windowFor(obs('turbidity', [1, 2, 3]), 'turbidity', NOW));
    expect(res.z).toBe(0);
    expect(res.isAnomaly).toBe(false);
    expect(res.method).toContain('insufficient');
  });
});

describe('trend pressure', () => {
  it('scores rising turbidity as deterioration', () => {
    const values = Array.from({ length: 60 }, (_, i) => 8 + i * 0.2);
    const t = trendPressure(windowFor(obs('turbidity', values), 'turbidity', NOW));
    expect(t.slope).toBeGreaterThan(0.15);
    expect(t.score).toBeGreaterThan(10);
  });

  it('scores falling dissolved oxygen as deterioration', () => {
    const values = Array.from({ length: 60 }, (_, i) => 9 - i * 0.03);
    const t = trendPressure(windowFor(obs('dissolved_oxygen', values), 'dissolved_oxygen', NOW));
    expect(t.score).toBeGreaterThan(10);
  });

  it('needs at least 24 samples', () => {
    const t = trendPressure(windowFor(obs('turbidity', [1, 2, 3, 4, 5]), 'turbidity', NOW));
    expect(t.score).toBe(0);
    expect(t.method).toContain('insufficient');
  });
});

describe('theilSenSlope', () => {
  it('recovers an exact linear slope', () => {
    expect(theilSenSlope([0, 1, 2, 3, 4, 5])).toBeCloseTo(1, 10);
  });

  it('is robust to a single outlier', () => {
    const clean = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const withOutlier = [...clean];
    withOutlier[3] = 50;
    expect(Math.abs(theilSenSlope(withOutlier) - 1)).toBeLessThan(0.5);
  });
});

describe('completeness', () => {
  it('measures coverage of the expected hourly grid', () => {
    const vars: WaterVariable[] = ['turbidity', 'conductivity'];
    // 73 samples (hours 0..72): the window cutoff is nowTs − 71h, so hours
    // 1..72 count toward the expected 72-per-variable grid.
    const full = obs('turbidity', Array.from({ length: ANALYSIS_BASELINE_HOURS + 1 }, (_, i) => 10 + i * 0.01))
      .concat(obs('conductivity', Array.from({ length: ANALYSIS_BASELINE_HOURS + 1 }, (_, i) => 300 + i * 0.01)));
    const cFull = dataCompleteness(full, vars, NOW);
    expect(cFull.completeness).toBe(1);

    const partial = full.filter((_, i) => i % 4 !== 0);
    const cPart = dataCompleteness(partial, vars, NOW);
    expect(cPart.completeness).toBeGreaterThan(0.7);
    expect(cPart.completeness).toBeLessThan(1);
  });
});
