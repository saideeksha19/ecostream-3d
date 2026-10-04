import { EcoStore } from '../db/store';
import { generateDataset } from './generate';

const { zones, points, riverPath, observations } = generateDataset();

const store = new EcoStore();
store.meta = {
  datasetLabel: 'SYNTHETIC DEMO DATASET',
  provenanceNotice:
    'All observations in this build are synthetically generated for demonstration. They are not real measurements and must not be presented as such.',
  generatedAt: new Date().toISOString(),
};
store.zones = zones;
store.points = points;
store.riverPath = riverPath;
store.observations = observations;
store.save();

console.log(
  [
    `dataset: ${store.meta.datasetLabel}`,
    `zones: ${zones.length}  points: ${points.length} (${points.filter((p) => p.kind === 'SENSOR').length} sensors, ${points.filter((p) => p.kind === 'CITIZEN_REPORT').length} citizen)`,
    `baseline observations: ${observations.length} (72h, provenance-tagged)`,
    `written to data/ecostream.json`,
  ].join('\n'),
);
