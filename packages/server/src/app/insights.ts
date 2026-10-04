import type {
  Forecast,
  OneHealthSnapshot,
  OneHealthWatershedSummary,
  RiskComparison,
  RiskExplanation,
  RiskAssessment,
  WaterVariable,
} from '@ecostream/shared';
import { analyzeZone } from '../analysis';
import { compareZone } from '../comparison/engine';
import { toRiskExplanation } from '../explanation/engine';
import { forecastZone } from '../forecast/engine';
import { aggregateOneHealth, calculateZoneOneHealth } from '../one-health/engine';
import { baselineNowTs, nowForRun } from '../risk/engine';
import type { EcoStore } from '../db/store';

export interface ZoneInsightBundle {
  explanation: RiskExplanation;
  forecast: Forecast;
  oneHealth: OneHealthSnapshot;
  comparison: RiskComparison;
}

export function zoneInsights(store: EcoStore, zoneId: string): ZoneInsightBundle | null {
  const zone = store.zone(zoneId);
  if (!zone) return null;
  const activeRun = store.activeRun() ?? null;
  const runId = activeRun?.id ?? null;
  const assessment = store.assessmentFor(zoneId, runId);
  const baselineAssessment = store.assessmentFor(zoneId, null);
  if (!assessment || !baselineAssessment) return null;
  const points = store.pointsForZone(zoneId);
  const variables = [...new Set(points.flatMap((point) => point.variables))] as WaterVariable[];
  const observations = store.effectiveObservations(zoneId, runId);
  const nowTs = nowForRun(runId);
  const analysis = analyzeZone(observations, variables, nowTs);
  const baselineObservations = store.effectiveObservations(zoneId, null);
  const comparison = compareZone({
    zone,
    points,
    baselineObservations,
    scenarioObservations: observations,
    baselineAssessment,
    scenarioAssessment: activeRun ? assessment : null,
    baselineNowTs: baselineNowTs(),
    scenarioNowTs: nowTs,
  });
  return {
    explanation: toRiskExplanation(assessment),
    forecast: forecastZone({
      zoneId,
      scenarioRunId: runId,
      assessment,
      observations,
      variables,
      nowTs,
    }),
    oneHealth: calculateZoneOneHealth({ zone, assessment, analysis, generatedAt: nowTs }),
    comparison,
  };
}

export function watershedOneHealth(store: EcoStore): OneHealthWatershedSummary {
  const activeRun = store.activeRun() ?? null;
  const runId = activeRun?.id ?? null;
  const assessments = store.assessments.filter((assessment) => assessment.scenarioRunId === runId);
  const snapshots = store.zones.flatMap((zone) => {
    const assessment = assessments.find((candidate) => candidate.zoneId === zone.id);
    if (!assessment) return [];
    const points = store.pointsForZone(zone.id);
    const variables = [...new Set(points.flatMap((point) => point.variables))] as WaterVariable[];
    const nowTs = nowForRun(runId);
    const analysis = analyzeZone(store.effectiveObservations(zone.id, runId), variables, nowTs);
    return [calculateZoneOneHealth({ zone, assessment, analysis, generatedAt: nowTs })];
  });
  return aggregateOneHealth(store.zones, assessments, snapshots, nowForRun(runId));
}
