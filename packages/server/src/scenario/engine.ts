import type {
  MonitoringPoint,
  Observation,
  ScenarioDef,
  ScenarioId,
  ScenarioParamSpec,
  ScenarioRun,
  WaterVariable,
  Zone,
} from '@ecostream/shared';
import { VARIABLE_META } from '@ecostream/shared';
import { BASELINE_HOURS, baselineValue, mulberry32, tsForHour } from '../seed/generate';

/**
 * Scenario engine. A run materializes SIMULATED observations for hours 73..96
 * (baseline covers 0..72). Those observations flow through the SAME
 * analysis → risk pipeline as observed data — the scenario never touches risk
 * scores or frontend state directly.
 */

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'NORMAL_CONDITIONS',
    name: 'Normal Conditions',
    description: 'Baseline watershed state. No perturbation applied.',
    params: [],
  },
  {
    id: 'HEAVY_URBAN_RUNOFF',
    name: 'Heavy Urban Runoff',
    description:
      'Storm runoff from impervious surfaces: turbidity and conductivity surge, dissolved oxygen sags, water level rises. Impact scales with zone imperviousness.',
    params: [{ key: 'intensity', label: 'Runoff intensity', min: 0.2, max: 1, default: 0.7, step: 0.1, unit: '×' }],
  },
  {
    id: 'EXTREME_RAINFALL',
    name: 'Extreme Rainfall',
    description:
      'Catchment-wide rainstorm: water-level surge in every zone, dilution of conductivity, wash-in of turbidity, temporary DO drop.',
    params: [{ key: 'magnitude', label: 'Rainfall magnitude', min: 0.2, max: 1, default: 0.7, step: 0.1, unit: '×' }],
  },
  {
    id: 'HEAT_STRESS',
    name: 'Heat Stress',
    description:
      'Multi-day heatwave: water temperature climbs, dissolved oxygen sags, algal turbidity and salts concentrate. Slow onset.',
    params: [{ key: 'severity', label: 'Heat severity', min: 0.2, max: 1, default: 0.6, step: 0.1, unit: '×' }],
  },
];

export function scenarioById(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function createRun(def: ScenarioDef, params: Record<string, number> | undefined, runNumber: number): ScenarioRun {
  const safe: Record<string, number> = {};
  for (const spec of def.params) {
    const raw = params?.[spec.key] ?? spec.default;
    safe[spec.key] = Math.min(spec.max, Math.max(spec.min, raw));
  }
  return {
    id: `run-${String(runNumber).padStart(3, '0')}`,
    scenarioId: def.id,
    params: safe,
    status: 'ACTIVE',
    startedAt: new Date().toISOString(),
    endedAt: null,
    targetZoneIds: targetZonesFor(def.id),
  };
}

function targetZonesFor(scenarioId: ScenarioId): string[] {
  if (scenarioId === 'HEAVY_URBAN_RUNOFF') {
    return ['z04', 'z05', 'z07', 'z08', 'z09', 'z11']; // imperviousness ≥ ~0.47 urban zones
  }
  return ['z01', 'z02', 'z03', 'z04', 'z05', 'z06', 'z07', 'z08', 'z09', 'z10', 'z11', 'z12'];
}

/** Pulse shape: peaks ~6h after onset, mostly receded by +24h. */
function runoffPulse(u: number): number {
  return Math.exp(-Math.pow((u - 6) / 6, 2));
}

/** Slow onset for heat: ramps over 18h. */
function heatOnset(u: number): number {
  return Math.min(1, u / 18);
}

/** Scenario delta for a variable at hour-offset u (0..24) in a zone. */
export function scenarioDelta(
  scenarioId: ScenarioId,
  params: Record<string, number>,
  variable: WaterVariable,
  imperviousness: number,
  u: number,
): number {
  const imp = 0.25 + 0.95 * imperviousness;
  switch (scenarioId) {
    case 'HEAVY_URBAN_RUNOFF': {
      const I = params.intensity ?? 0.7;
      const p = runoffPulse(u);
      if (variable === 'turbidity') return I * 95 * imp * p;
      if (variable === 'conductivity') return I * 80 * imp * p;
      if (variable === 'water_level') return I * 2.1 * (0.5 + 0.7 * imperviousness) * p;
      if (variable === 'dissolved_oxygen') return -I * 2.7 * (0.3 + 0.7 * imperviousness) * p;
      if (variable === 'temperature') return -I * 0.5 * p;
      return 0;
    }
    case 'EXTREME_RAINFALL': {
      const M = params.magnitude ?? 0.7;
      const p = runoffPulse(u);
      if (variable === 'water_level') return M * 3.1 * p;
      if (variable === 'turbidity') return M * 48 * (0.3 + 0.9 * imperviousness) * p;
      if (variable === 'dissolved_oxygen') return -M * 1.6 * p;
      if (variable === 'conductivity') return -M * 32 * p;
      if (variable === 'temperature') return -M * 0.9 * p;
      return 0;
    }
    case 'HEAT_STRESS': {
      const H = params.severity ?? 0.6;
      const g = heatOnset(u);
      if (variable === 'temperature') return H * 5.5 * g;
      if (variable === 'dissolved_oxygen') return -H * 2.3 * g;
      if (variable === 'turbidity') return H * 9 * g;
      if (variable === 'conductivity') return H * 28 * g;
      return 0;
    }
    case 'NORMAL_CONDITIONS':
      return 0;
    default:
      return 0;
  }
}

/** Materialize the run's simulated observations for the target zones. */
export function materializeRun(
  run: ScenarioRun,
  zones: Zone[],
  points: MonitoringPoint[],
): Observation[] {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const rand = mulberry32(1000 + Number(run.id.slice(4)) * 7919);
  const obs: Observation[] = [];
  for (const zoneId of run.targetZoneIds) {
    const zone = zoneById.get(zoneId);
    if (!zone) continue;
    for (const point of points.filter((p) => p.zoneId === zoneId)) {
      // Citizen points also register the event (residents notice odors and
      // discoloration) — with lower quality, as sporadic human reports.
      const isCitizen = point.kind === 'CITIZEN_REPORT';
      for (const variable of point.variables) {
        for (let u = 1; u <= 24; u++) {
          if (isCitizen && u % 5 !== 0) continue;
          const t = BASELINE_HOURS + u;
          const base = baselineValue(zone, variable, t, rand);
          const value = clampVar(variable, base + scenarioDelta(run.scenarioId, run.params, variable, zone.imperviousness, u));
          obs.push({
            id: `${run.id}:${point.id}:${variable}:${t}`,
            pointId: point.id,
            variable,
            value,
            unit: VARIABLE_META[variable].unit,
            ts: tsForHour(t),
            provenance: 'SIMULATED',
            quality: isCitizen ? 0.5 : 0.9,
            scenarioRunId: run.id,
          });
        }
      }
    }
  }
  return obs;
}

function clampVar(variable: WaterVariable, v: number): number {
  const RANGES: Record<WaterVariable, [number, number]> = {
    turbidity: [0.5, 400],
    conductivity: [50, 2000],
    dissolved_oxygen: [0.5, 14],
    water_level: [0.3, 12],
    temperature: [2, 40],
  };
  const [min, max] = RANGES[variable];
  return Math.min(max, Math.max(min, v));
}
