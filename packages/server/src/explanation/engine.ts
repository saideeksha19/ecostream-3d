import type {
  EvidenceItem,
  Provenance,
  RiskAssessment,
  RiskComponent,
  RiskExplanation,
  RiskState,
} from '@ecostream/shared';
import { RISK_COMPONENT_LABELS } from '@ecostream/shared';

/**
 * Deterministic explainability layer. It only restates the risk components and
 * evidence produced by the analysis pipeline; it does not infer facts or use
 * a language model.
 */
export function buildRiskExplanation(
  score: number,
  state: RiskState,
  confidence: number,
  components: RiskComponent[],
  evidence: EvidenceItem[],
  provenance: Provenance,
): string {
  const drivers = evidence
    .filter((item) => item.component !== 'scenario' && item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  const driverText = drivers.length
    ? drivers.map((item, index) => `${index + 1}. ${item.statement}`).join(' ')
    : 'No material component signal was available.';
  const weightedTotal = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const floorNote = score > weightedTotal + 1
    ? ' The final score also includes the extreme-reading escalation floor.'
    : '';

  return `Risk is ${state.replaceAll('_', ' ')} at ${score.toFixed(1)}/100. Risk is driven primarily by: ${driverText} Confidence: ${(confidence * 100).toFixed(0)}%. Evidence provenance: ${provenance}.${floorNote}`;
}

export function toRiskExplanation(assessment: RiskAssessment): RiskExplanation {
  return {
    zoneId: assessment.zoneId,
    scenarioRunId: assessment.scenarioRunId,
    riskScore: assessment.score,
    riskState: assessment.state,
    confidence: assessment.confidence,
    components: assessment.components,
    evidence: assessment.evidence,
    explanation: assessment.explanation ?? 'No explanation is available for this assessment.',
    // The explanation itself is calculated. Its evidence items retain the
    // underlying OBSERVED/SIMULATED provenance separately.
    provenance: 'DERIVED',
  };
}

export { RISK_COMPONENT_LABELS };
