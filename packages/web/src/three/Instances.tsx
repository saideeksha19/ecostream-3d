import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { NO_RAYCAST } from './geography';

export interface LandscapeInstance {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: number;
}

/** One draw per material, with no raycast cost for non-analytical context. */
export function Instances({ name, geometry, items, roughness = 0.94, castShadow = false }: {
  name: string;
  geometry: THREE.BufferGeometry;
  items: LandscapeInstance[];
  roughness?: number;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, index) => {
      transform.position.set(...item.position);
      transform.scale.set(...item.scale);
      transform.rotation.set(0, item.rotation ?? 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(item.color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh name={name} ref={ref} args={[geometry, undefined, Math.max(1, items.length)]} castShadow={castShadow} receiveShadow raycast={NO_RAYCAST}>
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}
