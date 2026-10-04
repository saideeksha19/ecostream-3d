import { useMemo } from 'react';
import { useApp } from '../store';
import { Legend } from './TopBar';
import { ScenarioControl } from './ScenarioControl';
import { Meter, Provenance } from './Primitives';
import { currentZoneDetail, type ZoneDetailDTO } from './presentation';

/**
 * Left rail: watershed intelligence at the top, the currently selected zone's
 * risk breakdown in the middle and the scenario workstation at the bottom.
 *
 * Values come only from the existing store (watershedHealth, assessments,
 * detail) and the backend APIs - never hard-coded.
 */
export function LeftPanel() {
  const summary = useApp((s) => s.watershedHealth);
  const points = useApp((s) => s.points);
  const ready = useApp((s) => s.ready);
  const detail = useApp((s) => s.detail);
  const selectedZoneId = useApp((s) => s.selectedZoneId);
  const activeRun = useApp((s) => s.activeRun);
  const current = currentZoneDetail(detail, selectedZoneId, activeRun) as ZoneDetailDTO | null;

  const selectedRisk = useMemo(() => {
    if (!current || !selectedZoneId) return null;
    return current.assessment ?? null;
  }, [current, selectedZoneId]);

  const community = current?.oneHealth?.dimensions.find((dimension) => dimension.id === 'community');

  const sensors = points.filter((point) => point.kind === 'SENSOR').length;
  const citizens = points.filter((point) => point.kind === 'CITIZEN_REPORT').length;

  return (
    <aside className="panel panel-left" aria-label="Environmental intelligence">
      <section className="rail-section watershed-intro">
        <div className="eyebrow">WATERSHED INTELLIGENCE</div>
        <h1>Urban Watershed</h1>
        <span className="dataset-label">SYNTHETIC DEMONSTRATION</span>
      </section>

      <section className="rail-section" aria-labelledby="conditions-title">
        <div className="section-heading">
          <h2 id="conditions-title">Selected zone</h2>
          <Provenance value="DERIVED" />
        </div>
        {selectedZoneId && selectedRisk ? (
          <>
            <div className="condition">
              <div>
                <span>Risk score</span>
                <b>{selectedRisk.score.toFixed(1)}</b>
              </div>
              <Meter label="Selected zone risk" value={selectedRisk.score} />
            </div>
            <div className="condition">
              <div>
                <span>Risk state</span>
                <b>{selectedRisk.state.replaceAll('_', ' ')}</b>
              </div>
              <Meter label="Selected zone risk state" value={selectedRisk.state === 'NORMAL' ? 0 : 50} />
            </div>
            <div className="condition">
              <div>
                <span>Confidence</span>
                <b>{(selectedRisk.confidence * 100).toFixed(0)}%</b>
              </div>
              <Meter label="Selected zone confidence" value={selectedRisk.confidence * 100} />
            </div>
            <p className="fine-print">
              Indicators panel is in the RIGHT panel - all values are from the local API.
            </p>
          </>
        ) : selectedZoneId ? (
          <p className="fine-print">Loading the selected zone's assessment…</p>
        ) : (
          <p className="fine-print">Select a zone to inspect its risk on the right.</p>
        )}
      </section>

      <section className="rail-section" aria-labelledby="network-title">
        <div className="section-heading">
          <h2 id="network-title">Monitoring network</h2>
          <Provenance value="DERIVED" />
        </div>
        <div className="network-total">
          <strong>{ready ? points.length : '—'}</strong>
          <span>observation points</span>
        </div>
        <div className="network-types">
          <span>
            <i className="station-dot" />{ready ? sensors : '—'} sensors
          </span>
          <span>
            <i className="citizen-dot" />{ready ? citizens : '—'} citizen
          </span>
        </div>
        <p className="fine-print">Synthetic observations · no live feed</p>
      </section>

      <section className="rail-section" aria-labelledby="risk-legend-title">
        <div className="section-heading">
          <h2 id="risk-legend-title">Risk states</h2>
          <Provenance value="DERIVED" />
        </div>
        <Legend />
      </section>

      <ScenarioControl />
    </aside>
  );
}

function Condition({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="condition">
      <div>
        <span>{label}</span>
        <b>{value?.toFixed(1) ?? '—'}</b>
      </div>
      {value !== undefined ? <Meter label={label} value={value} /> : <div className="meter" />}
    </div>
  );
}
