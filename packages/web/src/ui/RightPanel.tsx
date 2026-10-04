import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useApp } from '../store';
import { ZoneView } from './ZoneView';
import { EvidenceView } from './EvidenceView';
import { ForecastView } from './ForecastView';
import { OneHealthView } from './OneHealthView';
import { currentZoneDetail, type ZoneDetailDTO } from './presentation';
import { RiskStateLabel } from './Primitives';
import { ScenarioResult } from './ScenarioResult';

const TABS = ['ZONE', 'EVIDENCE', 'FORECAST', 'ONE HEALTH'] as const;
type Tab = typeof TABS[number];

/**
 * Right-side zone analysis panel. It never hard-codes baseline values: every
 * number on screen is read from the store's currentZoneDetail(), which is the
 * full ZoneDetailDTO returned by the backend.
 *
 * Two contexts are possible:
 *   - baseline (activeRun === null): detail.assessment + detail.comparison?
 *   - scenario run:            detail.assessment (updated by the run) +
 *                                detail.comparison? carries baseline ->
 *                                scenario.
 */
export function RightPanel() {
  const selectedZoneId = useApp((s) => s.selectedZoneId);
  const select = useApp((s) => s.select);
  const zones = useApp((s) => s.zones);
  const storedDetail = useApp((s) => s.detail);
  const activeRun = useApp((s) => s.activeRun);
  const liveAssessment = useApp((s) => selectedZoneId ? s.assessments.get(selectedZoneId) : undefined);
  const watershedHealth = useApp((s) => s.watershedHealth);
  const error = useApp((s) => s.error);
  const busy = useApp((s) => s.busy);
  const [tab, setTab] = useState<Tab>('ZONE');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const zone = zones.find((item) => item.id === selectedZoneId);
  const detail = currentZoneDetail(storedDetail, selectedZoneId, activeRun) as ZoneDetailDTO | null;

  const assessment = useMemo(() => {
    if (liveAssessment) return liveAssessment;
    return detail?.assessment ?? null;
  }, [liveAssessment, detail]);

  const accumulatedEvidence = useMemo(() => {
    if (!detail) return 0;
    return assessment ? assessment.evidence.length : 0;
  }, [detail, assessment]);



  const selectZone = useCallback(
    (value: string | null) => {
      select(value ?? null);
    },
    [select],
  );

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(TABS[next]!);
    tabRefs.current[next]?.focus();
  }

  return (
    <aside className="panel panel-right" aria-label="Selected zone analysis">
      <div className="analysis-heading">
        <span className="eyebrow">ZONE ANALYSIS</span>
        <span className="technical-label">{zone ? zone.id.toUpperCase() : 'INSPECT'}</span>
      </div>
      <label className="sr-only" htmlFor="zone-picker">Select watershed zone</label>
      <select
        className="zone-picker"
        id="zone-picker"
        value={selectedZoneId ?? ''}
        onChange={(event) => selectZone(event.target.value || null)}
      >
        <option value="">Select a watershed zone</option>
        {zones.map((item) => (
          <option key={item.id} value={item.id}>
            {item.id.toUpperCase()} · {item.name}
          </option>
        ))}
      </select>

      {zone && (
        <div className="zone-head">
          <h2 className="zone-name">{zone.name}</h2>
          <div className="zone-meta">
            <span>{zone.id.toUpperCase()}</span>
            <span>{zone.kind.replaceAll('_', ' ')}</span>
            <span>SELECTED ZONE</span>
          </div>
        </div>
      )}

      <div className="tab-row" role="tablist" aria-label="Selected zone views">
        {TABS.map((item, index) => (
          <button
            key={item}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`tab-${index}`}
            role="tab"
            aria-selected={tab === item}
            aria-controls={`view-${index}`}
            tabIndex={tab === item ? 0 : -1}
            className={`tab-btn ${tab === item ? 'tab-btn-active' : ''}`}
            onClick={() => setTab(item)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            {item}
          </button>
        ))}
      </div>

      <div
        className="analysis-content"
        id={`view-${TABS.indexOf(tab)}`}
        role="tabpanel"
        aria-labelledby={`tab-${TABS.indexOf(tab)}`}
        tabIndex={0}
        aria-busy={Boolean(selectedZoneId && detail === null && !error)}
      >
        {!selectedZoneId ? (
          <ZoneDirectory />
        ) : (
          <>
            {!detail || !assessment ? (
              <div className="empty-hint" role="status">
                <p>Loading zone assessment and model outputs…</p>
              </div>
            ) : error ? (
              <div className="empty-hint" role="alert">
                <strong>Zone detail unavailable</strong>
                <p>The latest request failed. Retry to inspect the current evidence.</p>
                <button className="btn" onClick={() => selectZone(selectedZoneId)}>
                  Retry zone detail
                </button>
              </div>
            ) : (
              <>
                <ZoneView assessment={assessment} detail={detail} />

                {detail.comparison?.scenario && !assessment.scenarioRunId && (
                  <ScenarioResult
                    comparison={detail.comparison}
                    onView={(view) => {
                      setTab(view);
                      tabRefs.current[TABS.indexOf(view)]?.focus();
                    }}
                  />
                )}

                {tab === 'EVIDENCE' && (
                  <EvidenceView
                    assessment={assessment}
                    comparison={detail.comparison}
                    explanation={detail.explanation?.explanation ?? assessment.explanation}
                  />
                )}

                {tab === 'FORECAST' && <ForecastView forecast={detail.forecast} />}

                {tab === 'ONE HEALTH' && (
                  <OneHealthView snapshot={detail.oneHealth} watershed={watershedHealth} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ZoneDirectory() {
  const zones = useApp((s) => s.zones);
  const assessments = useApp((s) => s.assessments);
  const select = useApp((s) => s.select);
  const highest = useApp((s) => s.watershedHealth?.highestConcern);
  return (
    <>
      <div className="empty-hint">
        <span className="eyebrow">FROM PLACE TO EVIDENCE</span>
        <h2>Explore the watershed</h2>
        <p>Select a zone on the terrain or below. Inspect its risk contributors, source evidence and possible trajectories.</p>
      </div>
      {highest && (
        <button className="concern-link" onClick={() => select(highest.zoneId)}>
          <span className="eyebrow">HIGHEST CURRENT CONCERN</span>
          <strong>
            {highest.zoneName}
            <span aria-hidden="true">↗</span>
          </strong>
          <RiskStateLabel state={highest.state} />
        </button>
      )}
      <h3 className="section-title">Watershed zones <span>{zones.length || '—'}</span></h3>
      <div className="zone-directory">
        {zones.map((zone) => (
          <button key={zone.id} onClick={() => select(zone.id)}>
            <span className="technical-label">{zone.id.toUpperCase()}</span>
            <span>{zone.name}</span>
            <b>{assessments.get(zone.id)?.score.toFixed(1) ?? '—'}</b>
          </button>
        ))}
      </div>
    </>
  );
}
