import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { EcoStore } from '../src/db/store';
import { EcoApp } from '../src/app/app';
import { registerRoutes } from '../src/app/routes';
import { generateDataset } from '../src/seed/generate';

let http: ReturnType<typeof Fastify>;
let svc: EcoApp;

beforeEach(() => {
  const { zones, points, riverPath, observations } = generateDataset();
  const store = new EcoStore();
  store.zones = zones;
  store.points = points;
  store.riverPath = riverPath;
  store.observations = observations;
  store.reindex();
  // Route behavior is in-memory here; avoid sharing the production JSON file
  // with the scenario persistence test running in another Vitest worker.
  store.save = () => {};
  svc = new EcoApp(store);
  svc.recompute();
  http = Fastify({ logger: false });
  registerRoutes(http, svc);
});

describe('Milestone 2 API flow', () => {
  it('serves explainability, forecast, comparison and One Health from one selected zone', async () => {
    const zone = await http.inject({ method: 'GET', url: '/api/v1/zones/z04' });
    expect(zone.statusCode).toBe(200);
    const detail = zone.json() as { explanation: { provenance: string }; forecast: { points: unknown[] }; oneHealth: { zoneId: string }; comparison: { scenario: unknown } };
    expect(detail.explanation.provenance).toBe('DERIVED');
    expect(detail.forecast.points).toHaveLength(4);
    expect(detail.oneHealth.zoneId).toBe('z04');
    expect(detail.comparison.scenario).toBeNull();

    for (const path of ['/api/v1/zones/z04/explanation', '/api/v1/zones/z04/forecast', '/api/v1/zones/z04/one-health', '/api/v1/zones/z04/comparison', '/api/v1/one-health']) {
      expect((await http.inject({ method: 'GET', url: path })).statusCode).toBe(200);
    }
  });

  it('updates every insight endpoint for a scenario and restores baseline on reset', async () => {
    const before = (await http.inject({ method: 'GET', url: '/api/v1/zones/z04' })).json() as { assessment: { score: number }; oneHealth: { scenarioRunId: string | null } };
    const runResponse = await http.inject({
      method: 'POST',
      url: '/api/v1/scenarios/HEAVY_URBAN_RUNOFF/run',
      payload: { params: { intensity: 1 } },
    });
    expect(runResponse.statusCode).toBe(200);
    const run = runResponse.json() as { run: { id: string } };

    const during = (await http.inject({ method: 'GET', url: '/api/v1/zones/z04' })).json() as {
      assessment: { score: number; scenarioRunId: string };
      explanation: { provenance: string };
      forecast: { scenarioRunId: string | null };
      oneHealth: { scenarioRunId: string | null };
      comparison: { scoreDelta: number; scenarioRunId: string };
    };
    expect(during.assessment.score).toBeGreaterThan(before.assessment.score + 30);
    expect(during.assessment.scenarioRunId).toBe(run.run.id);
    expect(during.explanation.provenance).toBe('DERIVED');
    expect(during.forecast.scenarioRunId).toBe(run.run.id);
    expect(during.oneHealth.scenarioRunId).toBe(run.run.id);
    expect(during.comparison.scenarioRunId).toBe(run.run.id);
    expect(during.comparison.scoreDelta).toBeGreaterThan(30);

    const reset = await http.inject({ method: 'POST', url: `/api/v1/scenario-runs/${run.run.id}/reset` });
    expect(reset.statusCode).toBe(200);
    const after = (await http.inject({ method: 'GET', url: '/api/v1/zones/z04' })).json() as {
      assessment: { score: number; scenarioRunId: string | null };
      forecast: { scenarioRunId: string | null };
      oneHealth: { scenarioRunId: string | null };
      comparison: { scenario: unknown };
    };
    expect(after.assessment.score).toBeCloseTo(before.assessment.score, 6);
    expect(after.assessment.scenarioRunId).toBeNull();
    expect(after.forecast.scenarioRunId).toBeNull();
    expect(after.oneHealth.scenarioRunId).toBeNull();
    expect(after.comparison.scenario).toBeNull();
  });
});
