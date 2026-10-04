import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { EcoStore } from '../src/db/store';
import { generateDataset } from '../src/seed/generate';
import { tempStoreFile } from './helpers';

/** JSON persistence layer: atomic save/load, run filtering, bookkeeping. */

function seededStore(): EcoStore {
  const { zones, points, observations } = generateDataset();
  const s = new EcoStore();
  s.zones = zones;
  s.points = points;
  s.observations = observations;
  s.reindex();
  return s;
}

describe('EcoStore persistence', () => {
  it('round-trips through disk without loss', () => {
    const file = tempStoreFile('roundtrip');
    const s = seededStore();
    s.save(file);
    const loaded = EcoStore.load(file);
    expect(loaded.zones).toEqual(s.zones);
    expect(loaded.points).toEqual(s.points);
    expect(loaded.observations).toEqual(s.observations);
    expect(loaded.meta.datasetLabel).toBe('SYNTHETIC DEMO DATASET');
    rmSync(file);
  });

  it('writes a temp file then renames atomically (no .tmp left behind)', () => {
    const file = tempStoreFile('atomic');
    seededStore().save(file);
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { observations: unknown[] };
    expect(raw.observations.length).toBe(3754);
    expect(existsSync(`${file}.tmp`)).toBe(false);
    rmSync(file);
  });

  it('effectiveObservations filters simulated rows by active run', () => {
    const s = seededStore();
    const before = s.effectiveObservations('z04', null);
    expect(before.every((o) => o.scenarioRunId === null)).toBe(true);

    s.observations.push({
      id: 'run-001:s04:turbidity:80',
      pointId: 's04',
      variable: 'turbidity',
      value: 120,
      unit: 'NTU',
      ts: '2026-04-04T08:00:00.000Z',
      provenance: 'SIMULATED',
      quality: 0.9,
      scenarioRunId: 'run-001',
    });
    s.reindex();

    // Hidden when inactive, visible only under its own run.
    expect(s.effectiveObservations('z04', null)).toHaveLength(before.length);
    expect(s.effectiveObservations('z04', 'run-001')).toHaveLength(before.length + 1);
    expect(s.effectiveObservations('z04', 'run-002')).toHaveLength(before.length);
  });

  it('dropRunObservations removes exactly the run’s rows and restores baseline visibility', () => {
    const s = seededStore();
    const baseCount = s.observations.length;
    const runObs = Array.from({ length: 3 }, (_, i) => ({
      id: `run-009:x${i}`,
      pointId: 's04',
      variable: 'turbidity' as const,
      value: 100 + i,
      unit: 'NTU',
      ts: '2026-04-04T09:00:00.000Z',
      provenance: 'SIMULATED' as const,
      quality: 0.9,
      scenarioRunId: 'run-009',
    }));
    s.observations.push(...runObs);
    s.reindex();
    s.dropRunObservations('run-009');
    expect(s.observations).toHaveLength(baseCount);
    expect(s.observations.every((o) => o.scenarioRunId === null)).toBe(true);
  });

  it('setAssessments replaces per-run assessment sets', () => {
    const s = seededStore();
    const mk = (zoneId: string, runId: string | null, score: number) => ({
      zoneId,
      scenarioRunId: runId,
      score,
      state: 'NORMAL' as const,
      confidence: 0.9,
      components: [],
      evidence: [],
      computedAt: '2026-04-03T23:00:00.000Z',
    });
    s.setAssessments(null, [mk('z01', null, 11)]);
    s.setAssessments(null, [mk('z01', null, 12), mk('z02', null, 10)]);
    expect(s.assessmentFor('z01', null)!.score).toBe(12);
    expect(s.assessmentFor('z02', null)!.score).toBe(10);
    s.setAssessments('run-001', [mk('z01', 'run-001', 78)]);
    expect(s.assessmentFor('z01', 'run-001')!.score).toBe(78);
    expect(s.assessmentFor('z01', null)!.score).toBe(12); // baseline untouched
  });
});
