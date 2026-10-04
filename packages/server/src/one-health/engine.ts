import type {
  OneHealthBand,
  OneHealthDimension,
  OneHealthSnapshot,
  OneHealthWatershedSummary,
  RiskAssessment,
  RiskState,
  Zone,
} from '@ecostream/shared';
import { RISK_STATES, RISK_COMPONENT_LABELS } from '@ecostream/shared';
import type { ZoneAnalysis } from '../analysis';

export interface OneHealthInput {
  zone: Zone;
  assessment: RiskAssessment;
  analysis: ZoneAnalysis;
  generatedAt: string;
}

/**
 * Transparent One Health proxy. These are environmental decision-support
 * indices only: no population, disease, diagnosis, or medical outcome is
 * inferred from them.
 */
export function calculateZoneOneHealth(input: OneHealthInput): OneHealthSnapshot {
  const component = (id: keyof typeof RISK_COMPONENT_LABELS): number =>
    input.assessment.components.find((item) => item.id === id)?.score ?? 0;
  const observedStress = directObservationStress(input.analysis);
  const environmental = weighted([component('anomaly'), component('runoff'), component('trend'), observedStress], [0.4, 0.25, 0.15, 0.2]);
  const ecosystem = component('ecosystem');
  const exposureWeight = EXPOSURE_WEIGHTS[input.zone.kind];
  const humanExposure = clamp100(environmental * 0.65 + input.zone.imperviousness * exposureWeight * 35);
  const community = clamp100(humanExposure * 0.5 + environmental * 0.3 + ecosystem * 0.2);
  const overall = weighted([environmental, ecosystem, humanExposure, community], [0.3, 0.25, 0.25, 0.2]);
  const provenance = 'DERIVED' as const;
  const dimensions: OneHealthDimension[] = [
    dimension('environment', environmental, 'Derived from anomaly, runoff exposure and recent deterioration components.', input.zone.id, provenance),
    dimension('ecosystem', ecosystem, 'Derived from dissolved oxygen, temperature and turbidity stress indicators.', input.zone.id, provenance),
    dimension('exposure', humanExposure, `Uses imperviousness and the ${input.zone.kind.replaceAll('_', ' ')} exposure weighting.`, input.zone.id, provenance),
    dimension('community', community, 'Transparent proxy combining environmental stress, ecosystem stress and human exposure.', input.zone.id, provenance),
  ];
  const drivers = input.assessment.evidence
    .filter((item) => item.component !== 'scenario' && item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((item) => item.statement);

  return {
    zoneId: input.zone.id,
    scenarioRunId: input.assessment.scenarioRunId,
    dimensions,
    overallSignal: band(overall),
    overallIndex: round(overall),
    drivers,
    dataStatus: 'DEMONSTRATION / SYNTHETIC DATA',
    decisionNote: 'Environmental-to-community signal for decision support only; not a medical diagnosis or health outcome prediction.',
    generatedAt: input.generatedAt,
  };
}

export function aggregateOneHealth(
  zones: Zone[],
  assessments: RiskAssessment[],
  snapshots: OneHealthSnapshot[],
  generatedAt: string,
): OneHealthWatershedSummary {
  const average = (id: OneHealthDimension['id']): number => {
    const values = snapshots.flatMap((snapshot) => snapshot.dimensions.filter((dimension) => dimension.id === id).map((dimension) => dimension.index));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const highest = assessments.slice().sort((a, b) => b.score - a.score)[0];
  const highestZone = highest ? zones.find((zone) => zone.id === highest.zoneId) : undefined;
  return {
    scenarioRunId: assessments[0]?.scenarioRunId ?? null,
    zoneCount: zones.length,
    environmentalStress: round(average('environment')),
    ecosystemStress: round(average('ecosystem')),
    humanExposure: round(average('exposure')),
    activeAlerts: assessments.filter((assessment) => severity(assessment.state) >= severity('INVESTIGATE')).length,
    highestConcern: highest && highestZone
      ? { zoneId: highest.zoneId, zoneName: highestZone.name, score: highest.score, state: highest.state }
      : null,
    provenance: 'DERIVED',
    dataStatus: 'DEMONSTRATION / SYNTHETIC DATA',
    generatedAt,
  };
}

const EXPOSURE_WEIGHTS: Record<Zone['kind'], number> = {
  industrial: 1,
  urban_core: 0.95,
  commercial: 0.9,
  residential: 0.8,
  agricultural: 0.55,
  park: 0.35,
  riparian: 0.25,
};

function dimension(
  id: OneHealthDimension['id'],
  index: number,
  summary: string,
  zoneId: string,
  provenance: 'DERIVED',
): OneHealthDimension {
  return { id, band: band(index), index: round(index), summary, driverZoneIds: [zoneId], provenance };
}

function band(index: number): OneHealthBand {
  if (index >= 65) return 'HIGH';
  if (index >= 35) return 'ELEVATED';
  return 'LOW';
}

function weighted(values: number[], weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return clamp100(values.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0) / total);
}

function directObservationStress(analysis: ZoneAnalysis): number {
  const signals: number[] = [];
  for (const variable of ['water_level', 'turbidity'] as const) {
    const result = analysis.perVariable.get(variable);
    if (!result) continue;
    signals.push(Math.max(result.trend.score, Math.min(100, (Math.abs(result.anomaly.z) / 7.5) * 100)));
  }
  return signals.length ? signals.reduce((sum, value) => sum + value, 0) / signals.length : 0;
}

function severity(state: RiskState): number {
  return RISK_STATES.indexOf(state);
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
