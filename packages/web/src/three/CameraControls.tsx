import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLANE } from '@ecostream/shared';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTO_ROTATE_SPEED, IdleRotation, type RotationOptions } from './idleRotation';

/** Fit every model corner at every azimuth, not just the initial viewing angle. */
export function frameWatershed(camera: THREE.PerspectiveCamera, target: THREE.Vector3, direction = new THREE.Vector3(0.3, 1.15, 1.35).normalize()): void {
  const vertical = direction.y;
  const horizontal = Math.hypot(direction.x, direction.z);
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanHorizontal = tanVertical * camera.aspect;
  let distance = 0;
  for (const x of [0, PLANE.width]) {
    for (const y of [-12, 65]) {
      for (const z of [0, PLANE.depth]) {
        const radius = Math.hypot(x - target.x, z - target.z);
        const height = y - target.y;
        // Maximize each frustum constraint over a full horizontal revolution.
        distance = Math.max(distance,
          height * vertical + radius * Math.hypot(horizontal, 1 / tanHorizontal),
          height * (vertical + horizontal / tanVertical) + radius * Math.abs(horizontal - vertical / tanVertical),
          height * (vertical - horizontal / tanVertical) + radius * Math.abs(horizontal + vertical / tanVertical));
      }
    }
  }
  distance *= 1.12;
  camera.position.copy(target).addScaledVector(direction, distance);
  // Portrait previews can need more distance than the original desktop far plane.
  camera.far = Math.max(camera.far, distance * 2 + Math.hypot(PLANE.width, PLANE.depth));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

interface Props {
  active?: boolean;
  autoRotate?: boolean;
}

/** One R3F loop: animate only while idle rotation or manual damping needs frames. */
export function CameraControls({ active = true, autoRotate = true }: Props) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<OrbitControls | null>(null);
  const interacted = useRef(false);
  const idle = useRef(new IdleRotation());
  const options = useRef<RotationOptions>({ active, autoRotate, reducedMotion: false });
  const wasRotating = useRef(false);
  const sync = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    options.current.active = active;
    options.current.autoRotate = autoRotate;
    sync.current();
  }, [active, autoRotate]);

  useEffect(() => {
    const canvas = gl.domElement;
    const orbit = new OrbitControls(camera, canvas);
    orbit.target.set(PLANE.width / 2, 8, PLANE.depth / 2);
    orbit.maxPolarAngle = Math.PI / 2.15;
    orbit.minDistance = 160;
    orbit.maxDistance = 3000;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.autoRotateSpeed = AUTO_ROTATE_SPEED;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    options.current.reducedMotion = media.matches;
    let wakeup: ReturnType<typeof setTimeout> | undefined;
    const syncRotation = (): void => {
      clearTimeout(wakeup);
      wakeup = undefined;
      const now = performance.now();
      orbit.enabled = options.current.active;
      if (!orbit.enabled) idle.current.releaseAll(now);
      const delay = idle.current.delay(options.current, now);
      if (!orbit.autoRotate || delay !== 0) wasRotating.current = false;
      orbit.autoRotate = delay === 0;
      // Automatic movement must not leave angular damping momentum after a pause.
      // Keep the original damping for manual orbit, zoom and pan.
      orbit.enableDamping = !orbit.autoRotate;
      if (delay !== null && delay > 0) wakeup = setTimeout(syncRotation, delay);
      if (options.current.active) invalidate();
    };
    sync.current = syncRotation;
    const begin = (source: string): void => {
      if (!orbit.enabled) return;
      interacted.current = true;
      idle.current.begin(source, performance.now());
      syncRotation();
    };
    const end = (source: string): void => {
      idle.current.end(source, performance.now());
      syncRotation();
    };
    const onStart = (): void => begin('pointer');
    const onEnd = (): void => end('pointer');
    const onChange = (): void => { if (options.current.active) invalidate(); };
    const onMotionChange = (): void => {
      options.current.reducedMotion = media.matches;
      syncRotation();
    };
    const onBlur = (): void => {
      idle.current.releaseAll(performance.now());
      syncRotation();
    };
    const isCameraKey = (event: KeyboardEvent): boolean => Object.values(orbit.keys).includes(event.code);
    const onKeyDown = (event: KeyboardEvent): void => { if (isCameraKey(event)) begin(event.code); };
    const onKeyUp = (event: KeyboardEvent): void => { if (isCameraKey(event)) end(event.code); };
    const onPointerDown = (): void => { if (orbit.enabled) canvas.focus({ preventScroll: true }); };
    const previousTabIndex = canvas.getAttribute('tabindex');
    if (previousTabIndex === null) canvas.tabIndex = 0;
    // Capture key input before OrbitControls.update(); it doesn't emit start/end for keys.
    canvas.addEventListener('keydown', onKeyDown, true);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('blur', onBlur);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    orbit.listenToKeyEvents(canvas);
    orbit.addEventListener('change', onChange);
    orbit.addEventListener('start', onStart);
    orbit.addEventListener('end', onEnd);
    media.addEventListener('change', onMotionChange);
    controls.current = orbit;
    if (camera instanceof THREE.PerspectiveCamera) {
      frameWatershed(camera, orbit.target);
      orbit.maxDistance = Math.max(3000, camera.position.distanceTo(orbit.target) * 1.8);
    }
    orbit.update(0);
    syncRotation();
    const debug = import.meta.env.DEV ? window as unknown as Record<string, unknown> : null;
    if (debug) debug.__orbit = orbit;
    return () => {
      clearTimeout(wakeup);
      sync.current = () => {};
      idle.current.releaseAll(performance.now());
      canvas.removeEventListener('keydown', onKeyDown, true);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('blur', onBlur);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (previousTabIndex === null) canvas.removeAttribute('tabindex');
      media.removeEventListener('change', onMotionChange);
      orbit.removeEventListener('change', onChange);
      orbit.removeEventListener('start', onStart);
      orbit.removeEventListener('end', onEnd);
      orbit.dispose();
      controls.current = null;
      if (debug?.__orbit === orbit) delete debug.__orbit;
    };
  }, [camera, gl, invalidate]);

  useEffect(() => {
    const orbit = controls.current;
    if (options.current.active && size.width > 0 && size.height > 0 && !interacted.current && orbit && camera instanceof THREE.PerspectiveCamera) {
      // Resize the pristine overview without resetting its current auto-orbit azimuth.
      frameWatershed(camera, orbit.target, camera.position.clone().sub(orbit.target).normalize());
      orbit.maxDistance = Math.max(3000, camera.position.distanceTo(orbit.target) * 1.8);
      orbit.update(0);
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || !options.current.active) return;
    const rotating = idle.current.delay(options.current, performance.now()) === 0;
    orbit.autoRotate = rotating;
    orbit.enableDamping = !rotating;
    // Demand rendering and hidden tabs can produce a large first delta; never catch up.
    orbit.update(rotating && wasRotating.current ? Math.min(delta, 0.05) : 0);
    wasRotating.current = rotating;
    if (rotating) invalidate();
  });
  return null;
}
