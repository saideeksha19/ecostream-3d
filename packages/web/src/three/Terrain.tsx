import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PLANE, riverZ, terrainHeight } from '@ecostream/shared';
import { NO_RAYCAST, noise, ribbonGeometry, samplePath } from './geography';

export function createTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(PLANE.width, PLANE.depth, 168, 112);
  // Transform into canonical x=[0,840], z=[0,560] BEFORE sampling the heightfield.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(PLANE.width / 2, 0, PLANE.depth / 2);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const grass = new THREE.Color('#78815c');
  const meadow = new THREE.Color('#a0a17c');
  const woodland = new THREE.Color('#596d4f');
  const sediment = new THREE.Color('#a29a7b');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const distance = Math.abs(z - riverZ(x));
    positions.setY(i, terrainHeight(x, z));
    const patch = Math.sin(x / 66 + Math.cos(z / 51)) * Math.sin(z / 78 + x / 133) * 0.5 + 0.5;
    color.copy(grass).lerp(meadow, patch * 0.62);
    const forest = (Math.sin(x / 102 + 1) * Math.cos(z / 93) + 1) * 0.5;
    color.lerp(woodland, forest * (distance < 45 ? 0.68 : 0.34));
    if (distance < 22) color.lerp(sediment, 0.78 * (1 - distance / 30));
    color.multiplyScalar(0.93 + noise(x, z) * 0.14);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function terrainTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const value = Math.round(205 + noise(x, z, 11) * 45);
      const i = (z * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 10);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** A shallow cut edge makes the domain legible without a floating coloured slab. */
function terrainEdge(): THREE.BufferGeometry {
  const points = samplePath([{ x: 0, z: 0 }, { x: PLANE.width, z: 0 }, { x: PLANE.width, z: PLANE.depth }, { x: 0, z: PLANE.depth }], 5, true);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  points.forEach((p, i) => {
    positions.push(p.x, terrainHeight(p.x, p.z), p.z, p.x, -11, p.z);
    const top = new THREE.Color('#77715d');
    const bottom = new THREE.Color('#484c40');
    colors.push(top.r, top.g, top.b, bottom.r, bottom.g, bottom.b);
    if (i < points.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function Terrain() {
  const resources = useMemo(() => ({
    terrain: createTerrainGeometry(),
    edge: terrainEdge(),
    texture: terrainTexture(),
    extent: ribbonGeometry(samplePath([{ x: 1, z: 1 }, { x: 839, z: 1 }, { x: 839, z: 559 }, { x: 1, z: 559 }], 4, true), 0.75, (x, z) => terrainHeight(x, z) + 0.32),
  }), []);
  useEffect(() => () => Object.values(resources).forEach((resource) => resource.dispose()), [resources]);

  return (
    <group name="watershed-landform">
      <mesh name="watershed-terrain" geometry={resources.terrain} receiveShadow raycast={NO_RAYCAST}>
        <meshStandardMaterial vertexColors map={resources.texture} roughness={1} />
      </mesh>
      <mesh name="watershed-cut-edge" geometry={resources.edge} raycast={NO_RAYCAST}>
        <meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh name="watershed-extent" geometry={resources.extent} raycast={NO_RAYCAST} userData={{ description: 'Canonical model extent; not an inferred catchment boundary' }}>
        <meshBasicMaterial color="#c3c4a9" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}
