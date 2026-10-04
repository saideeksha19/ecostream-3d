import type { Observation, WaterVariable } from '@ecostream/shared';

/**
 * Analysis layer (AI/ML seam). Deterministic statistical methods with no
 * accuracy claims: anomaly = robust z-score (median/MAD) against the trailing
 * window; trend = Theil–Sen slope; completeness = coverage of the expected
 * hourly grid. Every function is pure and unit-testable.
 */

export const ANALYSIS_BASELINE_HOURS = 72;

export interface VariableWindow {
  variable: WaterVariable;
  /** Most recent value at or before nowTs. */
  latest: number | null;
  latestTs: string | null;
  /** Chronological values in the window. */
  values: number[];
}

function medianSorted(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  const mid = n >> 1;
  return n % 2 ? (sortedAsc[mid] as number) : ((sortedAsc[mid - 1] as number) + (sortedAsc[mid] as number)) / 2;
}

export function medianOf(values: number[]): number {
  return medianSorted([...values].sort((a, b) => a - b));
}

/** MAD scaled by 1.4826 for consistency with standard deviation on normal data. */
export function madOf(values: number[], med = medianOf(values)): number {
  const devs = values.map((v) => Math.abs(v - med));
  return medianSorted([...devs].sort((a, b) => a - b)) * 1.4826;
}

export function windowFor(observations: Observation[], variable: WaterVariable, nowTs: string): VariableWindow {
  const sorted = observations
    .filter((o) => o.variable === variable && o.ts <= nowTs)
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const last = sorted.at(-1);
  return {
    variable,
    latest: last?.value ?? null,
    latestTs: last?.ts ?? null,
    values: sorted.map((o) => o.value),
  };
}

export const ANOMALY_Z_THRESHOLD = 4;

export interface AnomalyResult {
  /** Robust z-score; 0 when it cannot be computed. */
  z: number;
  latest: number | null;
  isAnomaly: boolean;
  method: string;
}

export function detectAnomaly(win: VariableWindow): AnomalyResult {
  const values = win.values.slice(-ANALYSIS_BASELINE_HOURS);
  if (values.length < 12 || win.latest === null) {
    return { z: 0, latest: win.latest, isAnomaly: false, method: 'median/MAD (insufficient baseline)' };
  }
  const med = medianOf(values);
  const mad = madOf(values, med);
  if (!Number.isFinite(mad) || mad < 1e-9) {
    return { z: 0, latest: win.latest, isAnomaly: false, method: 'median/MAD (degenerate MAD)' };
  }
  const z = (win.latest - med) / mad;
  return {
    z,
    latest: win.latest,
    isAnomaly: Math.abs(z) >= ANOMALY_Z_THRESHOLD,
    method: 'median/MAD robust z-score (trailing 72h)',
  };
}

export interface TrendResult {
  /** Theil–Sen slope per hour over the window. */
  slope: number;
  /** 0..100 pressure in the "deteriorating" direction for this variable. */
  score: number;
  method: string;
}

/** "bad" direction is encoded by the sign of badSlope; scale reaches 40/100 at badSlope. */
const TREND_REF: Record<WaterVariable, { badSlope: number; scale: number }> = {
  turbidity: { badSlope: 0.4, scale: 40 },
  conductivity: { badSlope: 1.5, scale: 40 },
  dissolved_oxygen: { badSlope: -0.05, scale: 40 }, // falling DO is bad
  water_level: { badSlope: 0.02, scale: 40 },
  temperature: { badSlope: 0.15, scale: 40 },
};

export function theilSenSlope(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  // Cap pairwise work: sample indices across the window.
  const step = Math.max(1, Math.floor(n / 24));
  const idx: number[] = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  const lastIdx = idx.at(-1) ?? 0;
  if (lastIdx !== n - 1) idx.push(n - 1);
  const slopes: number[] = [];
  for (let a = 0; a < idx.length; a++) {
    for (let b = a + 1; b < idx.length; b++) {
      const dt = (idx[b] as number) - (idx[a] as number);
      if (dt <= 0) continue;
      slopes.push(((values[idx[b] as number] as number) - (values[idx[a] as number] as number)) / dt);
    }
  }
  return slopes.length ? medianOf(slopes) : 0;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function trendPressure(win: VariableWindow): TrendResult {
  const values = win.values.slice(-ANALYSIS_BASELINE_HOURS);
  if (values.length < 24) return { slope: 0, score: 0, method: 'Theil–Sen (insufficient data)' };
  const slope = theilSenSlope(values);
  const ref = TREND_REF[win.variable];
  return { slope, score: clamp100((slope / ref.badSlope) * ref.scale), method: 'Theil–Sen slope over 72h' };
}

export interface CompletenessResult {
  /** 0..1 coverage of the expected hourly grid over the trailing window. */
  completeness: number;
  expected: number;
  actual: number;
}

export function dataCompleteness(
  observations: Observation[],
  variables: WaterVariable[],
  nowTs: string,
): CompletenessResult {
  const expected = ANALYSIS_BASELINE_HOURS * variables.length;
  const cutoffMs = Date.parse(nowTs) - (ANALYSIS_BASELINE_HOURS - 1) * 3_600_000;
  const actual = observations.filter(
    (o) => variables.includes(o.variable) && Date.parse(o.ts) >= cutoffMs && o.ts <= nowTs,
  ).length;
  return { completeness: expected > 0 ? Math.min(1, actual / expected) : 0, expected, actual };
}
