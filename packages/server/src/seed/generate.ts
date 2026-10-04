import type { MonitoringPoint, Observation, Vec2, WaterVariable, Zone, ZoneKind } from '@ecostream/shared';
import { VARIABLE_META } from '@ecostream/shared';

/**
 * Deterministic synthetic demo dataset.
 *
 * EVERYTHING produced here is synthetic. Nothing in this file models a real
 * watershed; values are shaped to be *plausible* (diurnal cycles, a storm
 * front, land-use differences, an industrial discharge anomaly, sensor gaps)
 * so the analysis and risk engines have meaningful signals to work on.
 */

export const BASE_EPOCH = Date.parse('2026-04-01T00:00:00Z');
const HOUR_MS = 3_600_000;
export const BASELINE_HOURS = 72;
export const RIVER_CHAINAGE_M = 7000;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** River centre-line z coordinate at plan x (metres). */
export function riverZ(x: number): number {
  return 300 + 90 * Math.sin(x / 130) + 35 * Math.sin(x / 47 + 1.7);
}

export const PLANE = { width: 840, depth: 560 } as const;

interface ZoneSpec {
  name: string;
  kind: ZoneKind;
  imperviousness: number;
  population: number;
  width: number;
  depth: number;
}

const ZONE_SPECS: ZoneSpec[] = [
  { name: 'Headwater Woods', kind: 'park', imperviousness: 0.06, population: 120, width: 62, depth: 96 },
  { name: 'Upper Meadows', kind: 'residential', imperviousness: 0.3, population: 5200, width: 64, depth: 112 },
  { name: 'Millbrook Village', kind: 'residential', imperviousness: 0.38, population: 6800, width: 64, depth: 108 },
  { name: 'Eastgate Industrial', kind: 'industrial', imperviousness: 0.88, population: 7400, width: 64, depth: 104 },
  { name: 'Central Commercial', kind: 'commercial', imperviousness: 0.82, population: 12100, width: 64, depth: 100 },
  { name: 'Riverside Park', kind: 'park', imperviousness: 0.1, population: 300, width: 64, depth: 92 },
  { name: 'Northgate Heights', kind: 'residential', imperviousness: 0.52, population: 9300, width: 64, depth: 114 },
  { name: 'Old Town Core', kind: 'urban_core', imperviousness: 0.91, population: 15400, width: 64, depth: 96 },
  { name: 'Southbank Residential', kind: 'residential', imperviousness: 0.47, population: 8600, width: 64, depth: 110 },
  { name: 'Greenway Corridor', kind: 'riparian', imperviousness: 0.18, population: 410, width: 64, depth: 98 },
  { name: 'Harbor Works', kind: 'industrial', imperviousness: 0.79, population: 5300, width: 64, depth: 106 },
  { name: 'Estuary Wetlands', kind: 'agricultural', imperviousness: 0.22, population: 640, width: 64, depth: 128 },
];

export const SENSOR_ZONE_IDS = ['z01', 'z02', 'z03', 'z04', 'z05', 'z06', 'z08', 'z10', 'z12'];
export const CITIZEN_ZONE_IDS = ['z03', 'z07', 'z09', 'z11'];

const SENSOR_VARS: WaterVariable[] = ['turbidity', 'conductivity', 'dissolved_oxygen', 'water_level', 'temperature'];
const CITIZEN_VARS: WaterVariable[] = ['turbidity', 'dissolved_oxygen'];

const SENSOR_NAMES: Record<string, string> = {
  z01: 'Headwater Gauge',
  z02: 'Upper Meadows Probe',
  z03: 'Millbrook Sonde',
  z04: 'Eastgate Effluent Monitor',
  z05: 'Central Outfall Sensor',
  z06: 'Riverside Reference',
  z08: 'Old Town Pump Station',
  z10: 'Greenway Bypass Monitor',
  z12: 'Estuary Gauge',
};

const CITIZEN_NAMES: Record<string, string> = {
  z03: 'Millbrook residents',
  z07: 'Northgate community',
  z09: 'Southbank walkers',
  z11: 'Harbor Works workers',
};

/** Typical baseline level per variable by land use (downstream terms added later). */
const BASE: Record<'turbidity' | 'conductivity' | 'dissolved_oxygen', Record<ZoneKind, number>> = {
  turbidity: { park: 6, residential: 9, commercial: 12, urban_core: 13, industrial: 15, riparian: 5, agricultural: 10 },
  conductivity: { park: 180, residential: 260, commercial: 320, urban_core: 340, industrial: 420, riparian: 170, agricultural: 290 },
  dissolved_oxygen: { park: 8.6, residential: 8.2, commercial: 7.6, urban_core: 7.4, industrial: 7.1, riparian: 8.8, agricultural: 8.0 },
};

const NOISE: Record<WaterVariable, number> = {
  turbidity: 2.2,
  conductivity: 13,
  dissolved_oxygen: 0.3,
  water_level: 0.09,
  temperature: 0.4,
};

const AMP: Record<WaterVariable, number> = {
  turbidity: 1.2,
  conductivity: 8,
  dissolved_oxygen: 0.7,
  water_level: 0.15,
  temperature: 1.8,
};

const PHASE: Record<WaterVariable, number> = {
  turbidity: 8,
  conductivity: 8,
  dissolved_oxygen: 15,
  water_level: 20,
  temperature: 15,
};

/** min, max, decimals */
const RANGE: Record<WaterVariable, [number, number, number]> = {
  turbidity: [0.5, 400, 2],
  conductivity: [50, 2000, 1],
  dissolved_oxygen: [0.5, 14, 2],
  water_level: [0.3, 12, 3],
  temperature: [2, 40, 2],
};

/** Rain multipliers for the baseline weather front (hours 38–45). */
function storm(u: number): number {
  if (u < 0 || u > 8) return 0;
  return Math.exp(-Math.pow((u - 3.5) / 2.2, 2));
}

/** Industrial discharge anomaly at Eastgate (z04): ramp → plateau → partial decay. */
function industrialShape(t: number): number {
  if (t < 54) return 0;
  if (t <= 58) return (t - 54) / 4;
  if (t <= 64) return 1;
  return Math.max(0, 1 - ((t - 64) / 7) * 0.65);
}

/** Slow urban-salt accumulation at Old Town Core (z08) conductivity. */
function urbanSaltShape(t: number): number {
  if (t < 20) return 0;
  return Math.min(1, (t - 20) / 36);
}

const INDUSTRIAL_DELTA: Record<WaterVariable, number> = {
  turbidity: 55,
  conductivity: 95,
  dissolved_oxygen: -2.4,
  water_level: 0,
  temperature: 0.8,
};

function clampVar(variable: WaterVariable, v: number): number {
  const [min, max, decimals] = RANGE[variable];
  return Number(Math.min(max, Math.max(min, v)).toFixed(decimals));
}

/** Plausible value of `variable` at hour `t` for a zone (includes noise). */
export function baselineValue(zone: Zone, variable: WaterVariable, t: number, rand: () => number): number {
  const ch = zone.riverDistanceM / RIVER_CHAINAGE_M;
  let v: number;
  switch (variable) {
    case 'turbidity':
      v = BASE.turbidity[zone.kind] + 4 * ch;
      break;
    case 'conductivity':
      v = BASE.conductivity[zone.kind] + 150 * ch;
      break;
    case 'dissolved_oxygen':
      v = BASE.dissolved_oxygen[zone.kind] - 0.8 * ch;
      break;
    case 'water_level':
      v = 2.2 + 3.4 * ch;
      break;
    case 'temperature':
      v = 16.5 + 1.6 * ch;
      break;
    default:
      throw new Error(`unknown variable: ${String(variable)}`);
  }
  v += AMP[variable] * Math.sin((2 * Math.PI * (t - PHASE[variable])) / 24);

  const rain = storm(t - 38);
  if (rain > 0) {
    const imp = zone.imperviousness;
    if (variable === 'water_level') v += 2.4 * rain * (0.5 + 0.7 * imp);
    if (variable === 'turbidity') v += 14 * rain * (0.3 + 0.9 * imp);
    if (variable === 'conductivity') v -= 22 * rain;
    if (variable === 'dissolved_oxygen') v += 0.3 * rain;
    if (variable === 'temperature') v -= 0.6 * rain;
  }

  if (zone.id === 'z04') v += industrialShape(t) * INDUSTRIAL_DELTA[variable];
  if (zone.id === 'z08' && variable === 'conductivity') v += 72 * urbanSaltShape(t);

  v += gauss(rand) * NOISE[variable];
  return clampVar(variable, v);
}

export function tsForHour(hour: number): string {
  return new Date(BASE_EPOCH + hour * HOUR_MS).toISOString();
}

export interface GeneratedDataset {
  zones: Zone[];
  points: MonitoringPoint[];
  riverPath: Vec2[];
  observations: Observation[];
}

export function generateDataset(): GeneratedDataset {
  const rand = mulberry32(20260401);

  const zones: Zone[] = ZONE_SPECS.map((spec, i) => {
    const cx = 30 + (i + 0.5) * 65;
    const zc = riverZ(cx);
    const jitter = (): number => (rand() - 0.5) * 8;
    const polygon: Vec2[] = [
      { x: cx - spec.width / 2 + jitter(), z: zc - spec.depth / 2 + jitter() },
      { x: cx + spec.width / 2 + jitter(), z: zc - spec.depth / 2 + jitter() },
      { x: cx + spec.width / 2 + jitter(), z: zc + spec.depth / 2 + jitter() },
      { x: cx - spec.width / 2 + jitter(), z: zc + spec.depth / 2 + jitter() },
    ];
    const num = String(i + 1).padStart(2, '0');
    const zone: Zone = {
      id: `z${num}`,
      code: `ZONE ${num}`,
      name: spec.name,
      kind: spec.kind,
      imperviousness: spec.imperviousness,
      population: spec.population,
      polygon,
      riverDistanceM: Math.round(((cx - 30) / 780) * RIVER_CHAINAGE_M),
      upstreamZoneId: i === 0 ? null : `z${String(i).padStart(2, '0')}`,
    };
    return zone;
  });

  const zoneCenters = new Map<string, Vec2>(
    zones.map((z) => {
      const xs = z.polygon.map((p) => p.x);
      const zs = z.polygon.map((p) => p.z);
      return [z.id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 }];
    }),
  );

  const points: MonitoringPoint[] = [];
  SENSOR_ZONE_IDS.forEach((zoneId, i) => {
    const c = zoneCenters.get(zoneId);
    if (!c) throw new Error(`no center for ${zoneId}`);
    points.push({
      id: `s${String(i + 1).padStart(2, '0')}`,
      zoneId,
      name: SENSOR_NAMES[zoneId] ?? `Sensor ${i + 1}`,
      kind: 'SENSOR',
      position: { x: c.x + 16, z: riverZ(c.x) + 13 },
      variables: [...SENSOR_VARS],
    });
  });
  CITIZEN_ZONE_IDS.forEach((zoneId, i) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error(`no zone ${zoneId}`);
    const xs = zone.polygon.map((p) => p.x);
    const zs = zone.polygon.map((p) => p.z);
    points.push({
      id: `c${String(i + 1).padStart(2, '0')}`,
      zoneId,
      name: CITIZEN_NAMES[zoneId] ?? `Citizen point ${i + 1}`,
      kind: 'CITIZEN_REPORT',
      position: {
        x: (Math.min(...xs) + Math.max(...xs)) / 2 + (rand() - 0.5) * 20,
        z: (Math.min(...zs) + Math.max(...zs)) / 2 + (rand() - 0.5) * 20,
      },
      variables: [...CITIZEN_VARS],
    });
  });

  const riverPath: Vec2[] = [];
  for (let x = 20; x <= 820; x += 10) riverPath.push({ x, z: riverZ(x) });

  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const observations: Observation[] = [];
  for (const point of points) {
    const zone = zoneById.get(point.zoneId);
    if (!zone) throw new Error(`no zone for point ${point.id}`);
    for (const variable of point.variables) {
      for (let t = 0; t < BASELINE_HOURS; t++) {
        const skipProb = point.kind === 'SENSOR' ? 0.012 : 0.06; // realistic gaps
        if (rand() < skipProb) continue;
        observations.push({
          id: `${point.id}:${variable}:${t}`,
          pointId: point.id,
          variable,
          value: baselineValue(zone, variable, t, rand),
          unit: VARIABLE_META[variable].unit,
          ts: tsForHour(t),
          provenance: point.kind === 'SENSOR' ? 'OBSERVED' : 'CITIZEN',
          quality: point.kind === 'SENSOR' ? 1 : 0.7,
          scenarioRunId: null,
        });
      }
    }
  }

  return { zones, points, riverPath, observations };
}
