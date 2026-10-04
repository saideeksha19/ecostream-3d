import { SCENARIO_CATALOG, useApp } from '../store';
import type { HealthDTO } from '../services/api';
import { TwinViewport } from '../components/TwinViewport';
import { AppLink } from '../navigation/Router';
import { TopBar } from '../ui/TopBar';
import { LeftPanel } from '../ui/LeftPanel';
import { RightPanel } from '../ui/RightPanel';
import { RiskStateLabel } from '../ui/Primitives';

/**
 * Digital Twin route layout:
 *   LEFT  = Watershed Intelligence + scenario workstation
 *   CENTER = working 3D watershed (unchanged)
 *   RIGHT = live zone analysis panel (no hard-coded values)
 *
 * RightPanel reads every value from the store, which is the single source of
 * truth for bootstrap, select, runScenario and reset. The backend APIs
 * provide all of the numbers below: zone, assessment, indicators, series,
 * explanation, forecast, oneHealth, comparison.
 */
export function DigitalTwin({ health }: { health: HealthDTO | null }) {
  const error = useApp((s) => s.error);
  const activeRun = useApp((s) => s.activeRun);
  const busy = useApp((s) => s.busy);
  const meta = useApp((s) => s.meta);
  const zones = useApp((s) => s.zones);
  const selectedZoneId = useApp((s) => s.selectedZoneId);
  const assessment = useApp((s) => selectedZoneId ? s.assessments.get(selectedZoneId) : undefined);
  const selected = zones.find((zone) => zone.id === selectedZoneId);
  const scenario = SCENARIO_CATALOG.find((item) => item.id === activeRun?.scenarioId);

  return (
    <>
      <div className="app twin-app">
        <TopBar health={health} />
        {error && (
          <div className="error-banner" role="alert">
            <strong>REQUEST FAILED</strong>
            <span>{error}</span>
            <span>Displayed values may be out of date.</span>
          </div>
        )}
        <main className="main" id="main-content" tabIndex={-1}>
          <LeftPanel />

          <section className="stage" id="watershed-view" aria-label="Interactive 3D watershed" tabIndex={-1}>
            <div className="stage-heading">
              <div>
                <div className="eyebrow">IMMERSIVE URBAN WATERSHED</div>
                <h2>Digital twin</h2>
              </div>
              <span className="view-label">3D TERRAIN <span>/</span> LOCAL MODEL</span>
            </div>

            <div
              className={`run-banner ${activeRun ? 'run-banner-active' : ''}`}
              role="status"
              aria-live="polite"
            >
              <span className="run-state">
                <i />
                {activeRun ? 'SIMULATION ACTIVE' : 'BASELINE CONDITIONS'}
              </span>
              {activeRun && (
                <>
                  <strong>{scenario?.name ?? activeRun.scenarioId.replaceAll('_', ' ')}</strong>
                  <span className="run-params">
                    {Object.entries(activeRun.params)
                      .map(([key, value]) => `${key} ${value.toFixed(1)}`)
                      .join(' · ')}
                  </span>
                  <span className="scenario-data">SCENARIO DATA</span>
                </>
              )}
              {!activeRun && <span className="baseline-note">Synthetic observation dataset</span>}
            </div>

            <TwinViewport className="scene-viewport">
              <div className="scene-caption">
                <span>LOCAL WATERSHED MODEL</span>
                <span>Illustrative geography · synthetic data</span>
              </div>
            </TwinViewport>

            <div className="scene-toolbar">
              <div className="scene-selection">
                {selected ? (
                  <>
                    <span className="selection-id">{selected.id.toUpperCase()}</span>
                    <strong>{selected.name}</strong>
                    {assessment && <RiskStateLabel state={assessment.state} />}
                  </>
                ) : (
                  <>
                    <span className="selection-crosshair" aria-hidden="true">
                      ⌖
                    </span>
                    <span>Select a zone to explore its evidence</span>
                  </>
                )}
              </div>
              <div className="camera-hint">
                DRAG <span>orbit</span> · SCROLL <span>zoom</span> · RIGHT DRAG <span>pan</span>
              </div>
            </div>
          </section>

          <RightPanel />
        </main>

        <footer className="statusbar">
          <span title={meta?.provenanceNotice}>
            <i className="status-dot" /> DATA <b>SYNTHETIC / DEMONSTRATION</b>
          </span>
          <span>
            MODEL <b>DETERMINISTIC · NON-CALIBRATED</b>
          </span>
          <span>
            OBSERVATIONS{' '}
            <b>{health?.observations.toLocaleString() ?? '—'}</b>
          </span>
          <span>
            STATE{' '}
            <b className={activeRun ? 'text-simulation' : ''}>
              {busy ? 'RECALCULATING' : activeRun ? 'SIMULATION' : 'BASELINE'}
            </b>
          </span>
        </footer>
      </div>

      <section className="twin-continuation" aria-label="Continue the EcoStream story">
        <span>BEYOND THE MODEL</span>
        <AppLink href="/#how-it-works">
          How everything connects <span aria-hidden="true">↗</span>
        </AppLink>
        <AppLink href="/#conclusion">The bigger picture →</AppLink>
      </section>
    </>
  );
}
