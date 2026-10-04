import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Terrain } from './Terrain';
import { River } from './River';
import { ZoneMesh } from './ZoneMesh';
import { Stations } from './Markers';
import { BuiltLandscape, Roads } from './Landscape';
import { CameraControls } from './CameraControls';
import { useApp } from '../store';

export interface WatershedSceneProps {
  active?: boolean;
  autoRotate?: boolean;
  selectionEnabled?: boolean;
}

function WatershedContents({ active, autoRotate, selectionEnabled }: Required<WatershedSceneProps>) {
  const zones = useApp((state) => state.zones);
  const points = useApp((state) => state.points);
  const assessments = useApp((state) => state.assessments);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(420, 0, 280);
    return target;
  }, []);
  useEffect(() => {
    // The landscape is static. Rebuild shadows only when actual scene data changes.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    if (active) invalidate();
  }, [gl, zones, points, active, invalidate]);
  useEffect(() => {
    // Local development inspection only: named objects, renderer draw counts, no telemetry.
    if (!import.meta.env.DEV) return;
    const debug = window as unknown as Record<string, unknown>;
    const inspection = { scene, renderer: gl };
    debug.__watershedScene = inspection;
    return () => { if (debug.__watershedScene === inspection) delete debug.__watershedScene; };
  }, [scene, gl]);

  return (
    <>
      <color attach="background" args={['#102A20']} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#e2e9e3', '#7b8267', 1.35]} />
      <primitive object={sunTarget} />
      <directionalLight
        name="afternoon-sun"
        position={[120, 620, 60]}
        target={sunTarget}
        intensity={2.1}
        color="#fff4db"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-610}
        shadow-camera-right={610}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
        shadow-camera-near={20}
        shadow-camera-far={1300}
        shadow-bias={-0.00025}
        shadow-normalBias={0.55}
      />
      <Terrain />
      <River />
      <Roads />
      <BuiltLandscape zones={zones} points={points} />
      {zones.map((zone) => <ZoneMesh key={zone.id} zone={zone} assessment={assessments.get(zone.id)} selectionEnabled={active && selectionEnabled} />)}
      <Stations points={points} selectionEnabled={active && selectionEnabled} />
      <CameraControls active={active} autoRotate={autoRotate} />
    </>
  );
}

/** Read-only presentation of the existing backend-backed store. No postprocessing. */
export function WatershedScene({ active = true, autoRotate = true, selectionEnabled = true }: WatershedSceneProps = {}) {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const onVisibility = (): void => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  const renderingActive = active && visible;
  return (
    <Canvas
      shadows
      // Keep the existing demand renderer. Inactive/hidden controls simply never invalidate it.
      frameloop="demand"
      dpr={[1, 1.6]}
      camera={{ position: [650, 950, 1400], fov: 39, near: 1, far: 4000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={(event) => { if (renderingActive && selectionEnabled && event.type === 'click') useApp.getState().select(null); }}
    >
      <WatershedContents active={renderingActive} autoRotate={autoRotate} selectionEnabled={selectionEnabled} />
    </Canvas>
  );
}
