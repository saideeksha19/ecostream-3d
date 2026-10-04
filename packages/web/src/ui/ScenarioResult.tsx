import type { RiskComparison } from '@ecostream/shared';
import { formatForecastDelta } from './forecast';
import { Provenance, RiskStateLabel } from './Primitives';

export type AnalysisTab = 'ZONE' | 'EVIDENCE' | 'FORECAST' | 'ONE HEALTH';

/** A reading guide for the backend's comparison, never a second scenario engine. */
export function ScenarioResult({ comparison, onView }: { comparison: RiskComparison; onView: (view: AnalysisTab) => void }) {
  if (!comparison.scenario) return null;
  return <section className="scenario-result" aria-label="Scenario result">
    <div className="section-heading"><h3>Scenario result</h3><Provenance value="SIMULATED" /></div>
    <div className="result-scores">
      <div><span>BASELINE</span><strong>{comparison.baseline.score.toFixed(1)}</strong><RiskStateLabel state={comparison.baseline.state} /></div>
      <span aria-hidden="true">→</span>
      <div><span>SCENARIO</span><strong>{comparison.scenario.score.toFixed(1)}</strong><RiskStateLabel state={comparison.scenario.state} /></div>
    </div>
    <div className="result-delta"><span>Risk score delta</span><b>{formatForecastDelta(comparison.scoreDelta)} <small>pts</small></b></div>
    <details className="result-indicators"><summary>What changed? <span>{comparison.changedObservations.length} indicators</span></summary>
      {comparison.changedObservations.map((observation) => <div className="delta-row" key={observation.variable}><span>{observation.label}</span><span>{observation.baseline?.toFixed(2) ?? '—'} → {observation.scenario?.toFixed(2) ?? '—'} {observation.unit}</span></div>)}
      {!comparison.changedObservations.length && <p className="muted-line">No stored observation changed for this zone.</p>}
      <button className="result-link" onClick={() => onView('EVIDENCE')}>Inspect the complete comparison →</button>
    </details>
    <nav className="result-next" aria-label="Follow the scenario result">
      <button onClick={() => onView('EVIDENCE')}><span>Why did it change?</span><b>EVIDENCE ↗</b></button>
      <button onClick={() => onView('FORECAST')}><span>What could happen next?</span><b>FORECAST ↗</b></button>
      <button onClick={() => onView('ONE HEALTH')}><span>What connected signals matter?</span><b>ONE HEALTH ↗</b></button>
    </nav>
  </section>;
}
