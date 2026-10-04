import type { RiskAssessment } from '@ecostream/shared';
import { RISK_COMPONENT_LABELS } from '@ecostream/shared';
import type { ZoneDetailDTO } from '../services/api';
import { Meter, RiskStateLabel, Provenance } from './Primitives';

/**
 * Zone risk summary for the RIGHT panel.
 *
 * The component never owns risk logic and never hard-codes numbers. It renders
 * the exact RiskAssessment the backend produced. When the component is used in
 * a scenario run the server already replaced the zone assessment with the run's
 * recomputed values; at baseline it renders OBSERVED input context.
 */
export function ZoneView({ assessment, detail }: { assessment: RiskAssessment; detail: ZoneDetailDTO | null }) {
  return (
    <>
      <section className="risk-block" aria-label="Selected zone risk">
        <RiskStateLabel state={assessment.state} />
        <div className="risk-score-row">
          <strong className="risk-score">{assessment.score.toFixed(1)}</strong>
          <div>
            <span>RISK SCORE</span>
            <small>OUT OF 100</small>
          </div>
          <Provenance value="OBSERVED" />
        </div>
        <div className="confidence-row">
          <span>Confidence</span>
          <strong>
            {(assessment.confidence * 100).toFixed(0)}
            <small>%</small>
          </strong>
        </div>
        <Meter value={assessment.confidence * 100} label="Assessment confidence" />
        <div className="input-provenance">
          <span>Input context</span>
          {assessment.scenarioRunId ? (
            <Provenance value="SIMULATED" />
          ) : (
            <span className="technical-label">BASELINE DATA</span>
          )}
        </div>
        <p className="fine-print">
          {assessment.scenarioRunId
            ? 'Scenario context: risk is recomputed from simulated observations.'
            : 'Baseline observations and citizen reports are synthetic.'}
        </p>
      </section>

      <h3 className="section-title">Risk contributors <Provenance value="DERIVED" /></h3>
      <div className="comp-list compact-components">
        {assessment.components.map((component) => (
          <div className="comp-row" key={component.id} title={component.summary}>
            <div className="comp-top">
              <span>{RISK_COMPONENT_LABELS[component.id]}</span>
              <b>{component.score.toFixed(1)}</b>
            </div>
            <Meter value={component.score} label={RISK_COMPONENT_LABELS[component.id]} />
          </div>
        ))}
      </div>

      <h3 className="section-title">Environmental indicators</h3>
      {detail?.indicators.length ? (
        <div className="ind-list">
          {detail.indicators.map((indicator) => (
            <div className={`ind-row ${indicator.isAnomaly ? 'ind-anom' : ''}`} key={indicator.variable}>
              <span className="ind-label">{indicator.label}</span>
              <span className="ind-value">
                {indicator.latest?.toFixed(2) ?? '—'} <em>{indicator.unit}</em>
              </span>
              <div className="ind-source">
                {indicator.provenance && <Provenance value={indicator.provenance} />}
                {indicator.isAnomaly && <span className="ind-flag">ANOMALY</span>}
                <time dateTime={indicator.ts ?? undefined} title={indicator.ts ?? 'No timestamp'}>
                  {indicator.ts ? `${new Date(indicator.ts).toISOString().slice(11, 16)} UTC` : 'No reading'}
                </time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-line">No indicators available for this zone.</p>
      )}

      <p className="panel-callout">
        Open <strong>EVIDENCE</strong> to inspect source readings and comparisons, <strong>FORECAST</strong> for the
        +24h, +72h and +7d trajectory. All values are the current backend-determined assessment.
      </p>
    </>
  );
}
