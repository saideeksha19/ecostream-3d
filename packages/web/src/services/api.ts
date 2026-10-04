import type {
  Forecast,
  MonitoringPoint,
  OneHealthSnapshot,
  OneHealthWatershedSummary,
  RiskAssessment,
  RiskComparison,
  RiskExplanation,
  ScenarioRun,
  Vec2,
  Zone,
} from '@ecostream/shared';

/** Typed client for the local EcoStream API (via Vite proxy). */

export interface DatasetMetaDTO {
  datasetLabel: string;
  provenanceNotice: string;
  generatedAt: string;
}

export interface WatershedDTO {
  meta: DatasetMetaDTO;
  riverPath: Vec2[];
  zones: Zone[];
  points: MonitoringPoint[];
  assessments: RiskAssessment[];
  activeRun: ScenarioRun | null;
  oneHealth: OneHealthWatershedSummary;
}

export interface IndicatorDTO {
  variable: string;
  label: string;
  unit: string;
  latest: number | null;
  ts: string | null;
  z: number;
  isAnomaly: boolean;
  provenance: string | null;
}

export interface ZoneDetailDTO {
  zone: Zone;
  assessment: RiskAssessment | null;
  points: MonitoringPoint[];
  indicators: IndicatorDTO[];
  series: Record<string, { ts: string; value: number; provenance: string }[]>;
  activeRun: ScenarioRun | null;
  explanation: RiskExplanation | null;
  forecast: Forecast | null;
  oneHealth: OneHealthSnapshot | null;
  comparison: RiskComparison | null;
}

export interface HealthDTO {
  status: string;
  dataset: string;
  provenanceNotice: string;
  zones: number;
  observations: number;
  activeRun: string | null;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST' };
  // Only set the JSON content-type when a body is actually sent — Fastify
  // rejects an empty body that declares content-type: application/json.
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => get<HealthDTO>('/api/v1/health'),
  watershed: () => get<WatershedDTO>('/api/v1/watershed'),
  zoneDetail: (zoneId: string) => get<ZoneDetailDTO>(`/api/v1/zones/${zoneId}`),
  runScenario: (scenarioId: string, params?: Record<string, number>) =>
    post<{ run: ScenarioRun; assessments: RiskAssessment[]; oneHealth: OneHealthWatershedSummary }>(
      `/api/v1/scenarios/${scenarioId}/run`,
      params ? { params } : {},
    ),
  resetRun: (runId: string) =>
    post<{ resetRunId: string; activeRun: null; assessments: RiskAssessment[]; oneHealth: OneHealthWatershedSummary }>(
      `/api/v1/scenario-runs/${runId}/reset`,
    ),
  explanation: (zoneId: string) => get<RiskExplanation>(`/api/v1/zones/${zoneId}/explanation`),
  forecast: (zoneId: string) => get<Forecast>(`/api/v1/zones/${zoneId}/forecast`),
  oneHealth: (zoneId: string) => get<OneHealthSnapshot>(`/api/v1/zones/${zoneId}/one-health`),
  comparison: (zoneId: string) => get<RiskComparison>(`/api/v1/zones/${zoneId}/comparison`),
  watershedOneHealth: () => get<OneHealthWatershedSummary>('/api/v1/one-health'),
};
