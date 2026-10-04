import { AppLink } from '../navigation/Router';

interface HowItWorksStep {
  code: string;
  symbol: string;
  name: string;
  action: string;
  description: string;
}

const STEPS: HowItWorksStep[] = [
  {
    code: '01',
    symbol: '◎',
    name: 'OBSERVE',
    action: 'Collect the signals',
    description: 'Ingest multi-source in-stream water sensors, rainfall radar, satellite land-use rasters, and citizen reports.',
  },
  {
    code: '02',
    symbol: '◈',
    name: 'ANALYZE',
    action: 'Deconstruct the evidence',
    description: 'Calculate real-time anomaly scores, trend vectors, data quality confidence, and multi-factor catchment risk.',
  },
  {
    code: '03',
    symbol: '☍',
    name: 'PROPAGATE',
    action: 'Follow the hydrology',
    description: 'Traverse upstream-to-downstream river topology to trace how environmental stress travels through connected zones.',
  },
  {
    code: '04',
    symbol: '❖',
    name: 'VISUALIZE',
    action: 'Step inside the 3D twin',
    description: 'Render the watershed as an interactive 3D spatial twin with elevation heightmaps, dynamic river flow, and zone states.',
  },
  {
    code: '05',
    symbol: '⟳',
    name: 'SIMULATE',
    action: 'Test counterfactuals',
    description: 'Simulate severe weather spikes, industrial runoff, and buffer restorations through the identical analytical pipeline.',
  },
  {
    code: '06',
    symbol: '⇗',
    name: 'ANTICIPATE',
    action: 'Project horizons',
    description: 'Forecast near-term risk trajectories across Now, 24h, 72h, and 7d horizons with probabilistic confidence bounds.',
  },
  {
    code: '07',
    symbol: '⚑',
    name: 'ONE HEALTH',
    action: 'Inform human decisions',
    description: 'Synthesize ecological stability, human exposure, and community vulnerability into transparent decision support.',
  },
];

export function Architecture() {
  return (
    <section className="architecture section-wrap" id="architecture" tabIndex={-1}>
      <span id="how-it-works" className="anchor-alias" />
      <div className="section-index" data-reveal="left">
        THE METHOD <span>04 — HOW ECOSTREAM WORKS</span>
      </div>

      <div className="architecture-editorial-heading" data-reveal="left">
        <span className="eyebrow">A CONNECTED INTELLIGENCE PIPELINE</span>
        <h2>
          FROM OBSERVATION<br />
          TO <em>UNDERSTANDING.</em>
        </h2>
        <p className="architecture-lead">
          EcoStream bridges real-world monitoring with predictive spatial modeling — turning fragmented environmental readings into a living, interactive digital twin.
        </p>
      </div>

      {/* Visual Scrolling Pipeline Grid */}
      <div className="pipeline-flow-grid" data-reveal="up">
        {STEPS.map((step, index) => (
          <div className={`pipeline-step-card step-${index + 1}`} key={step.name}>
            <div className="step-card-header">
              <span className="step-code">{step.code}</span>
              <span className="step-symbol" aria-hidden="true">{step.symbol}</span>
            </div>
            <div className="step-card-body">
              <span className="step-action">{step.action}</span>
              <h3 className="step-name">{step.name}</h3>
              <p className="step-description">{step.description}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className="step-connector" aria-hidden="true">
                <span className="connector-arrow">→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Interactive Link into the Twin */}
      <div className="pipeline-summary-bar" data-reveal="fade">
        <span>OBSERVE → ANALYZE → PROPAGATE → VISUALIZE → SIMULATE → ANTICIPATE → ONE HEALTH</span>
        <AppLink className="product-button" href="/digital-twin">
          OPEN DIGITAL TWIN <span aria-hidden="true">→</span>
        </AppLink>
      </div>
    </section>
  );
}
