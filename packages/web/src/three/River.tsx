import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PLANE, riverZ, terrainHeight } from '@ecostream/shared';
import { NO_RAYCAST, RIVER_HALF_WIDTH, WATER_Y, noise, ribbonGeometry, tributaryPaths } from './geography';

/** Constant-elevation water follows the canonical centreline, never an invented spline. */
export function createRiverGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const channels = [-1, -0.78, -0.4, 0.2, 0.72, 1];
  const deep = new THREE.Color('#3c6a55');
  const shallow = new THREE.Color('#7a937f');
  const color = new THREE.Color();
  const segments = 280;
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * PLANE.width;
    channels.forEach((across) => {
      positions.push(x, WATER_Y, riverZ(x) + RIVER_HALF_WIDTH * across);
      color.copy(deep).lerp(shallow, Math.pow(Math.abs(across), 3) * 0.7);
      color.multiplyScalar(0.97 + Math.sin(x / 41 + across * 3) * 0.035);
      colors.push(color.r, color.g, color.b);
    });
    if (i < segments) {
      for (let j = 0; j < channels.length - 1; j++) {
        const k = i * channels.length + j;
        indices.push(k, k + 1, k + channels.length, k + 1, k + channels.length + 1, k + channels.length);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function River() {
  const resources = useMemo(() => {
    const banks: THREE.BufferGeometry[] = [];
    const glints: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      // Bank sediment is terrain-following; it does not broaden or relocate the river.
      const points = Array.from({ length: 281 }, (_, i) => {
        const x = i * 3;
        return { x, z: riverZ(x) + side * (17.5 + Math.sin(x / 29) * 1.1) };
      });
      banks.push(ribbonGeometry(points, 4.5, (x, z) => Math.max(terrainHeight(x, z), WATER_Y - 0.12) + 0.08));
    }
    // Sparse, static reflections. No animated flow or pseudo-sensor signal.
    for (let i = 0; i < 26; i++) {
      const x = 20 + i * 31;
      const offset = (noise(i, 9) - 0.5) * 17;
      const points = Array.from({ length: 5 }, (_, j) => ({ x: x + j * 1.5, z: riverZ(x + j * 1.5) + offset }));
      glints.push(ribbonGeometry(points, 0.3, () => WATER_Y + 0.04));
    }
    const tributaries = tributaryPaths().map((points) => ({
      bank: ribbonGeometry(points, 5, (x, z) => terrainHeight(x, z) + 0.1),
      water: ribbonGeometry(points, 2.4, (x, z) => Math.max(terrainHeight(x, z) + 0.2, WATER_Y)),
    }));
    // Merge all glints into one buffer/draw without another library.
    const glintPositions: number[] = [];
    for (const geometry of glints) {
      const expanded = geometry.toNonIndexed();
      glintPositions.push(...expanded.attributes.position!.array);
      expanded.dispose();
      geometry.dispose();
    }
    const highlights = new THREE.BufferGeometry();
    highlights.setAttribute('position', new THREE.Float32BufferAttribute(glintPositions, 3));
    return { main: createRiverGeometry(), banks, tributaries, highlights };
  }, []);
  useEffect(() => () => {
    resources.main.dispose();
    resources.highlights.dispose();
    resources.banks.forEach((geometry) => geometry.dispose());
    resources.tributaries.forEach(({ bank, water }) => { bank.dispose(); water.dispose(); });
  }, [resources]);

  return (
    <group name="water-network">
      <mesh name="river-main" geometry={resources.main} raycast={NO_RAYCAST} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.48} metalness={0.12} />
      </mesh>
      {resources.banks.map((geometry, i) => (
        <mesh key={i} name={`river-bank-${i}`} geometry={geometry} raycast={NO_RAYCAST} receiveShadow>
          <meshStandardMaterial color="#a39d7f" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh name="river-surface-detail" geometry={resources.highlights} raycast={NO_RAYCAST}>
        <meshBasicMaterial color="#c6cfb4" transparent opacity={0.23} depthWrite={false} side={THREE.DoubleSide} forceSinglePass />
      </mesh>
      <group name="illustrative-tributaries" userData={{ illustrative: true, description: 'Landscape context only; not analytical flow or monitoring data' }}>
        {resources.tributaries.map(({ bank, water }, i) => (
          <group key={i} name={`illustrative-tributary-${i + 1}`}>
            <mesh geometry={bank} raycast={NO_RAYCAST}>
              <meshStandardMaterial color="#85896d" roughness={1} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={water} raycast={NO_RAYCAST}>
              <meshStandardMaterial color="#5f8878" roughness={0.72} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
