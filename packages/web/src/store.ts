import type { OneHealthWatershedSummary, RiskAssessment, ScenarioDef, ScenarioRun, Zone } from '@ecostream/shared';
import { create } from 'zustand';
import { api } from './services/api';
import type { WatershedDTO, ZoneDetailDTO } from './services/api';

/** Scenario catalog mirrored from the server's definitions (display only). */
export const SCENARIO_CATALOG: ScenarioDef[] = [
  {
    id: 'NORMAL_CONDITIONS',
    name: 'Normal Conditions',
    description: 'Baseline watershed state. No perturbation.',
    params: [] as ScenarioDef['params'],
  },
  {
    id: 'HEAVY_URBAN_RUNOFF',
    name: 'Heavy Urban Runoff',
    description: 'Storm runoff from impervious surfaces. Impact scales with land use.',
    params: [
      {
        key: 'intensity',
        label: 'Intensity',
        min: 0.2,
        max: 1,
        default: 0.7,
        step: 0.1,
        unit: '×',
      },
    ] as ScenarioDef['params'],
  },
  {
    id: 'EXTREME_RAINFALL',
    name: 'Extreme Rainfall',
    description: 'Catchment-wide storm: level surge everywhere, downstream lag.',
    params: [
      {
        key: 'magnitude',
        label: 'Magnitude',
        min: 0.2,
        max: 1,
        default: 0.7,
        step: 0.1,
        unit: '×',
      },
    ] as ScenarioDef['params'],
  },
  {
    id: 'HEAT_STRESS',
    name: 'Heat Stress',
    description: 'Multi-day heatwave: temperature up, dissolved oxygen down. Slow onset.',
    params: [
      {
        key: 'severity',
        label: 'Severity',
        min: 0.2,
        max: 1,
        default: 0.6,
        step: 0.1,
        unit: '×',
      },
    ] as ScenarioDef['params'],
  },
];

export type ScenarioId = ScenarioDef['id'];

interface AppState {
  ready: boolean;
  error: string | null;
  meta: WatershedDTO['meta'] | null;
  zones: Zone[];
  riverPath: WatershedDTO['riverPath'];
  points: WatershedDTO['points'];
  assessments: Map<string, RiskAssessment>;
  activeRun: ScenarioRun | null;
  watershedHealth: OneHealthWatershedSummary | null;
  selectedZoneId: string | null;
  detail: ZoneDetailDTO | null;
  busy: boolean;

  bootstrap: () => Promise<void>;
  select: (zoneId: string | null) => void;
  runScenario: (id: ScenarioId, params?: Record<string, number>) => Promise<void>;
  reset: () => Promise<void>;
}

function absorbWatershed(set: (p: Partial<AppState>) => void, d: WatershedDTO): void {
  set({
    meta: d.meta,
    zones: d.zones,
    riverPath: d.riverPath,
    points: d.points,
    assessments: new Map(d.assessments.map((a) => [a.zoneId, a])),
    activeRun: d.activeRun,
    watershedHealth: d.oneHealth,
  });
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  meta: null,
  zones: [],
  riverPath: [],
  points: [],
  assessments: new Map(),
  activeRun: null,
  watershedHealth: null,
  selectedZoneId: null,
  detail: null,
  busy: false,

  bootstrap: async () => {
    try {
      const d = await api.watershed();
      absorbWatershed(set, d);
      set({ ready: true, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'failed to load watershed' });
    }
  },

  select: (zoneId) => {
    set({ selectedZoneId: zoneId });
    if (!zoneId) return;
    api
      .zoneDetail(zoneId)
      .then((detail) => {
        if (get().selectedZoneId === zoneId) set({ detail });
      })
      .catch((e) => set({ error: e instanceof Error ? e.message : 'zone load failed' }));
  },

  runScenario: async (id, params) => {
    set({ busy: true, error: null });
    try {
      const { run, assessments, oneHealth } = await api.runScenario(id, params);
      const merged = new Map(get().assessments);
      for (const a of assessments) merged.set(a.zoneId, a);
      set({ activeRun: run, assessments: merged, watershedHealth: oneHealth, busy: false });
      const sel = get().selectedZoneId;
      if (sel) {
        const detail = await api.zoneDetail(sel);
        if (get().selectedZoneId === sel) set({ detail });
      }
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'scenario failed' });
    }
  },

  reset: async () => {
    const run = get().activeRun;
    if (!run) return;
    set({ busy: true, error: null });
    try {
      const { assessments, oneHealth } = await api.resetRun(run.id);
      const merged = new Map<string, RiskAssessment>();
      for (const [k, v] of get().assessments) if (!assessments.some((a) => a.zoneId === k)) merged.set(k, v);
      for (const a of assessments) merged.set(a.zoneId, a);
      set({ activeRun: null, assessments: merged, watershedHealth: oneHealth, busy: false });
      const sel = get().selectedZoneId;
      if (sel) {
        const detail = await api.zoneDetail(sel);
        if (get().selectedZoneId === sel) set({ detail });
      }
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'reset failed' });
    }
  },
}));
