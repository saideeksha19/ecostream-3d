import { useEffect, useMemo, useState } from 'react';
import { useThree, type EventHandlers } from '@react-three/fiber';
import * as THREE from 'three';
import type { MonitoringPoint } from '@ecostream/shared';
import { useApp } from '../store';
import { surfaceY } from './geography';

/** Real store positions, with field-instrument silhouettes rather than glowing pins. */
function Station({ point, geometry, selectionEnabled }: { point: MonitoringPoint; geometry: { post: THREE.BufferGeometry; box: THREE.BufferGeometry; foot: THREE.BufferGeometry }; selectionEnabled: boolean }) {
  const select = useApp((state) => state.select);
  const canvas = useThree((state) => state.gl.domElement);
  const [pointerOver, setHover] = useState(false);
  const hover = selectionEnabled && pointerOver;
  useEffect(() => { if (!selectionEnabled) setHover(false); }, [selectionEnabled]);
  const sensor = point.kind === 'SENSOR';
  const y = surfaceY(point.position.x, point.position.z);
  useEffect(() => {
    if (!hover) return;
    canvas.style.cursor = 'pointer';
    return () => { canvas.style.cursor = ''; };
  }, [canvas, hover]);
  const handlers: EventHandlers = selectionEnabled ? {
    onClick: (event) => { event.stopPropagation(); select(point.zoneId); },
    onPointerOver: (event) => { event.stopPropagation(); setHover(true); },
    onPointerOut: () => setHover(false),
  } : {};
  return (
    <group
      name={`station-${point.id}`}
      position={[point.position.x, y, point.position.z]}
      userData={{ pointId: point.id, zoneId: point.zoneId, kind: point.kind, name: point.name }}
      {...handlers}
    >
      <mesh name={`station-${point.id}-footing`} geometry={geometry.foot} position={[0, 0.5, 0]} receiveShadow>
        <meshStandardMaterial color="#b9b8a4" roughness={0.96} />
      </mesh>
      <mesh name={`station-${point.id}-mast`} geometry={geometry.post} position={[0, 4.8, 0]} castShadow>
        <meshStandardMaterial color={hover ? '#e0d4a4' : '#c0c7bc'} roughness={0.62} metalness={0.35} />
      </mesh>
      <mesh name={`station-${point.id}-instrument`} geometry={geometry.box} position={[0, 8.4, 0]} scale={sensor ? [3.1, 2.6, 2.1] : [3.3, 3.1, 0.8]} castShadow>
        <meshStandardMaterial color={hover ? '#ddd2a5' : sensor ? '#ddd8be' : '#cfc290'} roughness={0.82} />
      </mesh>
      <mesh name={`station-${point.id}-panel`} geometry={geometry.box} position={[0, sensor ? 10.3 : 8.4, sensor ? 0.2 : 0.47]} rotation={sensor ? [0.3, 0, 0] : [0, 0, 0]} scale={sensor ? [4.7, 0.25, 2.8] : [2.1, 1.6, 0.15]}>
        <meshStandardMaterial color={sensor ? '#5c6a51' : '#e0ddd0'} roughness={0.6} metalness={sensor ? 0.18 : 0} />
      </mesh>
    </group>
  );
}

export function Stations({ points, selectionEnabled = true }: { points: MonitoringPoint[]; selectionEnabled?: boolean }) {
  const geometry = useMemo(() => ({ post: new THREE.CylinderGeometry(0.36, 0.43, 8.5, 6), box: new THREE.BoxGeometry(1, 1, 1), foot: new THREE.CylinderGeometry(2.2, 2.5, 1, 8) }), []);
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  return (
    <group name="monitoring-stations">
      {points.map((point) => <Station key={point.id} point={point} geometry={geometry} selectionEnabled={selectionEnabled} />)}
    </group>
  );
}
