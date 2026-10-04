import type {
  MonitoringPoint,
  Observation,
  RiskAssessment,
  ScenarioRun,
  Vec2,
  Zone,
} from '@ecostream/shared';
import { readFileSync, renameSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Persistence layer (Milestone 1).
 *
 * better-sqlite3 could not produce a native binding in this environment
 * (no MSVC toolchain; prebuild download blocked), so per the approved fallback
 * ladder we use an atomic JSON-file store. The dataset is small (a few thousand
 * rows) and all engine math runs in memory either way, so the swap point is
 * deliberately tiny: every consumer goes through this class.
 */

export interface DatasetMeta {
  datasetLabel: string;
  provenanceNotice: string;
  generatedAt: string;
}

interface PersistedData {
  meta: DatasetMeta;
  zones: Zone[];
  points: MonitoringPoint[];
  riverPath: Vec2[];
  observations: Observation[];
  scenarioRuns: ScenarioRun[];
  assessments: RiskAssessment[];
}

const dataFilePath = (): string => {
  if (process.env.ECOSTREAM_DATA_FILE) return resolve(process.env.ECOSTREAM_DATA_FILE);
  // packages/server/src/db/store.ts -> repo root / data
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../data/ecostream.json');
};

/** Where the dataset lives (repo-root/data/ecostream.json unless overridden). */
export function resolveDataFilePath(): string {
  return dataFilePath();
}

export class EcoStore {
  meta: DatasetMeta = {
    datasetLabel: 'SYNTHETIC DEMO DATASET',
    provenanceNotice:
      'All observations in this build are synthetically generated for demonstration. They are not real measurements.',
    generatedAt: new Date(0).toISOString(),
  };
  zones: Zone[] = [];
  points: MonitoringPoint[] = [];
  riverPath: Vec2[] = [];
  observations: Observation[] = [];
  scenarioRuns: ScenarioRun[] = [];
  assessments: RiskAssessment[] = [];

  private pointsByZone = new Map<string, MonitoringPoint[]>();
  private obsByPoint = new Map<string, Observation[]>();

  static load(file: string = dataFilePath()): EcoStore {
    const store = new EcoStore();
    if (!existsSync(file)) return store;
    const raw = JSON.parse(readFileSync(file, 'utf8')) as PersistedData;
    store.meta = raw.meta;
    store.zones = raw.zones;
    store.points = raw.points;
    store.riverPath = raw.riverPath;
    store.observations = raw.observations;
    store.scenarioRuns = raw.scenarioRuns;
    store.assessments = raw.assessments;
    store.reindex();
    return store;
  }

  save(file: string = dataFilePath()): void {
    const payload: PersistedData = {
      meta: this.meta,
      zones: this.zones,
      points: this.points,
      riverPath: this.riverPath,
      observations: this.observations,
      scenarioRuns: this.scenarioRuns,
      assessments: this.assessments,
    };
    const tmp = `${file}.tmp`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(tmp, JSON.stringify(payload));
    renameSync(tmp, file); // atomic on same volume
  }

  reindex(): void {
    this.pointsByZone = new Map();
    for (const p of this.points) {
      const list = this.pointsByZone.get(p.zoneId) ?? [];
      list.push(p);
      this.pointsByZone.set(p.zoneId, list);
    }
    this.obsByPoint = new Map();
    for (const o of this.observations) {
      const list = this.obsByPoint.get(o.pointId) ?? [];
      list.push(o);
      this.obsByPoint.set(o.pointId, list);
    }
    for (const list of this.obsByPoint.values()) {
      list.sort((a, b) => a.ts.localeCompare(b.ts));
    }
  }

  zone(id: string): Zone | undefined {
    return this.zones.find((z) => z.id === id);
  }

  pointsForZone(zoneId: string): MonitoringPoint[] {
    return this.pointsByZone.get(zoneId) ?? [];
  }

  activeRun(): ScenarioRun | undefined {
    return this.scenarioRuns.find((r) => r.status === 'ACTIVE');
  }

  /**
   * Observations the world currently "shows": baseline data plus, when a
   * scenario run is active, that run's simulated observations.
   */
  effectiveObservations(zoneId: string, activeRunId: string | null): Observation[] {
    const out: Observation[] = [];
    for (const p of this.pointsForZone(zoneId)) {
      for (const o of this.obsByPoint.get(p.id) ?? []) {
        if (o.scenarioRunId === null || o.scenarioRunId === activeRunId) out.push(o);
      }
    }
    return out;
  }

  /** Replace all observations belonging to a run (used by reset + re-run). */
  dropRunObservations(runId: string): void {
    this.observations = this.observations.filter((o) => o.scenarioRunId !== runId);
    this.reindex();
  }

  setAssessments(runId: string | null, next: RiskAssessment[]): void {
    this.assessments = this.assessments.filter((a) => a.scenarioRunId !== runId);
    this.assessments.push(...next);
  }

  assessmentFor(zoneId: string, runId: string | null): RiskAssessment | undefined {
    return this.assessments.find((a) => a.zoneId === zoneId && a.scenarioRunId === runId);
  }
}
