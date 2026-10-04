import type {
  Forecast,
  ForecastHorizon,
  ForecastPoint,
  Observation,
  RiskAssessment,
  RiskState,
  WaterVariable,
} from '@ecostream/shared';
import { RISK_STATES, riskStateFromScore } from '@ecostream/shared';
import { analyzeZone } from '../analysis';
import type { ZoneAnalysis } from '../analysis';

const METHOD = 'Demonstration heuristic · damped persistence on synthetic data';
const DISCLAIMER = 'Not a calibrated hydrological model. Projected signals are decision-support heuristics, not guaranteed predictions.';
const HORIZONS: { horizon: ForecastHorizon; hours: number; confidenceDecay: number }[] = [
  { horizon: 'CURRENT', hours: 0, confidenceDecay: 1 },
  { horizon: 'H24', hours: 24, confidenceDecay: 0.86 },
  { horizon: 'H72', hours: 72, confidenceDecay: 0.68 },
  { horizon: 'D7', hours: 168, confidenceDecay: 0.45 },
];

export interface ForecastInput {
  zoneId: string;
  scenarioRunId: string | null;
  assessment: RiskAssessment;
  observations: Observation[];
  variables: WaterVariable[];
  nowTs: string;
}

/**
 * Small, transparent forecast heuristic. It persists the current risk while
 * allowing recent directional deterioration/improvement to move it gradually.
 * Confidence decays with horizon and incomplete input data; uncertainty grows.
 */
export function forecastZone(input: ForecastInput): Forecast {
  const analysis = analyzeZone(input.observations, input.variables, input.nowTs);
  const momentum = riskMomentum(analysis);
  const completeness = analysis.completeness.completeness;
  const points = HORIZONS.map(({ horizon, hours, confidenceDecay }) => {
    const score = projectScore(input.assessment.score, momentum, hours);
    const uncertainty = 1.5 + hours * (0.035 + (1 - completeness) * 0.035);
    const confidence = round01(input.assessment.confidence * confidenceDecay * (0.7 + 0.3 * completeness));
    return {
      horizon,
      projectedScore: round(clamp100(score)),
      projectedState: riskStateFromScore(score),
      confidence,
      uncertaintyLow: round(Math.max(0, score - uncertainty)),
      uncertaintyHigh: round(Math.min(100, score + uncertainty)),
      method: METHOD,
    } satisfies ForecastPoint;
  });

  const current = points[0]!;
  const crossing = points.slice(1).find((point) => severity(point.projectedState) > severity(current.projectedState));
  return {
    zoneId: input.zoneId,
    scenarioRunId: input.scenarioRunId,
    dataCompleteness: round01(completeness),
    points,
    thresholdCrossing: crossing
      ? {
          horizon: crossing.horizon,
          threshold: crossing.projectedState,
          message: `Projected ${crossing.projectedState.replaceAll('_', '-')} threshold crossing at ${labelFor(crossing.horizon)}. This is a demonstration signal, not a guaranteed prediction.`,
        }
      : null,
    disclaimer: DISCLAIMER,
    generatedAt: input.nowTs,
  };
}

/** Exposed for focused engine tests and to make the heuristic easy to audit. */
export function projectScore(currentScore: number, momentum: number, hours: number): number {
  if (hours <= 0) return currentScore;
  const dampedPersistence = 1 - Math.exp(-hours / 96);
  const trendDelta = clamp(momentum, -1, 1) * 22 * (1 - Math.exp(-hours / 48));
  return currentScore + trendDelta * dampedPersistence;
}

function riskMomentum(analysis: ZoneAnalysis): number {
  const refs: Record<WaterVariable, number> = {
    turbidity: 0.4,
    conductivity: 1.5,
    dissolved_oxygen: -0.05,
    water_level: 0.02,
    temperature: 0.15,
  };
  const signals = [...analysis.perVariable.entries()]
    .map(([variable, result]) => (result.trend.slope / refs[variable]) * 40)
    .filter((signal) => Number.isFinite(signal));
  if (signals.length === 0) return 0;
  // Average signed deterioration pressure. Positive means the water variables
  // are moving in the risk-increasing direction; negative means improvement.
  return clamp(signals.reduce((sum, signal) => sum + signal, 0) / signals.length / 100, -1, 1);
}

function severity(state: RiskState): number {
  return RISK_STATES.indexOf(state);
}

function labelFor(horizon: ForecastHorizon): string {
  return horizon === 'CURRENT' ? 'now' : horizon === 'H24' ? '+24h' : horizon === 'H72' ? '+72h' : '+7d';
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function clamp100(value: number): number {
  return clamp(value, 0, 100);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function round01(value: number): number {
  return Math.round(clamp(value, 0, 1) * 100) / 100;
}
