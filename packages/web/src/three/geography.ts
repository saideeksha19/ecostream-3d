import { PLANE, riverZ, terrainHeight } from '@ecostream/shared';
import type { Vec2, Zone } from '@ecostream/shared';
import * as THREE from 'three';

/** Presentation geometry only. All heights and the main river use shared metres. */
export const WATER_Y = 0.65;
export const RIVER_HALF_WIDTH = 14;
export const NO_RAYCAST: THREE.Object3D['raycast'] = () => {};

export function noise(x: number, z: number, seed = 0): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 73.3) * 43758.5453;
  return n - Math.floor(n);
}

export function surfaceY(x: number, z: number): number {
  return Math.max(terrainHeight(x, z), Math.abs(z - riverZ(x)) <= RIVER_HALF_WIDTH ? WATER_Y : -Infinity);
}

export function insidePolygon(x: number, z: number, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function zoneCenter(zone: Zone): Vec2 {
  const xs = zone.polygon.map((p) => p.x);
  const zs = zone.polygon.map((p) => p.z);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
}

export function samplePath(points: Vec2[], step = 5, closed = false): Vec2[] {
  const result: Vec2[] = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const segments = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  if (points.length) result.push(closed ? points[0]! : points[points.length - 1]!);
  return result;
}

/** A ribbon, not a tube: roads and boundaries sit on the sampled heightfield. */
export function ribbonGeometry(points: Vec2[], width: number, height: (x: number, z: number) => number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / length;
    const nz = (b.x - a.x) / length;
    for (const side of [-1, 1]) {
      const x = p.x + nx * width * 0.5 * side;
      const z = p.z + nz * width * 0.5 * side;
      positions.push(x, height(x, z), z);
    }
    if (i < points.length - 1) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Triangulate the real polygon, then subdivide so even its interior follows hills. */
export function zoneGeometry(polygon: Vec2[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const triangles = THREE.ShapeUtils.triangulateShape(polygon.map((p) => new THREE.Vector2(p.x, p.z)), []);
  const subdivide = (a: Vec2, b: Vec2, c: Vec2, depth: number): void => {
    const longest = Math.max(Math.hypot(a.x - b.x, a.z - b.z), Math.hypot(b.x - c.x, b.z - c.z), Math.hypot(c.x - a.x, c.z - a.z));
    if (longest > 7 && depth < 7) {
      const ab = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      const bc = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 };
      const ca = { x: (c.x + a.x) / 2, z: (c.z + a.z) / 2 };
      subdivide(a, ab, ca, depth + 1);
      subdivide(ab, b, bc, depth + 1);
      subdivide(ca, bc, c, depth + 1);
      subdivide(ab, bc, ca, depth + 1);
      return;
    }
    // ShapeUtils returns counterclockwise xy; reverse it for upward-facing xz.
    for (const p of [a, c, b]) positions.push(p.x, surfaceY(p.x, p.z) + 0.5, p.z);
  };
  for (const triangle of triangles) subdivide(polygon[triangle[0]!]!, polygon[triangle[1]!]!, polygon[triangle[2]!]!, 0);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// These minor streams are illustrative landscape context, NOT monitoring or flow data.
export const ILLUSTRATIVE_TRIBUTARIES: Vec2[][] = [
  [{ x: 75, z: 24 }, { x: 102, z: 83 }, { x: 82, z: 153 }, { x: 115, z: 213 }, { x: 135, z: 290 }, { x: 166, z: riverZ(166) }],
  [{ x: 367, z: 538 }, { x: 354, z: 490 }, { x: 372, z: 438 }, { x: 347, z: 394 }, { x: 338, z: riverZ(338) }],
  [{ x: 735, z: 30 }, { x: 699, z: 76 }, { x: 715, z: 122 }, { x: 680, z: 159 }, { x: 653, z: riverZ(653) }],
];

export function tributaryPaths(): Vec2[][] {
  return ILLUSTRATIVE_TRIBUTARIES.map((points) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
    return curve.getPoints(80).map((p) => ({ x: p.x, z: p.z }));
  });
}

export interface RoadPath { points: Vec2[]; width: number; bridge: boolean }
export function roadPaths(): RoadPath[] {
  const paths: RoadPath[] = [];
  // Riverfront roads retain a generous vegetated floodplain.
  for (const side of [-1, 1]) {
    const points: Vec2[] = [];
    for (let x = 28; x <= 812; x += 4) points.push({ x, z: riverZ(x) + side * 77 });
    paths.push({ points, width: 5.2, bridge: false });
  }
  for (const x of [195, 455, 650]) {
    paths.push({ points: samplePath([{ x, z: 56 }, { x, z: 508 }], 4), width: 6.5, bridge: true });
  }
  for (const z of [115, 470]) {
    paths.push({ points: samplePath([{ x: 115, z }, { x: 798, z }], 4), width: 5.5, bridge: false });
  }
  // Local access streets stop short of the riparian buffer, not extra crossings.
  for (const x of [130, 265, 520, 735]) {
    const river = riverZ(x);
    paths.push({ points: samplePath([{ x, z: 115 }, { x, z: river - 32 }], 4), width: 3.1, bridge: false });
    paths.push({ points: samplePath([{ x, z: river + 32 }, { x, z: 470 }], 4), width: 3.1, bridge: false });
  }
  return paths;
}

export function roadHeight(x: number, z: number, bridge: boolean): number {
  // Continuous low bridge decks at crossings; no roads laid on the water.
  return bridge ? Math.max(terrainHeight(x, z) + 0.25, 4.5) : terrainHeight(x, z) + 0.25;
}

export function distanceToPath(x: number, z: number, path: Vec2[]): number {
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    distance = Math.min(distance, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return distance;
}

export function inBounds(x: number, z: number, margin = 0): boolean {
  return x >= margin && z >= margin && x <= PLANE.width - margin && z <= PLANE.depth - margin;
}
