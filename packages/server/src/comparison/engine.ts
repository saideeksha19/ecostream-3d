import type {
  ComponentComparison,
  MonitoringPoint,
  Observation,
  ObservationComparison,
  RiskAssessment,
  RiskComparison,
  RiskComparisonSide,
  RiskComponentId,
  Zone,
} from '@ecostream/shared';
import { RISK_COMPONENT_LABELS, VARIABLE_META } from '@ecostream/shared';

export interface ComparisonInput {
  zone: Zone;
  points: MonitoringPoint[];
  baselineObservations: Observation[];
  scenarioObservations: Observation[];
  baselineAssessment: RiskAssessment;
  scenarioAssessment: RiskAssessment | null;
  baselineNowTs: string;
  scenarioNowTs: string;
}

/** Compare stored baseline and scenario values without touching risk scores. */
export function compareZone(input: ComparisonInput): RiskComparison {
  const { baselineAssessment, scenarioAssessment } = input;
  const baseline = side(baselineAssessment, 'OBSERVED');
  if (!scenarioAssessment) {
    return {
      zoneId: input.zone.id,
      scenarioRunId: null,
      baseline,
      scenario: null,
      scoreDelta: 0,
      componentDeltas: [],
      changedObservations: [],
      newEvidence: [],
      provenanceChange: { baseline: 'OBSERVED', scenario: null },
    };
  }

  const scenario = side(scenarioAssessment, 'SIMULATED');
  const componentDeltas = (Object.keys(RISK_COMPONENT_LABELS) as RiskComponentId[]).map((id) => {
    const before = baselineAssessment.components.find((component) => component.id === id)?.score ?? 0;
    const after = scenarioAssessment.components.find((component) => component.id === id)?.score ?? 0;
    const weight = baselineAssessment.components.find((component) => component.id === id)?.weight ?? 0;
    return {
      id,
      label: RISK_COMPONENT_LABELS[id],
      baseline: round(before),
      scenario: round(after),
      delta: round(after - before),
      weightedDelta: round((after - before) * weight),
    } satisfies ComponentComparison;
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const variables = [...new Set(input.points.flatMap((point) => point.variables))];
  const changedObservations = variables
    .map((variable) => observationDelta(
      variable,
      input.points,
      input.baselineObservations,
      input.scenarioObservations,
      input.baselineNowTs,
      input.scenarioNowTs,
    ))
    .filter((item): item is ObservationComparison => item !== null && item.delta !== null && Math.abs(item.delta) >= 0.005)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  return {
    zoneId: input.zone.id,
    scenarioRunId: scenarioAssessment.scenarioRunId,
    baseline,
    scenario,
    scoreDelta: round(scenarioAssessment.score - baselineAssessment.score),
    componentDeltas,
    changedObservations,
    newEvidence: scenarioAssessment.evidence.filter((item) => item.provenance === 'SIMULATED'),
    provenanceChange: { baseline: 'OBSERVED', scenario: 'SIMULATED' },
  };
}

function side(assessment: RiskAssessment, provenance: 'OBSERVED' | 'SIMULATED'): RiskComparisonSide {
  return {
    score: assessment.score,
    state: assessment.state,
    confidence: assessment.confidence,
    components: assessment.components,
    provenance,
  };
}

function observationDelta(
  variable: keyof typeof VARIABLE_META,
  points: MonitoringPoint[],
  baseline: Observation[],
  scenario: Observation[],
  baselineNowTs: string,
  scenarioNowTs: string,
): ObservationComparison | null {
  const baselineReading = latestReading(baseline, variable, baselineNowTs);
  const scenarioReading = latestReading(scenario, variable, scenarioNowTs);
  if (!baselineReading && !scenarioReading) return null;
  const source = scenarioReading ?? baselineReading;
  const sourcePoint = source ? points.find((point) => point.id === source.pointId) : undefined;
  const before = baselineReading?.value ?? null;
  const after = scenarioReading?.value ?? null;
  return {
    variable,
    label: VARIABLE_META[variable].label,
    unit: VARIABLE_META[variable].unit,
    sourceRef: source?.pointId ?? null,
    sourceLabel: sourcePoint?.name ?? source?.pointId ?? null,
    baseline: before,
    scenario: after,
    delta: before !== null && after !== null ? round(after - before) : null,
    provenance: scenarioReading?.provenance === 'SIMULATED' ? 'SIMULATED' : 'OBSERVED',
  };
}

function latestReading(observations: Observation[], variable: keyof typeof VARIABLE_META, nowTs: string): Observation | undefined {
  return observations
    .filter((observation) => observation.variable === variable && observation.ts <= nowTs)
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .at(-1);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
