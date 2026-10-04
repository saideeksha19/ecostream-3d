import type { Observation, WaterVariable } from '@ecostream/shared';
import { detectAnomaly, dataCompleteness, trendPressure, windowFor } from './anomaly';
import type { AnomalyResult, CompletenessResult, TrendResult, VariableWindow } from './anomaly';

/**
 * Analyzer seam: every analytical method used by the risk engine implements
 * this interface so future models (e.g. ONNX classifiers) can be added without
 * touching the engine. Version labels propagate into evidence.
 */
export interface Analyzer<TIn, TOut> {
  readonly name: string;
  readonly version: string;
  analyze(input: TIn): TOut;
}

export interface ZoneAnalysis {
  perVariable: Map<WaterVariable, { anomaly: AnomalyResult; trend: TrendResult; window: VariableWindow }>;
  completeness: CompletenessResult;
  analyzerVersion: string;
}

const ANALYZER_VERSION = 'stat-1.0.0';

/** Run all P0 analyzers over one zone's effective observations. */
export function analyzeZone(
  observationsByVariable: Observation[],
  variables: WaterVariable[],
  nowTs: string,
): ZoneAnalysis {
  const perVariable = new Map<WaterVariable, { anomaly: AnomalyResult; trend: TrendResult; window: VariableWindow }>();
  for (const variable of variables) {
    const window = windowFor(observationsByVariable, variable, nowTs);
    perVariable.set(variable, {
      window,
      anomaly: detectAnomaly(window),
      trend: trendPressure(window),
    });
  }
  return { perVariable, completeness: dataCompleteness(observationsByVariable, variables, nowTs), analyzerVersion: ANALYZER_VERSION };
}

export { detectAnomaly, trendPressure, dataCompleteness };
export type { AnomalyResult, TrendResult, CompletenessResult, VariableWindow };
