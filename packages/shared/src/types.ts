/**
 * EcoStream 3D — shared domain model.
 *
 * Every entity that crosses the API boundary lives here so the server and the
 * web client cannot drift. Provenance is a first-class field: the system never
 * presents simulated values as observations.
 */

export type ZoneKind =
  | 'urban_core'
  | 'industrial'
  | 'commercial'
  | 'residential'
  | 'park'
  | 'riparian'
  | 'agricultural';

/** Where a piece of information came from. */
export type Provenance =
  | 'OBSERVED' // station reading (synthetic in this demo build)
  | 'SIMULATED' // produced by a scenario run
  | 'CITIZEN' // citizen report
  | 'DERIVED' // computed indicator/analyzer output
  | 'HUMAN_VERIFIED'; // confirmed by a human operator

/** Deterministic risk states ordered by severity. */
export const RISK_STATES = ['NORMAL', 'WATCH', 'INVESTIGATE', 'EARLY_WARNING'] as const;
export type RiskState = (typeof RISK_STATES)[number];

export type WaterVariable =
  | 'turbidity'
  | 'conductivity'
  | 'dissolved_oxygen'
  | 'water_level'
  | 'temperature';

export interface VariableUnitMeta {
  unit: string;
  label: string;
}

export const VARIABLE_META: Record<WaterVariable, VariableUnitMeta> = {
  turbidity: { unit: 'NTU', label: 'Turbidity' },
  conductivity: { unit: 'µS/cm', label: 'Conductivity' },
  dissolved_oxygen: { unit: 'mg/L', label: 'Dissolved O₂' },
  water_level: { unit: 'm', label: 'Water level' },
  temperature: { unit: '°C', label: 'Temperature' },
};

/** A location in local watershed coordinates (metres, y-up terrain model). */
export interface Vec2 {
  x: number;
  z: number;
}

export interface Zone {
  id: string; // e.g. "z01"
  code: string; // e.g. "ZONE 01"
  name: string;
  kind: ZoneKind;
  /** Impervious surface fraction 0..1 — drives runoff exposure. */
  imperviousness: number;
  /** Residents/workers in the zone (community implications). */
  population: number;
  /** Local polygon (x,z) in the terrain plane. */
  polygon: Vec2[];
  /** River chainage (metres from headwater) of the zone's centroid outfall. */
  riverDistanceM: number;
  /** Upstream zone whose flow enters this zone first. null = headwater. */
  upstreamZoneId: string | null;
}

export type MonitoringPointKind = 'SENSOR' | 'CITIZEN_REPORT';

export interface MonitoringPoint {
  id: string;
  zoneId: string;
  name: string;
  kind: MonitoringPointKind;
  position: Vec2;
  /** Variables this point reports (citizen points may observe a subset). */
  variables: WaterVariable[];
}

/** A single timestamped reading. Provenance is mandatory. */
export interface Observation {
  id: string;
  pointId: string;
  variable: WaterVariable;
  value: number;
  unit: string;
  /** ISO 8601 timestamp. */
  ts: string;
  provenance: Provenance;
  quality: number; // 0..1 synthetic quality flag
  scenarioRunId: string | null; // non-null ⇒ SIMULATED
}

export type RiskComponentId = 'anomaly' | 'runoff' | 'trend' | 'ecosystem' | 'spatial';

export interface RiskComponent {
  id: RiskComponentId;
  /** 0..100 contribution of this component. */
  score: number;
  weight: number;
  /** Human-readable one-line explanation of what drove this component. */
  summary: string;
}

/** A unit of explainability. Evidence is what the UI renders when asked "why". */
export interface EvidenceItem {
  id: string;
  zoneId: string;
  component: RiskComponentId | 'scenario';
  /** Short headline, e.g. "Turbidity anomaly at ST-04". */
  statement: string;
  /** Detail: source station, window, values. */
  detail: string;
  provenance: Provenance;
  /** Contribution to the total risk score in points (0..100 scale). */
  contribution: number;
  /** Optional reference to the data that produced this evidence. */
  sourceRef?: string; // pointId or scenarioRunId
  /** Structured fields keep the explanation grounded in actual readings. */
  sourceLabel?: string;
  variable?: WaterVariable;
  unit?: string;
  measuredValue?: number;
  baselineValue?: number;
  anomaly?: number;
}

export interface RiskAssessment {
  zoneId: string;
  scenarioRunId: string | null;
  /** Composite 0..100. */
  score: number;
  state: RiskState;
  /** 0..1 — scales with data completeness, inverse with spread of signals. */
  confidence: number;
  components: RiskComponent[];
  evidence: EvidenceItem[];
  /** Deterministic, factual explanation generated from components and evidence. */
  explanation?: string;
  computedAt: string;
}

export interface RiskExplanation {
  zoneId: string;
  scenarioRunId: string | null;
  riskScore: number;
  riskState: RiskState;
  confidence: number;
  components: RiskComponent[];
  evidence: EvidenceItem[];
  explanation: string;
  provenance: Provenance;
}

export interface RiskComparisonSide {
  score: number;
  state: RiskState;
  confidence: number;
  components: RiskComponent[];
  provenance: Provenance;
}

export interface ComponentComparison {
  id: RiskComponentId;
  label: string;
  baseline: number;
  scenario: number;
  delta: number;
  weightedDelta: number;
}

export interface ObservationComparison {
  variable: WaterVariable;
  label: string;
  unit: string;
  sourceRef: string | null;
  sourceLabel: string | null;
  baseline: number | null;
  scenario: number | null;
  delta: number | null;
  provenance: Provenance;
}

export interface RiskComparison {
  zoneId: string;
  scenarioRunId: string | null;
  baseline: RiskComparisonSide;
  scenario: RiskComparisonSide | null;
  scoreDelta: number;
  componentDeltas: ComponentComparison[];
  changedObservations: ObservationComparison[];
  newEvidence: EvidenceItem[];
  provenanceChange: { baseline: Provenance; scenario: Provenance | null };
}

export type ScenarioId = 'NORMAL_CONDITIONS' | 'HEAVY_URBAN_RUNOFF' | 'EXTREME_RAINFALL' | 'HEAT_STRESS';

export interface ScenarioParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
}

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  description: string;
  params: ScenarioParamSpec[];
}

export type ScenarioRunStatus = 'ACTIVE' | 'RESET';

export interface ScenarioRun {
  id: string;
  scenarioId: ScenarioId;
  params: Record<string, number>;
  status: ScenarioRunStatus;
  startedAt: string;
  endedAt: string | null;
  /** Zones directly perturbed by the scenario. */
  targetZoneIds: string[];
}

export type ForecastHorizon = 'CURRENT' | 'H24' | 'H72' | 'D7';

export interface ForecastPoint {
  horizon: ForecastHorizon;
  projectedScore: number;
  projectedState: RiskState;
  confidence: number; // 0..1
  uncertaintyLow: number;
  uncertaintyHigh: number;
  method: string; // honest method label, e.g. "damped persistence (demo)"
}

export interface ForecastThresholdCrossing {
  horizon: ForecastHorizon;
  threshold: RiskState;
  message: string;
}

export interface Forecast {
  zoneId: string;
  scenarioRunId: string | null;
  /** 0..1 fraction of expected observations actually available in the window. */
  dataCompleteness: number;
  points: ForecastPoint[];
  thresholdCrossing: ForecastThresholdCrossing | null;
  disclaimer: string;
  generatedAt: string;
}

export type AlertStatus = 'OPEN' | 'VERIFIED' | 'REJECTED' | 'EVIDENCE_REQUESTED';

export interface Alert {
  id: string;
  zoneId: string;
  scenarioRunId: string | null;
  riskState: RiskState; // state at raise time
  riskScore: number;
  status: AlertStatus;
  raisedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  note: string | null;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  from: AlertStatus | null;
  to: AlertStatus;
  actor: string;
  note: string | null;
  at: string;
}

export type OneHealthBand = 'LOW' | 'ELEVATED' | 'HIGH';

export interface OneHealthDimension {
  /** environmental | ecosystem | exposure | community */
  id: 'environment' | 'ecosystem' | 'exposure' | 'community';
  band: OneHealthBand;
  /** 0..100 */
  index: number;
  summary: string;
  /** zone ids driving this dimension */
  driverZoneIds: string[];
  provenance: Provenance;
}

export interface OneHealthSnapshot {
  zoneId: string;
  scenarioRunId: string | null;
  dimensions: OneHealthDimension[];
  overallSignal: OneHealthBand;
  overallIndex: number;
  drivers: string[];
  dataStatus: 'DEMONSTRATION / SYNTHETIC DATA';
  /** One-line decision-support note; never a medical claim. */
  decisionNote: string;
  generatedAt: string;
}

export interface OneHealthWatershedSummary {
  scenarioRunId: string | null;
  zoneCount: number;
  environmentalStress: number;
  ecosystemStress: number;
  humanExposure: number;
  activeAlerts: number;
  highestConcern: { zoneId: string; zoneName: string; score: number; state: RiskState } | null;
  provenance: Provenance;
  dataStatus: 'DEMONSTRATION / SYNTHETIC DATA';
  generatedAt: string;
}
