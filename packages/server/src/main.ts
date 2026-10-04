import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { EcoStore, resolveDataFilePath } from './db/store';
import { EcoApp } from './app/app';
import { registerRoutes } from './app/routes';
import { generateDataset } from './seed/generate';

const PORT = Number(process.env.ECOSTREAM_PORT ?? 8010);
const DATA_FILE = resolveDataFilePath();

const store = EcoStore.load(DATA_FILE);
if (!existsSync(DATA_FILE) || store.zones.length === 0) {
  console.log('[ecostream] no dataset found — generating deterministic synthetic demo dataset…');
  const { zones, points, riverPath, observations } = generateDataset();
  store.meta = {
    datasetLabel: 'SYNTHETIC DEMO DATASET',
    provenanceNotice:
      'All observations in this build are synthetically generated for demonstration. They are not real measurements.',
    generatedAt: new Date().toISOString(),
  };
  store.zones = zones;
  store.points = points;
  store.riverPath = riverPath;
  store.observations = observations;
  store.reindex();
  store.save();
}

const svc = new EcoApp(store);
// Demo semantics: every boot starts from the observed baseline. A leftover
// active scenario run from a previous session is reset, never silently shown
// as if it were current reality.
if (store.activeRun()) {
  console.log(`[ecostream] resetting leftover run ${store.activeRun()?.id} — boot starts at baseline`);
  svc.reset();
}
svc.recompute();

const app = Fastify({ logger: false });
registerRoutes(app, svc);

app.listen({ port: PORT, host: '127.0.0.1' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[ecostream] API on http://localhost:${PORT} — dataset: ${store.meta.datasetLabel}`);
});
