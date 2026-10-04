import type {
  EvidenceItem,
  MonitoringPoint,
  Observation,
  RiskComponentId,
  Zone,
} from '@ecostream/shared';
import { RISK_COMPONENT_LABELS, VARIABLE_META } from '@ecostream/shared';
import type { ZoneAnalysis } from '../analysis';
import type { ComponentScore } from './components';

/**
 * Evidence builder: turns analysis output into per-component evidence items.
 * The numeric fields are selected from the actual latest reading and the
 * actual trailing window, so the explanation never invents measurements.
 */
export function buildEvidence(
  zone: Zone,
  analysis: ZoneAnalysis,
  comps: { id: RiskComponentId; cs: ComponentScore }[],
  observations: Observation[],
  points: MonitoringPoint[],
  nowTs: string,
  simulated: boolean,
  runId: string | null,
): EvidenceItem[] {
  const prov = simulated ? 'SIMULATED' : 'OBSERVED';
  const items: EvidenceItem[] = [];
  let n = 0;
  const push = (item: Omit<EvidenceItem, 'id' | 'zoneId'>): void => {
    n += 1;
    items.push({ id: `${zone.id}-ev${n}`, zoneId: zone.id, ...item });
  };

  for (const { id, cs } of comps) {
    const variable = variableForComponent(id, analysis);
    const result = variable ? analysis.perVariable.get(variable) : undefined;
    const reading = variable
      ? observations
          .filter((observation) => observation.variable === variable && observation.ts <= nowTs)
          .sort((a, b) => a.ts.localeCompare(b.ts))
          .at(-1)
      : undefined;
    const point = reading ? points.find((candidate) => candidate.id === reading.pointId) : undefined;
    const baseline = result ? median(result.window.values) : null;
    const readingFields = reading
      ? {
          sourceRef: reading.pointId,
          sourceLabel: point?.name ?? reading.pointId,
          ...(variable ? { variable } : {}),
          unit: reading.unit,
          measuredValue: reading.value,
          ...(baseline !== null ? { baselineValue: baseline } : {}),
          ...(result ? { anomaly: result.anomaly.z } : {}),
        }
      : {};
    const readingDetail = reading
      ? ` · ${point?.name ?? reading.pointId}: latest ${reading.value.toFixed(2)} ${reading.unit}${baseline !== null ? ` vs window median ${baseline.toFixed(2)} ${reading.unit}` : ''}`
      : '';

    push({
      component: id,
      statement: `${RISK_COMPONENT_LABELS[id]}: ${Math.round(cs.score)}/100`,
      detail: `${cs.summary}${readingDetail} · ${analysis.analyzerVersion} · window ${analysis.completeness.actual}/${analysis.completeness.expected} obs`,
      provenance: prov,
      contribution: Math.round(cs.score * WEIGHTS[id] * 10) / 10,
      ...readingFields,
    });
  }

  // Scenario provenance note, when the state comes from a run.
  if (simulated && runId) {
    push({
      component: 'scenario',
      statement: 'Values include SIMULATED scenario observations',
      detail: `Observations from scenario run ${runId} are synthetic perturbations, not measurements. Baseline data remains SYNTHETIC DEMO.`,
      provenance: 'SIMULATED',
      contribution: 0,
      sourceRef: runId,
    });
  }
  return items;
}

function variableForComponent(
  id: RiskComponentId,
  analysis: ZoneAnalysis,
): keyof typeof VARIABLE_META | null {
  if (id === 'runoff') return analysis.perVariable.has('water_level') ? 'water_level' : null;
  if (id === 'anomaly') {
    return [...analysis.perVariable.entries()].sort((a, b) => Math.abs(b[1].anomaly.z) - Math.abs(a[1].anomaly.z))[0]?.[0] ?? null;
  }
  if (id === 'trend') {
    return [...analysis.perVariable.entries()].sort((a, b) => b[1].trend.score - a[1].trend.score)[0]?.[0] ?? null;
  }
  if (id === 'ecosystem') {
    const candidates = ['dissolved_oxygen', 'turbidity', 'temperature'] as const;
    return candidates.find((variable) => analysis.perVariable.has(variable)) ?? null;
  }
  return null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] ?? null : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

const WEIGHTS: Record<RiskComponentId, number> = {
  anomaly: 0.3,
  runoff: 0.2,
  trend: 0.2,
  ecosystem: 0.2,
  spatial: 0.1,
};
