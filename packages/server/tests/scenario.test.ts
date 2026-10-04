import { beforeEach, describe, expect, it } from 'vitest';
import type { Observation } from '@ecostream/shared';
import { RISK_THRESHOLDS } from '@ecostream/shared';
import { EcoApp } from '../src/app/app';
import { EcoStore } from '../src/db/store';
import { generateDataset } from '../src/seed/generate';
import { tempStoreFile } from './helpers';

/**
 * Scenario mutation + reset behavior, through the real EcoApp state machine
 * with an isolated store (never touching data/ecostream.json).
 */

let app: EcoApp;

beforeEach(() => {
  const { zones, points, observations } = generateDataset();
  const store = new EcoStore();
  store.zones = zones;
  store.points = points;
  store.observations = observations;
  store.reindex();
  store.save(tempStoreFile('scenario'));
  app = new EcoApp(store);
});

const byId = <T extends { zoneId: string }>(arr: T[]): Map<string, T> => new Map(arr.map((a) => [a.zoneId, a]));

describe('baseline recompute', () => {
  it('marks everything NORMAL with OBSERVED provenance', () => {
    const all = app.recompute();
    expect(all).toHaveLength(12);
    for (const a of all) {
      expect(a.state).toBe('NORMAL');
      expect(a.scenarioRunId).toBeNull();
      expect(a.evidence.every((e) => e.provenance === 'OBSERVED')).toBe(true);
    }
  });
});

describe('HEAVY_URBAN_RUNOFF mutation', () => {
  it('escalates impervious zones via simulated observations, not direct state edits', () => {
    const before = byId(app.recompute());
    const run = app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    expect(run.status).toBe('ACTIVE');
    expect(run.params.intensity).toBe(1);

    // Simulated observations exist, carry SIMULATED provenance and the run id.
    const sim = app.store.observations.filter((o) => o.scenarioRunId === run.id) as Observation[];
    expect(sim.length).toBeGreaterThan(0);
    expect(sim.every((o) => o.provenance === 'SIMULATED')).toBe(true);
    expect(sim.every((o) => o.ts > '2026-04-04T00:00:00.000Z')).toBe(true); // hours 73..96

    const after = byId(app.store.assessments.filter((a) => a.scenarioRunId === run.id));
    // Target urban zones escalate to the escalation floor (EW + 3).
    for (const id of run.targetZoneIds) {
      expect(after.get(id)!.state).toBe('EARLY_WARNING');
      expect(after.get(id)!.score).toBeGreaterThanOrEqual(RISK_THRESHOLDS.EARLY_WARNING);
    }
    // Impervious targets rose sharply from baseline.
    expect(after.get('z04')!.score).toBeGreaterThan(before.get('z04')!.score + 30);
    // Permeable zones stay calm.
    for (const id of ['z01', 'z02', 'z03', 'z06', 'z10', 'z12']) {
      expect(after.get(id)!.state).toBe('NORMAL');
    }
    // Provenance flipped on every assessment while the run is active.
    for (const a of after.values()) {
      expect(a.evidence.every((e) => e.provenance === 'SIMULATED')).toBe(true);
    }
  });

  it('propagates risk to downstream non-target zones', () => {
    app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    const after = byId(app.store.assessments.filter((a) => a.scenarioRunId !== null));
    // z06 sits downstream of target z05 but is not itself targeted.
    const z06Before = app.recompute(); // no-op; recompute keeps the run active
    void z06Before;
    const z06 = after.get('z06')!;
    const spatial = z06.components.find((x) => x.id === 'spatial')!;
    expect(spatial.score).toBeGreaterThan(0);
    expect(spatial.summary).toContain('z05');
  });

  it('scales impact with intensity (0.7 vs 1.0)', () => {
    app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 0.7 });
    const turb07 = Math.max(...app.store.observations.filter((o) => o.scenarioRunId !== null && o.variable === 'turbidity' && o.pointId === 's04').map((o) => o.value));
    app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    const turb10 = Math.max(...app.store.observations.filter((o) => o.scenarioRunId !== null && o.variable === 'turbidity' && o.pointId === 's04').map((o) => o.value));
    expect(turb10).toBeGreaterThan(turb07);
  });
});

describe('reset behavior', () => {
  it('restores the exact baseline (scores, provenance, observations)', () => {
    const baseline = byId(app.recompute());
    const run = app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    expect(app.store.activeRun()?.id).toBe(run.id);

    app.reset();
    expect(app.store.activeRun()).toBeUndefined();
    expect(run.status).toBe('RESET');
    expect(run.endedAt).not.toBeNull();
    expect(app.store.observations.every((o) => o.scenarioRunId === null)).toBe(true);

    const restored = byId(app.store.assessments.filter((a) => a.scenarioRunId === null));
    for (const [zoneId, a] of restored) {
      expect(a.score).toBeCloseTo(baseline.get(zoneId)!.score, 6);
      expect(a.state).toBe('NORMAL');
      expect(a.evidence.every((e) => e.provenance === 'OBSERVED')).toBe(true);
    }
  });

  it('replaces an active run when a new scenario starts', () => {
    const first = app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 0.5 });
    const second = app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    expect(app.store.activeRun()?.id).toBe(second.id);
    expect(first.status).toBe('RESET');
    expect(app.store.observations.some((o) => o.scenarioRunId === first.id)).toBe(false);
    expect(app.store.observations.some((o) => o.scenarioRunId === second.id)).toBe(true);
  });
});
