import { beforeEach, describe, expect, it } from 'vitest';
import { type RiskAssessment } from '@ecostream/shared';
import { EcoApp } from '../src/app/app';
import { EcoStore } from '../src/db/store';
import { zoneInsights, watershedOneHealth } from '../src/app/insights';
import { forecastZone, projectScore } from '../src/forecast/engine';
import { calculateZoneOneHealth } from '../src/one-health/engine';
import { computeZoneRisk, nowForRun } from '../src/risk/engine';
import { ctx, obsFor, pointsFor } from './helpers';
import { generateDataset } from '../src/seed/generate';

let app: EcoApp;

beforeEach(() => {
  const { zones, points, observations } = generateDataset();
  const store = new EcoStore();
  store.zones = zones;
  store.points = points;
  store.observations = observations;
  store.reindex();
  // Keep this integration fixture in memory; production app persistence is
  // covered by the existing store tests and should not race other Vitest files.
  store.save = () => {};
  app = new EcoApp(store);
  app.recompute();
});

describe('explanation evidence', () => {
  it('exposes component contributions, measured evidence and provenance', () => {
    const result = zoneInsights(app.store, 'z04')!;
    expect(result.explanation.riskScore).toBeCloseTo(30.2, 1);
    expect(result.explanation.provenance).toBe('DERIVED');
    expect(result.explanation.explanation).toContain('Confidence:');
    expect(result.explanation.explanation).toContain('Evidence provenance: OBSERVED');
    expect(result.explanation.components).toHaveLength(5);
    expect(result.explanation.evidence.some((item) => item.variable === 'turbidity')).toBe(true);
    expect(result.explanation.evidence.some((item) => item.measuredValue !== undefined && item.baselineValue !== undefined)).toBe(true);
    expect(result.explanation.evidence.every((item) => item.provenance === 'OBSERVED')).toBe(true);
  });
});

describe('comparison and integration state', () => {
  it('compares stored baseline observations with the active scenario', () => {
    const baseline = zoneInsights(app.store, 'z04')!;
    const run = app.runScenario('HEAVY_URBAN_RUNOFF', { intensity: 1 });
    const scenario = zoneInsights(app.store, 'z04')!;
    expect(run.id).toBe(scenario.comparison.scenarioRunId);
    expect(scenario.comparison.scenario?.provenance).toBe('SIMULATED');
    expect(scenario.comparison.scoreDelta).toBeGreaterThan(30);
    expect(scenario.comparison.componentDeltas).toHaveLength(5);
    expect(scenario.comparison.changedObservations.some((item) => item.variable === 'turbidity' && (item.delta ?? 0) > 0)).toBe(true);
    expect(scenario.comparison.newEvidence.length).toBeGreaterThan(0);
    expect(scenario.explanation.explanation).toContain('Evidence provenance: SIMULATED');
    expect(baseline.comparison.scenario).toBeNull();

    expect(scenario.forecast.points).toHaveLength(4);
    expect(scenario.oneHealth.scenarioRunId).toBe(run.id);
    app.reset();
    const restored = zoneInsights(app.store, 'z04')!;
    expect(restored.comparison.scenario).toBeNull();
    expect(restored.forecast.scenarioRunId).toBeNull();
    expect(restored.oneHealth.scenarioRunId).toBeNull();
    expect(restored.explanation.riskScore).toBeCloseTo(baseline.explanation.riskScore, 6);
  });
});

describe('forecast heuristic', () => {
  it('moves in the direction of a recent trend', () => {
    expect(projectScore(50, 0.8, 24)).toBeGreaterThan(50);
    expect(projectScore(50, -0.8, 24)).toBeLessThan(50);
  });

  it('decays confidence and grows uncertainty with horizon', () => {
    const c = ctx();
    const assessment = computeZoneRisk({
      zone: c.zoneById.get('z04')!,
      observations: obsFor(c, 'z04'),
      points: pointsFor(c, 'z04'),
      upstream: [],
      activeRun: null,
      nowTs: nowForRun(null),
    }).assessment;
    const result = forecastZone({
      zoneId: 'z04',
      scenarioRunId: null,
      assessment,
      observations: obsFor(c, 'z04'),
      variables: pointsFor(c, 'z04').flatMap((point) => point.variables).filter((v, i, all) => all.indexOf(v) === i),
      nowTs: nowForRun(null),
    });
    expect(result.points[0]!.confidence).toBeGreaterThan(result.points[3]!.confidence);
    expect(result.points[0]!.uncertaintyHigh - result.points[0]!.uncertaintyLow).toBeLessThan(
      result.points[3]!.uncertaintyHigh - result.points[3]!.uncertaintyLow,
    );
    expect(result.disclaimer).toContain('Not a calibrated hydrological model');
  });

  it('reports a projected threshold crossing', () => {
    const c = ctx();
    const assessment: RiskAssessment = {
      ...computeZoneRisk({
        zone: c.zoneById.get('z04')!,
        observations: obsFor(c, 'z04'),
        points: pointsFor(c, 'z04'),
        upstream: [],
        activeRun: null,
        nowTs: nowForRun(null),
      }).assessment,
      score: 73,
      state: 'INVESTIGATE',
    };
    const result = forecastZone({
      zoneId: 'z04',
      scenarioRunId: null,
      assessment,
      observations: obsFor(c, 'z04'),
      variables: pointsFor(c, 'z04').flatMap((point) => point.variables).filter((v, i, all) => all.indexOf(v) === i),
      nowTs: nowForRun(null),
    });
    // The seeded zone has a positive deterioration momentum, so this near-threshold
    // fixture produces a signal rather than claiming a guaranteed outcome.
    expect(result.thresholdCrossing).not.toBeNull();
    expect(result.thresholdCrossing?.message).toContain('demonstration signal');
  });
});

describe('One Health calculation', () => {
  it('is deterministic, derived, and aggregates the same zone results', () => {
    const c = ctx();
    const zone = c.zoneById.get('z04')!;
    const points = pointsFor(c, 'z04');
    const observations = obsFor(c, 'z04');
    const result = computeZoneRisk({ zone, observations, points, upstream: [], activeRun: null, nowTs: nowForRun(null) });
    const snapshotA = calculateZoneOneHealth({ zone, assessment: result.assessment, analysis: result.analysis, generatedAt: nowForRun(null) });
    const snapshotB = calculateZoneOneHealth({ zone, assessment: result.assessment, analysis: result.analysis, generatedAt: nowForRun(null) });
    expect(snapshotA).toEqual(snapshotB);
    expect(snapshotA.dataStatus).toBe('DEMONSTRATION / SYNTHETIC DATA');
    expect(snapshotA.dimensions.map((dimension) => dimension.id)).toEqual(['environment', 'ecosystem', 'exposure', 'community']);
    expect(snapshotA.dimensions.every((dimension) => dimension.provenance === 'DERIVED')).toBe(true);
    expect(watershedOneHealth(app.store).zoneCount).toBe(12);
    expect(watershedOneHealth(app.store).provenance).toBe('DERIVED');
  });
});
