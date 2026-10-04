import { useEffect, useMemo } from 'react';
import { PLANE, riverZ, terrainHeight } from '@ecostream/shared';
import type { MonitoringPoint, Zone } from '@ecostream/shared';
import * as THREE from 'three';
import { NO_RAYCAST, distanceToPath, noise, ribbonGeometry, roadHeight, roadPaths, tributaryPaths, zoneCenter } from './geography';
import { Instances } from './Instances';
import type { LandscapeInstance } from './Instances';

export interface BuildingFootprint { x: number; z: number; width: number; depth: number }

/** Stable, explicitly illustrative built context; it never creates domain entities. */
export function createBuildings(zones: Zone[], points: MonitoringPoint[]) {
  const walls: LandscapeInstance[] = [];
  const roofs: LandscapeInstance[] = [];
  const foundations: LandscapeInstance[] = [];
  const pitched: LandscapeInstance[] = [];
  const windows: LandscapeInstance[] = [];
  const equipment: LandscapeInstance[] = [];
  const footprints: BuildingFootprint[] = [];
  const roads = roadPaths();
  const streams = tributaryPaths();
  const centers = zones.map((zone) => ({ zone, center: zoneCenter(zone) }));
  for (let gx = 0, x = 29; x < PLANE.width - 23; x += 18, gx++) {
    for (let gz = 0, z = 51; z < PLANE.depth - 45; z += 24, gz++) {
      const nearest = centers.reduce<typeof centers[number] | undefined>((best, candidate) => !best || Math.abs(candidate.center.x - x) < Math.abs(best.center.x - x) ? candidate : best, undefined);
      if (!nearest) continue;
      const { zone, center } = nearest;
      const n = noise(gx, gz, 23);
      const developed = ['residential', 'urban_core', 'commercial', 'industrial'].includes(zone.kind);
      if (!developed || Math.abs(z - center.z) > 192 || n > (0.38 + zone.imperviousness * 0.44)) continue;
      const industrial = zone.kind === 'industrial';
      const residential = zone.kind === 'residential';
      const width = industrial ? 13 + n * 2 : residential ? 6.5 + n * 3 : 9 + n * 4;
      const depth = industrial ? 17 + n * 3 : residential ? 8 + n * 3 : 12 + n * 4;
      const radius = Math.hypot(width, depth) * 0.5;
      if (Math.abs(z - riverZ(x)) < radius + 23) continue;
      if (roads.some((road) => distanceToPath(x, z, road.points) < radius + road.width / 2 + 1.8)) continue;
      if (streams.some((path) => distanceToPath(x, z, path) < radius + 4)) continue;
      if (points.some((point) => Math.hypot(point.position.x - x, point.position.z - z) < radius + 7)) continue;
      const height = residential ? 5 + n * 5 : industrial ? 7 + n * 5 : zone.kind === 'urban_core' ? 16 + n * 27 : 11 + n * 14;
      const ground = Math.max(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => terrainHeight(x + sx * width / 2, z + sz * depth / 2))));
      const base = ground - 0.65;
      const wallPalette = residential ? ['#c1b8a1', '#b3afa0', '#bba890', '#d1c6ae'] : industrial ? ['#aeb7b1', '#bbbdb4', '#9da9a4'] : ['#c3c7bb', '#b6beb6', '#ccc9bb', '#a9b1ac'];
      const wall = wallPalette[Math.floor(noise(gx, gz, 17) * wallPalette.length)]!;
      walls.push({ position: [x, base + height / 2, z], scale: [width, height, depth], color: wall });
      footprints.push({ x, z, width, depth });
      foundations.push({ position: [x, base + 0.05, z], scale: [width + (industrial ? 3.4 : 1.8), 0.5, depth + (industrial ? 4 : 2.4)], color: residential ? '#999987' : '#a5aaa0' });
      if (residential) {
        pitched.push({ position: [x, base + height, z], scale: [width + 0.9, 2.8, depth + 0.9], color: ['#6f6c60', '#876f5d', '#666e6a'][Math.floor(n * 3)]! });
      } else {
        roofs.push({ position: [x, base + height + 0.28, z], scale: [width + 0.6, 0.55, depth + 0.6], color: industrial ? '#d0d0bf' : '#89968e' });
        equipment.push({ position: [x - width * 0.18, base + height + 1.15, z + depth * 0.12], scale: [width * 0.24, 1.4, depth * 0.22], color: '#c4c6ba' });
        if (industrial) {
          // Long, shallow roof lights distinguish warehouse sheds from city towers.
          for (const offset of [-0.26, 0.26]) equipment.push({ position: [x + width * offset, base + height + 0.7, z - 2], scale: [1.4, 0.38, depth * 0.55], color: '#7d9292' });
        }
      }
      if (!industrial) {
        for (let floor = 3; floor < height - 0.6; floor += residential ? 3.1 : 4.1) {
          windows.push({ position: [x, base + floor, z + depth / 2 + 0.06], scale: [width * 0.7, residential ? 1 : 1.35, 0.12], color: '#6c7b79' });
          windows.push({ position: [x + width / 2 + 0.06, base + floor, z], scale: [0.12, residential ? 1 : 1.35, depth * 0.7], color: '#718180' });
        }
      }
    }
  }
  return { walls, roofs, foundations, pitched, windows, equipment, footprints };
}

function pitchedRoof(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, -0.5,
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5,
    -0.5, 0, -0.5, -0.5, 0, 0.5, 0, 1, -0.5,
    -0.5, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
    0, 1, -0.5, 0, 1, 0.5, 0.5, 0, -0.5,
    0, 1, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function mergeSurfaces(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const geometry of geometries) {
    const expanded = geometry.index ? geometry.toNonIndexed() : geometry;
    positions.push(...expanded.attributes.position!.array);
    if (expanded !== geometry) expanded.dispose();
    geometry.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.computeVertexNormals();
  return result;
}

function createRoads() {
  const roads = roadPaths();
  const surface: THREE.BufferGeometry[] = [];
  const shoulders: THREE.BufferGeometry[] = [];
  const dashes: THREE.BufferGeometry[] = [];
  const bridgeRails: THREE.BufferGeometry[] = [];
  for (const road of roads) {
    shoulders.push(ribbonGeometry(road.points, road.width + 1.5, (x, z) => roadHeight(x, z, road.bridge)));
    surface.push(ribbonGeometry(road.points, road.width, (x, z) => roadHeight(x, z, road.bridge) + 0.06));
    for (let i = 2; i < road.points.length - 1; i += 5) {
      dashes.push(ribbonGeometry(road.points.slice(i, i + 2), 0.24, (x, z) => roadHeight(x, z, road.bridge) + 0.1));
    }
    if (road.bridge) {
      const crossing = road.points.filter((p) => Math.abs(p.z - riverZ(p.x)) < 37);
      for (const side of [-1, 1]) {
        bridgeRails.push(ribbonGeometry(crossing.map((p) => ({ x: p.x + side * (road.width / 2 + 0.55), z: p.z })), 0.45, (x, z) => roadHeight(x, z, true) + 1.35));
      }
    }
  }
  return { surface: mergeSurfaces(surface), shoulders: mergeSurfaces(shoulders), dashes: mergeSurfaces(dashes), bridgeRails: mergeSurfaces(bridgeRails) };
}

export function Roads() {
  const resources = useMemo(createRoads, []);
  useEffect(() => () => Object.values(resources).forEach((geometry) => geometry.dispose()), [resources]);
  return (
    <group name="illustrative-road-network" userData={{ illustrative: true }}>
      <mesh name="road-verges" geometry={resources.shoulders} raycast={NO_RAYCAST} receiveShadow>
        <meshStandardMaterial color="#b4b39d" roughness={1} />
      </mesh>
      <mesh name="roads-and-bridges" geometry={resources.surface} raycast={NO_RAYCAST} receiveShadow>
        <meshStandardMaterial color="#717975" roughness={0.96} />
      </mesh>
      <mesh name="road-markings" geometry={resources.dashes} raycast={NO_RAYCAST}>
        <meshBasicMaterial color="#d4d0b6" transparent opacity={0.62} depthWrite={false} />
      </mesh>
      <mesh name="bridge-parapets" geometry={resources.bridgeRails} raycast={NO_RAYCAST}>
        <meshStandardMaterial color="#bdbdaf" roughness={0.84} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function BuiltLandscape({ zones, points }: { zones: Zone[]; points: MonitoringPoint[] }) {
  const buildings = useMemo(() => createBuildings(zones, points), [zones, points]);
  const geometry = useMemo(() => ({ box: new THREE.BoxGeometry(1, 1, 1), roof: pitchedRoof(), crown: new THREE.IcosahedronGeometry(1, 1), trunk: new THREE.CylinderGeometry(0.5, 0.7, 1, 5), stone: new THREE.IcosahedronGeometry(1, 0) }), []);
  const vegetation = useMemo(() => {
    const crowns: LandscapeInstance[] = [];
    const trunks: LandscapeInstance[] = [];
    const rocks: LandscapeInstance[] = [];
    const roads = roadPaths();
    const streams = tributaryPaths();
    const palette = ['#586f4d', '#667952', '#74815a', '#485f47', '#7c8961', '#5b7456'];
    for (let ix = 0, gx = 10; gx < PLANE.width - 10; gx += 12, ix++) {
      for (let iz = 0, gz = 10; gz < PLANE.depth - 10; gz += 12, iz++) {
        // Scatter continuously, not on a visible planting grid. Broad density
        // patches read as woodland stands, with open grassland between them.
        const x = 9 + noise(ix, iz, 4) * (PLANE.width - 18);
        const z = 9 + noise(ix, iz, 8) * (PLANE.depth - 18);
        const riverDistance = Math.abs(z - riverZ(x));
        const forest = (Math.sin(x / 73 + 1.6) * Math.cos(z / 94) + 1) * 0.5;
        const density = riverDistance < 65 ? 0.68 : 0.06 + forest * forest * 0.9;
        if (riverDistance < 24 || noise(ix, iz, 15) > density) continue;
        const radius = 3.1 + noise(ix, iz, 19) * 2.7;
        if (roads.some((road) => distanceToPath(x, z, road.points) < radius + road.width / 2 + 1.5)) continue;
        if (streams.some((path) => distanceToPath(x, z, path) < radius + 2)) continue;
        if (buildings.footprints.some((b) => Math.abs(b.x - x) < b.width / 2 + radius + 1.5 && Math.abs(b.z - z) < b.depth / 2 + radius + 1.5)) continue;
        if (points.some((point) => Math.hypot(point.position.x - x, point.position.z - z) < radius + 7)) continue;
        const ground = terrainHeight(x, z);
        const height = 7.5 + noise(ix, iz, 31) * 8;
        const color = palette[Math.floor(noise(ix, iz, 32) * palette.length)]!;
        const rotation = noise(ix, iz, 11) * Math.PI;
        trunks.push({ position: [x, ground + height * 0.29, z], scale: [0.65, height * 0.58, 0.65], color: '#716a52' });
        crowns.push({ position: [x, ground + height * 0.72, z], scale: [radius, height * 0.37, radius * 0.88], color, rotation });
        if (noise(ix, iz, 37) > 0.35) crowns.push({ position: [x + radius * 0.5, ground + height * 0.59, z + radius * 0.23], scale: [radius * 0.72, height * 0.29, radius * 0.79], color, rotation: -rotation });
      }
    }
    for (let i = 0; i < 270; i++) {
      const x = 5 + noise(i, 0, 51) * 830;
      const side = i % 2 ? 1 : -1;
      const z = riverZ(x) + side * (17 + noise(i, 1, 52) * 8);
      const size = 0.65 + noise(i, 2, 53) * 1.1;
      rocks.push({ position: [x, Math.max(terrainHeight(x, z), 0.4) + size * 0.15, z], scale: [size * 1.2, size * 0.58, size], color: i % 3 ? '#9d9b85' : '#828877', rotation: noise(i, 3) * Math.PI });
    }
    return { crowns, trunks, rocks };
  }, [buildings, points]);
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  return (
    <group name="illustrative-landscape" userData={{ illustrative: true, description: 'Procedural land-use context, not a surveyed building or vegetation inventory' }}>
      <Instances name="building-foundations" geometry={geometry.box} items={buildings.foundations} />
      <Instances name="buildings-masonry" geometry={geometry.box} items={buildings.walls} castShadow />
      <Instances name="buildings-flat-roofs" geometry={geometry.box} items={buildings.roofs} castShadow />
      <Instances name="residential-pitched-roofs" geometry={geometry.roof} items={buildings.pitched} castShadow />
      <Instances name="building-facade-detail" geometry={geometry.box} items={buildings.windows} roughness={0.65} />
      <Instances name="industrial-roof-detail" geometry={geometry.box} items={buildings.equipment} castShadow />
      <Instances name="vegetation-trunks" geometry={geometry.trunk} items={vegetation.trunks} />
      <Instances name="vegetation-canopy" geometry={geometry.crown} items={vegetation.crowns} castShadow />
      <Instances name="riverbank-stones" geometry={geometry.stone} items={vegetation.rocks} />
    </group>
  );
}
