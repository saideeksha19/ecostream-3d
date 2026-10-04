import { useThree, type EventHandlers } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { RiskAssessment, Zone } from '@ecostream/shared';
import { RISK_COLORS } from '@ecostream/shared';
import { useApp } from '../store';
import { ribbonGeometry, samplePath, surfaceY, zoneCenter, zoneGeometry } from './geography';

interface Props {
  zone: Zone;
  assessment: RiskAssessment | undefined;
  selectionEnabled?: boolean;
}

function labelTexture(text: string, color: string, active: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = active ? 256 : 128;
  canvas.height = 80;
  const context = canvas.getContext('2d')!;
  const width = canvas.width;
  context.fillStyle = active ? 'rgba(23, 34, 32, 0.97)' : 'rgba(28, 39, 34, 0.83)';
  context.beginPath();
  context.roundRect(2, 3, width - 4, 69, 10);
  context.fill();
  context.strokeStyle = active ? color : 'rgba(206, 217, 198, 0.22)';
  context.lineWidth = active ? 3 : 1.5;
  context.stroke();
  context.fillStyle = color;
  context.fillRect(17, 24, 5, 25);
  context.font = `600 ${active ? 29 : 33}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#e8eee2';
  context.fillText(text, width / 2 + 7, 39);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** An exact, finely tessellated GIS footprint. Selection never changes domain data. */
export function ZoneMesh({ zone, assessment, selectionEnabled = true }: Props) {
  const selectedInStore = useApp((state) => state.selectedZoneId === zone.id);
  const selected = selectionEnabled && selectedInStore;
  const select = useApp((state) => state.select);
  const canvas = useThree((state) => state.gl.domElement);
  const [pointerOver, setHover] = useState(false);
  const hover = selectionEnabled && pointerOver;
  const active = selected || hover;
  useEffect(() => { if (!selectionEnabled) setHover(false); }, [selectionEnabled]);
  const color = assessment ? RISK_COLORS[assessment.state] : '#9aab9d';
  const geometry = useMemo(() => ({
    fill: zoneGeometry(zone.polygon),
    boundary: ribbonGeometry(samplePath(zone.polygon, 3, true), 0.85, (x, z) => surfaceY(x, z) + 0.72),
    selected: ribbonGeometry(samplePath(zone.polygon, 3, true), 1.85, (x, z) => surfaceY(x, z) + 0.84),
    focus: ribbonGeometry(samplePath(zone.polygon, 3, true), 0.48, (x, z) => surfaceY(x, z) + 0.98),
  }), [zone.polygon]);
  const texture = useMemo(() => labelTexture(active ? zone.code : zone.id.toUpperCase(), color, active), [zone.code, zone.id, color, active]);
  const anchor = useMemo(() => {
    const center = zoneCenter(zone);
    const z = Math.max(...zone.polygon.map((p) => p.z)) + 5;
    return [center.x, surfaceY(center.x, z) + 12, z] as [number, number, number];
  }, [zone]);
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    if (!hover) return;
    canvas.style.cursor = 'pointer';
    return () => { canvas.style.cursor = ''; };
  }, [canvas, hover]);
  const onClick = (event: { stopPropagation: () => void }): void => {
    event.stopPropagation();
    select(zone.id);
  };
  const onOver = (event: { stopPropagation: () => void }): void => {
    event.stopPropagation();
    setHover(true);
  };
  const handlers: EventHandlers = selectionEnabled ? { onClick, onPointerOver: onOver, onPointerOut: () => setHover(false) } : {};

  return (
    <group name={`zone-${zone.id}`} userData={{ zoneId: zone.id, selected, riskState: assessment?.state ?? null }}>
      <mesh
        name={`zone-${zone.id}-footprint`}
        geometry={geometry.fill}
        renderOrder={1}
        {...handlers}
      >
        <meshStandardMaterial color={color} transparent opacity={selected ? 0.24 : hover ? 0.2 : 0.085} roughness={1} emissive={color} emissiveIntensity={selected ? 0.18 : 0} depthWrite={false} side={THREE.DoubleSide} forceSinglePass polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh name={`zone-${zone.id}-boundary`} geometry={active ? geometry.selected : geometry.boundary} renderOrder={2}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.64} depthWrite={false} side={THREE.DoubleSide} forceSinglePass />
      </mesh>
      {selected && (
        <mesh name={`zone-${zone.id}-selection-outline`} geometry={geometry.focus} renderOrder={3}>
          <meshBasicMaterial color="#edf0d9" transparent opacity={0.88} depthWrite={false} side={THREE.DoubleSide} forceSinglePass />
        </mesh>
      )}
      <sprite
        name={`zone-${zone.id}-label`}
        position={anchor}
        scale={active ? [0.079, 0.025, 1] : [0.035, 0.022, 1]}
        renderOrder={10}
        {...handlers}
        userData={{ label: active ? zone.code : zone.id.toUpperCase() }}
      >
        <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} sizeAttenuation={false} toneMapped={false} />
      </sprite>
    </group>
  );
}
