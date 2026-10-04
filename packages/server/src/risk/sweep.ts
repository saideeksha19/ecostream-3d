import type { MonitoringPoint, Observation, RiskAssessment, ScenarioRun, Zone } from '@ecostream/shared';
import { topologicalZones } from './propagation';
import { computeZoneRisk } from './engine';

/** Full risk sweep across the watershed, upstream → downstream. */
export function computeWatershedRisk(
  zones: Zone[],
  points: MonitoringPoint[],
  observationsFor: (zoneId: string) => Observation[],
  activeRun: ScenarioRun | null,
  nowTs: string,
): RiskAssessment[] {
  const sorted = topologicalZones(zones);
  const byId = new Map<string, RiskAssessment>();
  const out: RiskAssessment[] = [];
  for (const zone of sorted) {
    const upstream: { assessment: RiskAssessment; distanceM: number }[] = [];
    if (zone.upstreamZoneId) {
      const upAssessment = byId.get(zone.upstreamZoneId);
      const upZone = zones.find((z) => z.id === zone.upstreamZoneId);
      if (upAssessment && upZone) {
        upstream.push({
          assessment: upAssessment,
          distanceM: Math.max(0, zone.riverDistanceM - upZone.riverDistanceM),
        });
      }
    }
    const { assessment } = computeZoneRisk({
      zone,
      observations: observationsFor(zone.id),
      points: points.filter((p) => p.zoneId === zone.id),
      upstream,
      activeRun,
      nowTs,
    });
    byId.set(zone.id, assessment);
    out.push(assessment);
  }
  return out;
}
