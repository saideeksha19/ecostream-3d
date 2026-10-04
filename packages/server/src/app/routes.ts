import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { VARIABLE_META } from '@ecostream/shared';
import type { EcoApp } from './app';
import { analyzeZone } from '../analysis';
import { nowForRun } from '../risk/engine';
import { toRiskExplanation } from '../explanation/engine';
import { watershedOneHealth, zoneInsights } from './insights';

const runBody = z.object({ params: z.record(z.number()).optional() });

export function registerRoutes(app: FastifyInstance, svc: EcoApp): void {
  const store = svc.store;

  app.get('/api/v1/health', () => ({
    status: 'ok',
    dataset: store.meta.datasetLabel,
    provenanceNotice: store.meta.provenanceNotice,
    zones: store.zones.length,
    observations: store.observations.length,
    activeRun: store.activeRun()?.id ?? null,
  }));

  app.get('/api/v1/watershed', () => ({
    meta: store.meta,
    riverPath: store.riverPath,
    zones: store.zones,
    points: store.points,
    assessments: store.assessments.filter((a) => a.scenarioRunId === (store.activeRun()?.id ?? null)),
    activeRun: store.activeRun() ?? null,
    oneHealth: watershedOneHealth(store),
  }));

  app.get('/api/v1/zones/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const zone = store.zone(id);
    if (!zone) return reply.code(404).send({ error: `unknown zone: ${id}` });
    const activeRun = store.activeRun() ?? null;
    const runId = activeRun?.id ?? null;
    const assessment = store.assessmentFor(id, runId) ?? null;
    const observations = store.effectiveObservations(id, runId);
    const points = store.pointsForZone(id);
    const variables = [...new Set(points.flatMap((p) => p.variables))];
    const nowTs = nowForRun(runId);
    const analysis = analyzeZone(observations, variables, nowTs);

    const indicators = variables.map((v) => {
      const res = analysis.perVariable.get(v);
      if (!res) return null;
      return {
        variable: v,
        label: VARIABLE_META[v].label,
        unit: VARIABLE_META[v].unit,
        latest: res.window.latest,
        ts: res.window.latestTs,
        z: Math.round(res.anomaly.z * 100) / 100,
        isAnomaly: res.anomaly.isAnomaly,
        provenance: observations
          .filter((observation) => observation.variable === v && observation.ts <= nowTs)
          .sort((a, b) => a.ts.localeCompare(b.ts))
          .at(-1)?.provenance ?? null,
      };
    }).filter((x) => x !== null);

    const series: Record<string, { ts: string; value: number; provenance: string }[]> = {};
    for (const v of variables) {
      series[v] = observations
        .filter((o) => o.variable === v && o.ts <= nowTs)
        .slice(-72)
        .map((o) => ({ ts: o.ts, value: o.value, provenance: o.provenance }));
    }

    const insights = zoneInsights(store, id);
    return {
      zone,
      assessment,
      points,
      indicators,
      series,
      activeRun,
      explanation: insights?.explanation ?? (assessment ? toRiskExplanation(assessment) : null),
      forecast: insights?.forecast ?? null,
      oneHealth: insights?.oneHealth ?? null,
      comparison: insights?.comparison ?? null,
    };
  });

  app.get('/api/v1/zones/:id/explanation', (req, reply) => {
    const { id } = req.params as { id: string };
    const insights = zoneInsights(store, id);
    if (!insights) return reply.code(404).send({ error: `unknown or unassessed zone: ${id}` });
    return insights.explanation;
  });

  app.get('/api/v1/zones/:id/comparison', (req, reply) => {
    const { id } = req.params as { id: string };
    const insights = zoneInsights(store, id);
    if (!insights) return reply.code(404).send({ error: `unknown or unassessed zone: ${id}` });
    return insights.comparison;
  });

  app.get('/api/v1/zones/:id/forecast', (req, reply) => {
    const { id } = req.params as { id: string };
    const insights = zoneInsights(store, id);
    if (!insights) return reply.code(404).send({ error: `unknown or unassessed zone: ${id}` });
    return insights.forecast;
  });

  app.get('/api/v1/zones/:id/one-health', (req, reply) => {
    const { id } = req.params as { id: string };
    const insights = zoneInsights(store, id);
    if (!insights) return reply.code(404).send({ error: `unknown or unassessed zone: ${id}` });
    return insights.oneHealth;
  });

  app.get('/api/v1/one-health', () => watershedOneHealth(store));

  app.post('/api/v1/scenarios/:id/run', (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = runBody.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', issues: parsed.error.issues });
    try {
      const run = svc.runScenario(id, parsed.data.params);
      return {
        run,
        assessments: store.assessments.filter((a) => a.scenarioRunId === run.id),
        oneHealth: watershedOneHealth(store),
      };
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'scenario failed' });
    }
  });

  app.post('/api/v1/scenario-runs/:id/reset', (req, reply) => {
    const { id } = req.params as { id: string };
    const run = store.scenarioRuns.find((r) => r.id === id);
    if (!run) return reply.code(404).send({ error: `unknown scenario run: ${id}` });
    if (run.status !== 'ACTIVE') return reply.code(409).send({ error: `run ${id} is not active` });
    svc.reset();
    return {
      resetRunId: id,
      activeRun: null,
      assessments: store.assessments.filter((a) => a.scenarioRunId === null),
      oneHealth: watershedOneHealth(store),
    };
  });
}
