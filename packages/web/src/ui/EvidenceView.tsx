import { RISK_COMPONENT_LABELS, type EvidenceItem, type RiskAssessment, type RiskComparison } from '@ecostream/shared';
import { Provenance, RiskStateLabel } from './Primitives';
import { formatForecastDelta as formatDelta } from './forecast';

export function EvidenceView({ assessment, comparison, explanation }: { assessment: RiskAssessment; comparison: RiskComparison | null; explanation: string | undefined }) {
  return <>
    <h3 className="section-title">Why this risk? <Provenance value="DERIVED" /></h3>
    <p className="explanation-text">{explanation ?? 'No explanation is available for this assessment.'}</p>
    {comparison?.scenario && <ComparisonView comparison={comparison} />}
    <details className="source-guide"><summary>Understanding source provenance</summary><div>{['OBSERVED', 'DERIVED', 'SIMULATED', 'HUMAN_VERIFIED', 'CITIZEN'].map((value) => <Provenance value={value} key={value} />)}</div><p>Observed and citizen inputs are synthetic in this demo. Derived outputs are calculations; simulated inputs come from scenarios. Human verification is only shown when recorded.</p></details>
    <h3 className="section-title">Assessment evidence <span>{assessment.evidence.length}</span></h3>
    <div className="ev-list">{assessment.evidence.map((evidence) => <EvidenceRow evidence={evidence} key={evidence.id} />)}</div>
    {!assessment.evidence.length && <p className="muted-line">No evidence items are available for this assessment.</p>}
    <details className="component-explanations"><summary>Component methodology &amp; weights</summary>{assessment.components.map((component) => <div className="comp-row" key={component.id}><div className="comp-top"><strong>{RISK_COMPONENT_LABELS[component.id]}</strong><span className="comp-meta">w {component.weight.toFixed(1)} · {component.score.toFixed(1)}</span></div><p className="comp-summary">{component.summary} <Provenance value="DERIVED" /></p></div>)}</details>
  </>;
}

function EvidenceRow({ evidence }: { evidence: EvidenceItem }) {
  return <article className={`ev-row ev-${evidence.provenance.toLowerCase()}`}>
    <div className="ev-meta"><Provenance value={evidence.provenance} /><span className="ev-contribution">{formatDelta(evidence.contribution)} pts</span></div>
    <h4 className="ev-statement">{evidence.statement}</h4><p className="ev-detail">{evidence.detail}</p>
    {evidence.measuredValue !== undefined && <div className="ev-measure">{evidence.provenance === 'SIMULATED' ? 'Scenario value' : 'Source value'} <b>{evidence.measuredValue.toFixed(2)} {evidence.unit ?? ''}</b>{evidence.baselineValue !== undefined && <span>Baseline {evidence.baselineValue.toFixed(2)}</span>}{evidence.anomaly !== undefined && <span>z {evidence.anomaly.toFixed(2)}</span>}</div>}
    {(evidence.sourceLabel || evidence.sourceRef) && <div className="source-reference">SOURCE / {evidence.sourceLabel ?? evidence.sourceRef}</div>}
  </article>;
}

function ComparisonView({ comparison }: { comparison: RiskComparison }) {
  if (!comparison.scenario) return null;
  return <section className="comparison-block" aria-label="Baseline to scenario comparison">
    <h3 className="section-title">Scenario comparison</h3>
    <div className="compare-head"><span>BASELINE</span><span aria-hidden="true">→</span><span>SCENARIO</span></div>
    <div className="compare-score"><strong>{comparison.baseline.score.toFixed(1)}</strong><b>→</b><strong>{comparison.scenario.score.toFixed(1)}</strong></div>
    <div className="compare-states"><RiskStateLabel state={comparison.baseline.state} /><RiskStateLabel state={comparison.scenario.state} /></div>
    <div className="compare-delta"><span>Risk score change</span><strong>{formatDelta(comparison.scoreDelta)} <small>pts</small></strong></div>
    <div className="provenance-line"><Provenance value={comparison.provenanceChange.baseline} /><span>→</span>{comparison.provenanceChange.scenario && <Provenance value={comparison.provenanceChange.scenario} />}</div>
    <h4 className="mini-title">Component changes</h4>
    {comparison.componentDeltas.map((component) => <div className="delta-row" key={component.id}><span>{component.label}</span><span>{component.baseline.toFixed(1)} → {component.scenario.toFixed(1)} <strong className={component.delta > 0 ? 'delta-up' : component.delta < 0 ? 'delta-down' : ''}>{formatDelta(component.delta)}</strong></span></div>)}
    <h4 className="mini-title">Changed observations</h4>
    {!comparison.changedObservations.length && <p className="muted-line">No stored observation changed for this zone.</p>}
    {comparison.changedObservations.map((observation) => <div className="observation-change" key={observation.variable}><div className="delta-row"><span>{observation.label}</span><span>{observation.baseline?.toFixed(1) ?? '—'} → {observation.scenario?.toFixed(1) ?? '—'} {observation.unit}<br /><strong>{observation.delta !== null ? formatDelta(observation.delta) : '—'}</strong></span></div><Provenance value={observation.provenance} /></div>)}
    <details className="new-evidence"><summary>New simulated evidence <span>{comparison.newEvidence.length}</span></summary>{comparison.newEvidence.map((evidence) => <EvidenceRow evidence={evidence} key={evidence.id} />)}{!comparison.newEvidence.length && <p className="muted-line">No new evidence for this zone.</p>}</details>
  </section>;
}
