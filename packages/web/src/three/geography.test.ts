import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PLANE, riverZ, terrainHeight } from '@ecostream/shared';
import type { Vec2, Zone } from '@ecostream/shared';
import { frameWatershed } from './CameraControls';
import { createBuildings } from './Landscape';
import { createRiverGeometry } from './River';
import { createTerrainGeometry } from './Terrain';
import { RIVER_HALF_WIDTH, WATER_Y, insidePolygon, ribbonGeometry, surfaceY, zoneGeometry } from './geography';

describe('watershed presentation coordinates', () => {
  it('places the entire terrain in canonical positive x/z and samples height in those same coordinates', () => {
    const geometry = createTerrainGeometry();
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.x).toBe(0);
    expect(geometry.boundingBox!.max.x).toBe(PLANE.width);
    expect(geometry.boundingBox!.min.z).toBeCloseTo(0);
    expect(geometry.boundingBox!.max.z).toBe(PLANE.depth);
    const positions = geometry.attributes.position!;
    for (let i = 0; i < positions.count; i++) {
      expect(positions.getY(i)).toBeCloseTo(terrainHeight(positions.getX(i), positions.getZ(i)), 4);
      expect(geometry.attributes.normal!.getY(i)).toBeGreaterThan(0);
    }
    geometry.dispose();
  });

  it('retains the canonical river centreline, channel width, and water elevation', () => {
    const geometry = createRiverGeometry();
    const positions = geometry.attributes.position!;
    for (let i = 0; i < positions.count; i += 6) {
      const x = positions.getX(i);
      expect((positions.getZ(i) + positions.getZ(i + 5)) / 2).toBeCloseTo(riverZ(x), 4);
      expect(positions.getZ(i + 5) - positions.getZ(i)).toBeCloseTo(RIVER_HALF_WIDTH * 2, 4);
      expect(positions.getY(i)).toBeCloseTo(WATER_Y);
      expect(geometry.attributes.normal!.getY(i)).toBeGreaterThan(0.99);
    }
    expect(positions.getX(0)).toBe(0);
    expect(positions.getX(positions.count - 1)).toBe(PLANE.width);
    geometry.dispose();
  });

  it('renders an actual concave polygon, not its bounding box, draped above terrain/water', () => {
    const polygon: Vec2[] = [{ x: 100, z: 210 }, { x: 170, z: 210 }, { x: 170, z: 240 }, { x: 125, z: 240 }, { x: 125, z: 305 }, { x: 100, z: 305 }];
    const original = structuredClone(polygon);
    const geometry = zoneGeometry(polygon);
    const positions = geometry.attributes.position!;
    expect(positions.count).toBeGreaterThan(100);
    for (let i = 0; i < positions.count; i += 3) {
      let x = 0;
      let z = 0;
      for (let j = 0; j < 3; j++) {
        const px = positions.getX(i + j);
        const pz = positions.getZ(i + j);
        x += px / 3;
        z += pz / 3;
        expect(positions.getY(i + j)).toBeCloseTo(surfaceY(px, pz) + 0.5, 4);
      }
      expect(insidePolygon(x, z, polygon)).toBe(true);
      expect(geometry.attributes.normal!.getY(i)).toBeGreaterThan(0);
    }
    expect(polygon).toEqual(original);
    geometry.dispose();
  });

  it('keeps road and boundary ribbon faces upward', () => {
    const geometry = ribbonGeometry([{ x: 5, z: 4 }, { x: 20, z: 9 }, { x: 36, z: 19 }], 2, terrainHeight);
    const normals = geometry.attributes.normal!;
    for (let i = 0; i < normals.count; i++) expect(normals.getY(i)).toBeGreaterThan(0);
    geometry.dispose();
  });

  it.each([0.65, 1, 1.45, 2])('frames the full terrain with breathing room at canvas aspect %s', (aspect) => {
    const camera = new THREE.PerspectiveCamera(39, aspect, 1, 4000);
    frameWatershed(camera, new THREE.Vector3(420, 8, 280));
    camera.updateMatrixWorld();
    for (const x of [0, PLANE.width]) {
      for (const y of [-12, 65]) {
        for (const z of [0, PLANE.depth]) {
          const projected = new THREE.Vector3(x, y, z).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.93);
          expect(Math.abs(projected.y)).toBeLessThan(0.93);
          expect(projected.z).toBeLessThan(1);
        }
      }
    }
  });

  it.each([0.4, 0.65, 1, 1.45, 2, 2.5])('keeps all model corners safely in view for a full orbit at aspect %s', (aspect) => {
    const camera = new THREE.PerspectiveCamera(39, aspect, 1, 4000);
    const target = new THREE.Vector3(420, 8, 280);
    frameWatershed(camera, target);
    const initial = camera.position.clone().sub(target);
    for (let degrees = 0; degrees < 360; degrees += 5) {
      camera.position.copy(initial).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees)).add(target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      for (const x of [0, PLANE.width]) {
        for (const y of [-12, 65]) {
          for (const z of [0, PLANE.depth]) {
            const projected = new THREE.Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(0.93);
            expect(Math.abs(projected.y)).toBeLessThan(0.93);
            expect(projected.z).toBeGreaterThan(-1);
            expect(projected.z).toBeLessThan(1);
          }
        }
      }
    }
  });

  it('retains the orbit direction when adapting an untouched overview to a new aspect', () => {
    const camera = new THREE.PerspectiveCamera(39, 1.45, 1, 4000);
    const target = new THREE.Vector3(420, 8, 280);
    frameWatershed(camera, target);
    const direction = camera.position.clone().sub(target).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.7);
    camera.aspect = 0.5;
    frameWatershed(camera, target, direction);
    expect(camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(0.000001);
  });

  it('does not fabricate buildings before real zones arrive and keeps illustrative buildings off the river', () => {
    expect(createBuildings([], []).walls).toEqual([]);
    const zones: Zone[] = [{ id: 'test-zone', code: 'TEST', name: 'Test residential footprint', kind: 'residential', imperviousness: 0.5, population: 0, riverDistanceM: 0, upstreamZoneId: null, polygon: [{ x: 410, z: 280 }, { x: 470, z: 280 }, { x: 470, z: 360 }, { x: 410, z: 360 }] }];
    const original = structuredClone(zones);
    const first = createBuildings(zones, []);
    const second = createBuildings(zones, []);
    expect(first.walls.length).toBeGreaterThan(0);
    expect(first).toEqual(second);
    for (const building of first.footprints) {
      expect(Math.abs(building.z - riverZ(building.x))).toBeGreaterThan(RIVER_HALF_WIDTH + Math.hypot(building.width, building.depth) / 2);
    }
    expect(zones).toEqual(original);
  });
});
