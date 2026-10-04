import type { MonitoringPoint, Observation, Zone } from '@ecostream/shared';
import { generateDataset } from '../src/seed/generate';
import { EcoStore } from '../src/db/store';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Shared fixtures for engine tests. The full deterministic dataset is the
 * canonical fixture: the same seed the server boots from, so test numbers
 * match the live demo exactly (e.g. z04 baseline = 30.2 NORMAL).
 */

export function fullDataset() {
  return generateDataset();
}

export interface Ctx {
  zones: Zone[];
  points: MonitoringPoint[];
  baseline: Observation[];
  zoneById: Map<string, Zone>;
}

export function ctx(): Ctx {
  const { zones, points, observations } = generateDataset();
  return {
    zones,
    points,
    baseline: observations,
    zoneById: new Map(zones.map((z) => [z.id, z])),
  };
}

/** Points for a zone. */
export function pointsFor(ctxObj: Ctx, zoneId: string): MonitoringPoint[] {
  return ctxObj.points.filter((p) => p.zoneId === zoneId);
}

/** Baseline observations for one zone. */
export function obsFor(ctxObj: Ctx, zoneId: string): Observation[] {
  const ids = new Set(pointsFor(ctxObj, zoneId).map((p) => p.id));
  return ctxObj.baseline.filter((o) => ids.has(o.pointId));
}

/** A persistent temp file path for EcoStore round-trip tests. */
export function tempStoreFile(name: string): string {
  return resolve(tmpdir(), `ecostream-test-${name}-${process.pid}.json`);
}
