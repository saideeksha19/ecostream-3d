import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AUTO_ROTATE_SPEED, IDLE_RESUME_MS, IdleRotation, type RotationOptions } from './idleRotation';

const enabled: RotationOptions = { active: true, autoRotate: true, reducedMotion: false };

describe('idle camera rotation', () => {
  it('can start immediately, but never resumes during a held drag or touch', () => {
    const idle = new IdleRotation();
    expect(idle.delay(enabled, 0)).toBe(0);
    idle.begin('pointer', 100);
    expect(idle.delay(enabled, 100)).toBeNull();
    expect(idle.delay(enabled, 30_000)).toBeNull();
    idle.end('pointer', 30_000);
    expect(idle.delay(enabled, 30_000)).toBe(IDLE_RESUME_MS);
    expect(idle.delay(enabled, 32_999)).toBe(1);
    expect(idle.delay(enabled, 33_000)).toBe(0);
  });

  it('restarts the three-second delay after the last wheel event, not the first', () => {
    const idle = new IdleRotation();
    for (const now of [100, 500, 1000]) {
      idle.begin('pointer', now);
      idle.end('pointer', now);
    }
    expect(idle.delay(enabled, 3100)).toBe(900);
    expect(idle.delay(enabled, 3999)).toBe(1);
    expect(idle.delay(enabled, 4000)).toBe(0);
  });

  it('waits for all held camera keys and pointer input, including key repeats', () => {
    const idle = new IdleRotation();
    idle.begin('ArrowLeft', 0);
    idle.begin('ArrowLeft', 50);
    idle.begin('ArrowUp', 100);
    idle.begin('pointer', 150);
    idle.end('ArrowLeft', 200);
    idle.end('pointer', 300);
    expect(idle.delay(enabled, 5000)).toBeNull();
    idle.end('ArrowUp', 5000);
    expect(idle.delay(enabled, 7999)).toBe(1);
    expect(idle.delay(enabled, 8000)).toBe(0);
    idle.end('unrelated-key', 9000);
    expect(idle.delay(enabled, 9000)).toBe(0);
  });

  it.each([
    { ...enabled, active: false },
    { ...enabled, autoRotate: false },
    { ...enabled, reducedMotion: true },
  ])('suspends animation and its wake-up timer for %j', (options) => {
    const idle = new IdleRotation();
    expect(idle.delay(options, 0)).toBeNull();
    idle.begin('pointer', 0);
    idle.end('pointer', 100);
    expect(idle.delay(options, 200)).toBeNull();
    expect(idle.delay(options, 10_000)).toBeNull();
    // Changing a setting must not discard the user's pending idle deadline.
    expect(idle.delay(enabled, 3000)).toBe(100);
    expect(idle.delay(enabled, 3100)).toBe(0);
  });

  it('responds to reduced-motion changes in both directions without locking manual controls', () => {
    const idle = new IdleRotation();
    const reduced = { ...enabled, reducedMotion: true };
    expect(idle.delay(enabled, 0)).toBe(0);
    expect(idle.delay(reduced, 1)).toBeNull();
    idle.begin('pointer', 100);
    idle.end('pointer', 500);
    expect(idle.delay(enabled, 1000)).toBe(2500);
    expect(idle.delay(reduced, 4000)).toBeNull();
    expect(idle.delay(enabled, 4000)).toBe(0);
  });

  it('releases interrupted gestures on hiding/blur, with no repeated deadline extension', () => {
    const idle = new IdleRotation();
    idle.begin('pointer', 100);
    idle.begin('ArrowLeft', 200);
    idle.releaseAll(1000);
    idle.releaseAll(1500);
    expect(idle.delay(enabled, 3999)).toBe(1);
    expect(idle.delay(enabled, 4000)).toBe(0);
  });

  it.each([30, 60, 120])('takes 55 seconds per orbit at %s fps and stops without auto-damping drift', (fps) => {
    // Use real OrbitControls without a DOM connection: no renderer or fake camera math.
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 800, 1000);
    const orbit = new OrbitControls(camera);
    orbit.autoRotate = true;
    orbit.autoRotateSpeed = AUTO_ROTATE_SPEED;
    orbit.enableDamping = false;
    const initial = camera.position.clone();
    for (let frame = 0; frame < 55 * fps / 2; frame++) orbit.update(1 / fps);
    expect(camera.position.x).toBeCloseTo(0, 6);
    expect(camera.position.y).toBeCloseTo(initial.y, 6);
    expect(camera.position.z).toBeCloseTo(-initial.z, 6);
    for (let frame = 0; frame < 55 * fps / 2; frame++) orbit.update(1 / fps);
    expect(camera.position.distanceTo(initial)).toBeLessThan(0.000001);
    orbit.autoRotate = false;
    orbit.enableDamping = true;
    const paused = camera.position.clone();
    for (let frame = 0; frame < fps; frame++) orbit.update(1 / fps);
    expect(camera.position.distanceTo(paused)).toBeLessThan(0.000001);
  });
});
