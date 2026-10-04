import type {
  MonitoringPoint,
  Observation,
  RiskAssessment,
  RiskComponent,
  ScenarioRun,
  Zone,
} from '@ecostream/shared';
import { RISK_THRESHOLDS, RISK_WEIGHTS, riskStateFromScore } from '@ecostream/shared';
import { analyzeZone } from '../analysis';
import type { ZoneAnalysis } from '../analysis';
import { spatialInflowScore } from './propagation';
import { anomalyComponent, ecosystemComponent, runoffComponent, trendComponent } from './components';
import { buildEvidence } from './evidence';
import { buildRiskExplanation } from '../explanation/engine';

/**
 * Demo clock. Baseline "now" = end of the 72h synthetic window. While a
 * scenario run is active, "now" advances to 6h into the event — near its peak
 * impact — so the twin assesses conditions as they are DURING the incident.
 */
const BASE_EPOCH_MS = Date.parse('2026-04-01T00:00:00Z');
const BASELINE_END_H = 72;
const RUN_NOW_H = 78; // 6h after run onset

export function nowForRun(activeRunId: string | null): string {
  return new Date(BASE_EPOCH_MS + (activeRunId ? RUN_NOW_H : BASELINE_END_H) * 3_600_000).toISOString();
}

export function baselineNowTs(): string {
  return nowForRun(null);
}

export interface RiskInput {
  zone: Zone;
  observations: Observation[];
  points: MonitoringPoint[];
  upstream: { assessment: RiskAssessment; distanceM: number }[];
  activeRun: ScenarioRun | null;
  nowTs: string;
}

/** |z| at or beyond this magnitude escalates the state to EARLY_WARNING. */
const EXTREME_Z_SIGMAS = 10;

/** Compose one zone's risk from analysis + upstream propagation. Pure. */
export function computeZoneRisk(input: RiskInput): { assessment: RiskAssessment; analysis: ZoneAnalysis } {
  const { zone, observations, points, upstream, activeRun, nowTs } = input;
  const variables = [...new Set(points.flatMap((p) => p.variables))];
  const analysis = analyzeZone(observations, variables, nowTs);
  const simulated = activeRun !== null;

  const comps: { id: keyof typeof RISK_WEIGHTS; cs: { score: number; summary: string } }[] = [
    { id: 'anomaly', cs: anomalyComponent(analysis) },
    { id: 'runoff', cs: runoffComponent(zone, analysis) },
    { id: 'trend', cs: trendComponent(analysis) },
    { id: 'ecosystem', cs: ecosystemComponent(analysis) },
    { id: 'spatial', cs: spatialInflowScore(upstream) },
  ];

  const components: RiskComponent[] = comps.map(({ id, cs }) => ({
    id,
    score: Math.round(cs.score * 10) / 10,
    weight: RISK_WEIGHTS[id],
    summary: cs.summary,
  }));

  let score =
    Math.round(comps.reduce((s, { id, cs }) => s + RISK_WEIGHTS[id] * cs.score, 0) * 10) / 10;

  // Extreme-reading escalation (alerting-protocol convention): a single
  // variable deviating ≥ EXTREME_Z sigmas from its window median forces the
  // composite to at least the EARLY_WARNING threshold. Without it, extreme
  // evidence dilutes into a sub-threshold weighted average.
  const worstZ = Math.max(...[...analysis.perVariable.values()].map((r) => Math.abs(r.anomaly.z)));
  if (worstZ >= EXTREME_Z_SIGMAS) {
    score = Math.max(score, RISK_THRESHOLDS.EARLY_WARNING + 3);
  }

  const spread = Math.max(...comps.map((c) => c.cs.score)) - Math.min(...comps.map((c) => c.cs.score));
  const confidence = Math.round(
    (0.35 + 0.45 * analysis.completeness.completeness + 0.2 * (1 - spread / 100)) * 100,
  ) / 100;

  const state = riskStateFromScore(score);
  const evidence = buildEvidence(
    zone,
    analysis,
    comps,
    observations,
    points,
    nowTs,
    simulated,
    activeRun?.id ?? null,
  );
  const explanation = buildRiskExplanation(
    score,
    state,
    confidence,
    components,
    evidence,
    simulated ? 'SIMULATED' : 'OBSERVED',
  );

  return {
    assessment: {
      zoneId: zone.id,
      scenarioRunId: activeRun?.id ?? null,
      score,
      state,
      confidence,
      components,
      evidence,
      explanation,
      computedAt: nowTs,
    },
    analysis,
  };
}
