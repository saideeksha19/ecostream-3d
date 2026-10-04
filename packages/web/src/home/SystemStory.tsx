import type { HealthDTO } from '../services/api';
import { SCENARIO_CATALOG, useApp } from '../store';
import { AppLink } from '../navigation/Router';
import {
  ObservationNetwork,
  OneHealthFlow,
  PropagationNetwork,
  RiskComposition,
  ScenarioComposition,
  ForecastTrajectory,
} from './EditorialVisuals';

export function SystemStory({ health }: { health: HealthDTO | null }) {
  const ready = useApp((state) => state.ready);
  const zones = useApp((state) => state.zones);
  const points = useApp((state) => state.points);
  const river = useApp((state) => state.riverPath);
  const selectedId = useApp((state) => state.selectedZoneId);
  const highest = useApp((state) => state.watershedHealth?.highestConcern);
  const assessments = useApp((state) => state.assessments);
  const watershedHealth = useApp((state) => state.watershedHealth);
  const activeRun = useApp((state) => state.activeRun);
  const detail = useApp((state) => state.detail);

  const featured = zones.find((zone) => zone.id === (selectedId ?? highest?.zoneId)) ?? zones[0];
  const assessment = featured ? assessments.get(featured.id) : undefined;
  const selectedDetail = detail?.zone.id === featured?.id ? detail : null;

  return (
    <section className="method-section section-wrap" id="system-pipeline" aria-labelledby="pipeline-title" tabIndex={-1}>
      <div className="method-wrap">
        <div className="method-intro">
          <span className="section-label">02 — METHOD</span>
          <h2 id="pipeline-title">
            From observation<br />
            to <em>understanding.</em>
          </h2>
          <p className="method-lead">
            Each layer adds context. The model remains transparent about what is observed, what is derived and what is simulated.
          </p>
        </div>

        <div className="method-stages">
          {/* 1. OBSERVE */}
          <MethodStage
            index="01"
            label="Observe"
            title="Collect the signals"
            description="Every watershed tells a story through its measurements. EcoStream starts with monitoring stations and community reports distributed across the landscape."
          >
            <div className="stage-visual observation-visual">
              <ObservationNetwork river={river} zones={zones} points={points} />
              {ready && zones.length > 0 && (
                <div className="source-facts">
                  <div>
                    <b>{zones.length}</b>
                    <span>Watershed Zones</span>
                  </div>
                  {points.length > 0 && (
                    <div>
                      <b>{points.length}</b>
                      <span>Monitoring Points</span>
                    </div>
                  )}
                  {health?.observations && (
                    <div>
                      <b>{health.observations.toLocaleString()}</b>
                      <span>Observations</span>
                    </div>
                  )}
                </div>
              )}
              <p className="diagram-caption">Synthetic demonstration data</p>
            </div>
          </MethodStage>

          {/* 2. ANALYZE */}
          <MethodStage
            index="02"
            label="Analyze"
            title="Explain the evidence"
            description="Raw observations transform through a structured analytical pipeline: OBSERVATION → ANOMALY → TREND → STRESS → RISK — keeping every calculation transparent."
            reverse
          >
            <div className="stage-visual analysis-visual">
              <RiskComposition assessment={assessment} />
              <div className="analysis-context">
                <div className="pipeline-transformation-steps">
                  <span>OBSERVATION</span>
                  <i>→</i>
                  <span>ANOMALY</span>
                  <i>→</i>
                  <span>TREND</span>
                  <i>→</i>
                  <span>STRESS</span>
                  <i>→</i>
                  <strong>RISK</strong>
                </div>
                {featured && (
                  <div className="analysis-featured-tag">
                    <span>Featured Zone</span>
                    <strong>{featured.name}</strong>
                    <small>{featured.id.toUpperCase()} / Computed derived assessment</small>
                  </div>
                )}
              </div>
            </div>
          </MethodStage>

          {/* 3. PROPAGATE */}
          <MethodStage
            index="03"
            label="Propagate"
            title="Connect the geography"
            description="Environmental conditions do not stay inside one boundary. Directed upstream-to-downstream river topology reveals how runoff and stress travel across connected zones."
          >
            <div className="stage-visual propagation-visual">
              <PropagationNetwork zones={zones} river={river} selectedId={featured?.id} />
              <div className="propagation-summary-flow">
                <span>Upstream Catchment</span>
                <i>→</i>
                <span>Connected River Reaches</span>
                <i>→</i>
                <span>Downstream Estuary</span>
              </div>
            </div>
          </MethodStage>

          {/* 4. SIMULATE */}
          <MethodStage
            index="04"
            label="Simulate"
            title="Explore a change"
            description="Ask what happens if conditions change. A scenario passes perturbations through the exact same analytical pipeline, keeping the baseline and simulated response clearly distinguishable."
            reverse
          >
            <span id="simulate" className="anchor-alias" />
            <div className="stage-visual scenario-story">
              <div className="scenario-stage-header">
                <span className="scenario-stage-tag">BASELINE → SCENARIO → UPDATED RISK</span>
              </div>
              <ScenarioComposition
                assessment={assessment}
                comparison={selectedDetail?.comparison}
                activeRun={Boolean(activeRun)}
              />
              <div className="scenario-options">
                {SCENARIO_CATALOG.filter((scenario) => scenario.id !== 'NORMAL_CONDITIONS').map((scenario) => (
                  <AppLink key={scenario.id} href="/digital-twin">
                    <span>{scenario.name}</span>
                    <small>{scenario.description}</small>
                    <b aria-hidden="true">→</b>
                  </AppLink>
                ))}
              </div>
              <p className="diagram-caption">Simulated outputs / Run only on user interaction</p>
            </div>
          </MethodStage>

          {/* 5. FORECAST */}
          <MethodStage
            index="05"
            label="Forecast"
            title="Look ahead"
            description="Look at the trajectory across NOW, +24H, +72H, and +7D horizons with probabilistic confidence bounds, uncertainty ranges, and critical threshold warnings."
          >
            <div className="stage-visual forecast-story">
              <ForecastTrajectory forecast={selectedDetail?.forecast} />
              <div className="forecast-footer-action">
                <span className="forecast-pill">Non-calibrated demonstration model</span>
                <AppLink className="text-link" href="/digital-twin">
                  Inspect zone trajectories <span aria-hidden="true">→</span>
                </AppLink>
              </div>
            </div>
          </MethodStage>

          {/* 6. ONE HEALTH */}
          <MethodStage
            index="06"
            label="One Health"
            title="Understand context"
            description="Environment, ecosystem, human exposure, and community vulnerability are inherently linked. Derived indicators provide holistic context for proactive resilience planning."
            reverse
          >
            <div className="stage-visual one-health-story">
              <div className="one-health-flow-legend">
                <span>Environment</span>
                <i>↓</i>
                <span>Ecosystem</span>
                <i>↓</i>
                <span>Human Exposure</span>
                <i>↓</i>
                <span>Community</span>
              </div>
              <OneHealthFlow summary={watershedHealth} />
            </div>
          </MethodStage>
        </div>
      </div>
    </section>
  );
}

function MethodStage({
  index,
  label,
  title,
  description,
  children,
  reverse = false,
}: {
  index: string;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className={`method-stage ${reverse ? 'method-reverse' : ''}`}>
      <div className="method-copy">
        <span className="stage-label">{index} — {label}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="method-visual">
        {children}
      </div>
    </section>
  );
}
