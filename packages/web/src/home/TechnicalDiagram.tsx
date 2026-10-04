import { useState } from 'react';

export interface PipelineStage {
  id: string;
  step: string;
  name: string;
  category: 'DATA' | 'CORE' | 'PREDICTION' | 'IMPACT';
  tag: string;
  summary: string;
  formula: string;
  inputs: string[];
  outputs: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'sources',
    step: '01',
    name: 'Data Sources & Ingestion',
    category: 'DATA',
    tag: 'MULTI-MODAL INGESTION',
    summary: 'Continuous ingest of IoT water probes (pH, DO, Turbidity), meteorological radar, satellite land-cover rasters, and citizen reports.',
    formula: 'Normalize(S_raw, t) → S_norm ∈ [0, 1]',
    inputs: ['IoT In-Stream Sensors', 'Weather Radar Feeds', 'Citizen Incident Reports', 'Satellite Rasters'],
    outputs: ['Validated Time-Series', 'GeoJSON Geometry Buffers'],
  },
  {
    id: 'observations',
    step: '02',
    name: 'Spatial Observations',
    category: 'DATA',
    tag: 'SPATIAL INDEXING',
    summary: 'Maps sampling coordinates to hydrological catchments while computing telemetry freshness, confidence weights, and sensor quality indices.',
    formula: 'Quality(p) = w_calib · C_sensor + w_fresh · Δt',
    inputs: ['Raw Observation Stream', 'Watershed Catchment Polygons'],
    outputs: ['13 Monitoring Stations', 'Point Quality Ratings'],
  },
  {
    id: 'analytical',
    step: '03',
    name: 'Analytical & Risk Engine',
    category: 'CORE',
    tag: 'HYDRO-SPATIAL RISK',
    summary: 'Decomposes spatial signals into 5 interpretable risk components: Water Quality, Heavy Rainfall, Runoff Potential, Thermal Stress, and Ecological Vulnerability.',
    formula: 'Risk_z = ∑ (w_k · Component_k) · AnomalyMultiplier',
    inputs: ['Zone Baselines', 'Real-time Metrics'],
    outputs: ['Composite Risk Score (0-100)', 'Component Vector'],
  },
  {
    id: 'propagation',
    step: '04',
    name: 'Spatial Propagation',
    category: 'CORE',
    tag: 'DIRECTED RIVER TOPOLOGY',
    summary: 'Traverses directed upstream-to-downstream topological graph paths to simulate runoff flow travel and downstream contaminant dispersion.',
    formula: 'Risk_downstream = Risk_local + ∑ (γ_ij · Risk_upstream_i)',
    inputs: ['Catchment Risk Ratings', 'River Stream Reach Graph'],
    outputs: ['Downstream Risk Spacers', 'Discharge Vector Paths'],
  },
  {
    id: 'twin',
    step: '05',
    name: '3D Digital Twin Platform',
    category: 'CORE',
    tag: 'WEBGL SPATIAL CANVAS',
    summary: 'Real-time 3D rendering of digital elevation models, procedural dynamic water flow shaders, and interactive zone overlays for intuitive spatial discovery.',
    formula: 'Render3D(Mesh_terrain, Shader_river, Risk_color)',
    inputs: ['Topographic Mesh', 'Zone Boundary Vectors', 'Risk States'],
    outputs: ['Interactive 3D Scene', 'Spatial Picking & Inspection'],
  },
  {
    id: 'simulation',
    step: '06',
    name: 'Scenario Simulation',
    category: 'PREDICTION',
    tag: 'COUNTERFACTUAL PERTURBATION',
    summary: 'Evaluates hypothetical environmental shocks (Extreme Rain Spikes, Industrial Discharges, Severe Drought) through the identical analytical pipeline.',
    formula: 'State_sim = Pipeline(Baseline + ΔParameters)',
    inputs: ['Baseline State', 'Perturbation Parameter Matrix'],
    outputs: ['Simulated Risk Response', 'Delta Comparison Matrices'],
  },
  {
    id: 'forecast',
    step: '07',
    name: 'Horizon Forecasting',
    category: 'PREDICTION',
    tag: 'PROBABILISTIC TRAJECTORY',
    summary: 'Projects time-series risk trajectories for Now, +24H, +72H, and +7D horizons with confidence intervals and threshold warning flags.',
    formula: 'Forecast(z, t+h) = Trend(z, t) + α · DownstreamShift(z, h)',
    inputs: ['Historical Trend Vectors', 'Upstream Driver Signals'],
    outputs: ['Trajectory Envelope Curves', 'Threshold Alert Warnings'],
  },
  {
    id: 'onehealth',
    step: '08',
    name: 'One Health Synthesis',
    category: 'IMPACT',
    tag: 'SYSTEMIC ECO-HEALTH',
    summary: 'Correlates water quality indices, ecological resilience, human recreational exposure, and community vulnerability into unified health context.',
    formula: 'OneHealth_z = f(WaterQuality_z, Ecosystem_z, Exposure_z)',
    inputs: ['Catchment Risk', 'Ecosystem Stress', 'Community Exposure'],
    outputs: ['One Health Index', 'Public Health Vulnerability Score'],
  },
  {
    id: 'decisions',
    step: '09',
    name: 'Human Decision Support',
    category: 'IMPACT',
    tag: 'TRANSPARENT PROVENANCE',
    summary: 'Maintains strict provenance (Observed / Derived / Simulated / Verified) to provide transparent, actionable recommendations for environmental custodians.',
    formula: 'Provenance = Tag(Observed | Derived | Simulated | Verified)',
    inputs: ['Full System Pipeline State', 'Provenance Metadata'],
    outputs: ['Targeted Action Guidance', 'Auditable Decision Logs'],
  },
];

export function TechnicalDiagram() {
  const [selectedId, setSelectedId] = useState<string>('analytical');
  const activeStage: PipelineStage =
    PIPELINE_STAGES.find((stage) => stage.id === selectedId) ?? PIPELINE_STAGES[2]!;

  return (
    <section className="technical-diagram-section section-wrap" id="technical-diagram" tabIndex={-1}>
      <div className="section-index" data-reveal="left">
        TECHNICAL SYSTEM MAP <span>03 — TOPOGRAPHIC ARCHITECTURE</span>
      </div>

      <div className="diagram-header" data-reveal="left">
        <span className="eyebrow">THE LIVING ARCHITECTURE</span>
        <h3>
          A connected environmental map<br />
          <em>from data sources to human decisions.</em>
        </h3>
        <p className="diagram-description">
          Topographic contours, stream reaches, and analytical layers combine into a continuous intelligence pipeline. Click any node to inspect data contracts and mathematical transformations.
        </p>
      </div>

      {/* Signature Large Organic Topographic Background System Map */}
      <div className="topographic-map-canvas" data-reveal="up" aria-label="EcoStream Topographic System Diagram">
        <svg
          className="topographic-svg"
          viewBox="0 0 1200 680"
          role="img"
          aria-label="Scientific environmental system map showing data flow through topographic contours"
        >
          <defs>
            {/* Topographic Contour Pattern */}
            <pattern id="contour-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#68745f" strokeOpacity="0.08" strokeWidth="1" />
              <circle cx="30" cy="30" r="1.5" fill="#aa8150" fillOpacity="0.18" />
            </pattern>

            {/* River Gradient Flow */}
            <linearGradient id="river-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#899778" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#55604b" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#aa8150" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#984f3e" stopOpacity="0.75" />
            </linearGradient>

            {/* Soft Elevation Gradient */}
            <radialGradient id="elevation-spot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e2ded4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f4f0e6" stopOpacity="0" />
            </radialGradient>

            <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid & Elevation Highlights */}
          <rect width="1200" height="680" fill="url(#contour-grid)" />
          <ellipse cx="600" cy="340" rx="520" ry="290" fill="url(#elevation-spot)" />

          {/* Topographic Elevation Contours */}
          <g fill="none" stroke="#68745f" strokeOpacity="0.18" strokeWidth="1.2">
            <path d="M 50 140 C 250 80, 480 180, 700 120 C 920 60, 1050 140, 1150 110" />
            <path d="M 50 220 C 280 160, 520 260, 750 200 C 980 140, 1080 220, 1150 190" />
            <path d="M 50 320 C 300 240, 550 360, 800 280 C 1020 220, 1100 300, 1150 280" />
            <path d="M 50 440 C 320 360, 580 480, 840 400 C 1050 340, 1120 420, 1150 390" />
            <path d="M 50 560 C 350 480, 620 580, 880 500 C 1080 440, 1140 520, 1150 500" strokeDasharray="3 6" />
          </g>

          {/* Main Organic River-like Data Flow Spline */}
          <path
            d="M 120 180 C 220 180, 240 320, 360 320 C 480 320, 500 180, 620 180 C 740 180, 760 360, 880 360 C 980 360, 1020 480, 1080 480"
            fill="none"
            stroke="url(#river-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 120 180 C 220 180, 240 320, 360 320 C 480 320, 500 180, 620 180 C 740 180, 760 360, 880 360 C 980 360, 1020 480, 1080 480"
            fill="none"
            stroke="#f4f0e6"
            strokeWidth="2"
            strokeDasharray="8 12"
            opacity="0.8"
          />

          {/* Secondary Tributary Flow Splines */}
          <path
            d="M 240 80 C 300 140, 320 260, 360 320"
            fill="none"
            stroke="#aa8150"
            strokeWidth="3"
            strokeDasharray="4 6"
            opacity="0.6"
          />
          <path
            d="M 500 480 C 560 420, 580 260, 620 180"
            fill="none"
            stroke="#55604b"
            strokeWidth="3"
            strokeDasharray="4 6"
            opacity="0.6"
          />
          <path
            d="M 760 540 C 820 460, 840 400, 880 360"
            fill="none"
            stroke="#984f3e"
            strokeWidth="3"
            strokeDasharray="4 6"
            opacity="0.6"
          />

          {/* Animated Signal Pulses Moving Along River Path */}
          <circle r="6" fill="#aa8150" filter="url(#soft-glow)">
            <animateMotion
              path="M 120 180 C 220 180, 240 320, 360 320 C 480 320, 500 180, 620 180 C 740 180, 760 360, 880 360 C 980 360, 1020 480, 1080 480"
              dur="5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="4" fill="#314033" filter="url(#soft-glow)">
            <animateMotion
              path="M 120 180 C 220 180, 240 320, 360 320 C 480 320, 500 180, 620 180 C 740 180, 760 360, 880 360 C 980 360, 1020 480, 1080 480"
              dur="8s"
              repeatCount="indefinite"
            />
          </circle>

          {/* 9 Organic Topographic Nodes */}
          {/* Node 1: Sources */}
          <g
            transform="translate(120, 180)"
            className={`topo-node ${activeStage.id === 'sources' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('sources')}
          >
            <circle r="34" className="node-halo" />
            <circle r="24" className="node-disc" />
            <text className="node-num" y="5">01</text>
            <text className="node-caption" y="44">DATA SOURCES</text>
          </g>

          {/* Node 2: Observations */}
          <g
            transform="translate(240, 80)"
            className={`topo-node ${activeStage.id === 'observations' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('observations')}
          >
            <circle r="30" className="node-halo" />
            <circle r="20" className="node-disc" />
            <text className="node-num" y="4">02</text>
            <text className="node-caption" y="38">OBSERVATIONS</text>
          </g>

          {/* Node 3: Analytical */}
          <g
            transform="translate(360, 320)"
            className={`topo-node ${activeStage.id === 'analytical' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('analytical')}
          >
            <circle r="38" className="node-halo" />
            <circle r="28" className="node-disc" />
            <text className="node-num" y="5">03</text>
            <text className="node-caption" y="50">RISK ENGINE</text>
          </g>

          {/* Node 4: Propagation */}
          <g
            transform="translate(500, 480)"
            className={`topo-node ${activeStage.id === 'propagation' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('propagation')}
          >
            <circle r="32" className="node-halo" />
            <circle r="22" className="node-disc" />
            <text className="node-num" y="4">04</text>
            <text className="node-caption" y="42">PROPAGATION</text>
          </g>

          {/* Node 5: 3D Twin */}
          <g
            transform="translate(620, 180)"
            className={`topo-node ${activeStage.id === 'twin' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('twin')}
          >
            <circle r="44" className="node-halo halo-featured" />
            <circle r="32" className="node-disc disc-featured" />
            <text className="node-num" y="6">05</text>
            <text className="node-caption font-bold" y="56">3D DIGITAL TWIN</text>
          </g>

          {/* Node 6: Simulation */}
          <g
            transform="translate(760, 540)"
            className={`topo-node ${activeStage.id === 'simulation' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('simulation')}
          >
            <circle r="32" className="node-halo" />
            <circle r="22" className="node-disc" />
            <text className="node-num" y="4">06</text>
            <text className="node-caption" y="42">SIMULATION</text>
          </g>

          {/* Node 7: Forecast */}
          <g
            transform="translate(880, 360)"
            className={`topo-node ${activeStage.id === 'forecast' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('forecast')}
          >
            <circle r="34" className="node-halo" />
            <circle r="24" className="node-disc" />
            <text className="node-num" y="5">07</text>
            <text className="node-caption" y="44">FORECAST</text>
          </g>

          {/* Node 8: One Health */}
          <g
            transform="translate(980, 220)"
            className={`topo-node ${activeStage.id === 'onehealth' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('onehealth')}
          >
            <circle r="32" className="node-halo" />
            <circle r="22" className="node-disc" />
            <text className="node-num" y="4">08</text>
            <text className="node-caption" y="42">ONE HEALTH</text>
          </g>

          {/* Node 9: Decisions */}
          <g
            transform="translate(1080, 480)"
            className={`topo-node ${activeStage.id === 'decisions' ? 'is-active' : ''}`}
            onClick={() => setSelectedId('decisions')}
          >
            <circle r="36" className="node-halo" />
            <circle r="26" className="node-disc" />
            <text className="node-num" y="5">09</text>
            <text className="node-caption" y="46">DECISION SUPPORT</text>
          </g>

          {/* Scientific Annotation Coordinates & North Arrow */}
          <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#68745f" opacity="0.6">
            <text x="50" y="50">LAT 42°21'N · LON 71°04'W</text>
            <text x="50" y="65">CONTOUR INTERVAL 5.0m</text>
            <text x="1150" y="50" textAnchor="end">SYS_MAP_V2 // BIO_WATERSHED</text>
            <text x="1150" y="65" textAnchor="end">DATUM: WGS84 EPSG:4326</text>
          </g>
        </svg>

        <div className="map-interaction-hint">
          <span>Click any node in the landscape to inspect inputs, outputs, and mathematical formulas</span>
        </div>
      </div>

      {/* Interactive Detail Stage Inspector */}
      <div className="diagram-stage-details">
        <div className="stage-nav-pills" role="tablist" aria-label="System stages list">
          {PIPELINE_STAGES.map((stage) => {
            const isSelected = stage.id === activeStage.id;
            return (
              <button
                key={stage.id}
                role="tab"
                aria-selected={isSelected}
                className={`stage-pill ${isSelected ? 'active-pill' : ''}`}
                onClick={() => setSelectedId(stage.id)}
              >
                <span className="stage-pill-num">{stage.step}</span>
                <span className="stage-pill-name">{stage.name}</span>
                <span className={`stage-pill-cat cat-${stage.category.toLowerCase()}`}>{stage.category}</span>
              </button>
            );
          })}
        </div>

        <div className="stage-inspector-panel" key={activeStage.id} data-reveal="fade">
          <div className="inspector-panel-header">
            <div>
              <span className="inspector-cat-tag">{activeStage.tag}</span>
              <h4>{activeStage.step} / {activeStage.name}</h4>
            </div>
            <span className={`inspector-status-badge status-${activeStage.category.toLowerCase()}`}>
              {activeStage.category} LAYER
            </span>
          </div>

          <p className="inspector-desc">{activeStage.summary}</p>

          <div className="inspector-io-grid">
            <div className="io-col">
              <h5>SYSTEM INPUTS</h5>
              <ul>
                {activeStage.inputs.map((inp, idx) => (
                  <li key={idx}>
                    <span>in_{idx + 1}</span> {inp}
                  </li>
                ))}
              </ul>
            </div>

            <div className="io-col">
              <h5>SYSTEM OUTPUTS</h5>
              <ul>
                {activeStage.outputs.map((out, idx) => (
                  <li key={idx}>
                    <span>out_{idx + 1}</span> {out}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="inspector-formula-box">
            <h5>TRANSFORMATION CONTRACT</h5>
            <code>{activeStage.formula}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
