import type { RiskAssessment, Zone } from '@ecostream/shared';

/**
 * Spatial propagation along the river DAG (pure).
 * Downstream zones inherit a fraction of upstream risk, decaying with river
 * distance: inflow = maxUpstreamScore × exp(−distance / 1400 m).
 */

export const PROPAGATION_DECAY_M = 1400;

export function spatialInflowScore(
  upstream: { assessment: RiskAssessment; distanceM: number }[],
): { score: number; summary: string } {
  if (upstream.length === 0) return { score: 0, summary: 'headwater — no upstream inflow' };
  let best = { score: 0, zoneCode: '', distanceM: 0 };
  for (const u of upstream) {
    const inflow = u.assessment.score * Math.exp(-u.distanceM / PROPAGATION_DECAY_M);
    if (inflow > best.score) {
      best = { score: inflow, zoneCode: u.assessment.zoneId, distanceM: u.distanceM };
    }
  }
  return {
    score: best.score,
    summary:
      best.score < 1
        ? 'negligible upstream inflow'
        : `inflow from ${best.zoneCode} (${Math.round(best.distanceM)} m downstream decay) → ${Math.round(best.score)} pts`,
  };
}

/** Topologically sort zones along upstreamZoneId; throws on cycles. */
export function topologicalZones(zones: Zone[]): Zone[] {
  const byId = new Map(zones.map((z) => [z.id, z]));
  const state = new Map<string, 'visiting' | 'done'>();
  const out: Zone[] = [];
  const visit = (z: Zone): void => {
    const s = state.get(z.id);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`river DAG cycle at ${z.id}`);
    state.set(z.id, 'visiting');
    if (z.upstreamZoneId) {
      const up = byId.get(z.upstreamZoneId);
      if (!up) throw new Error(`unknown upstream zone ${z.upstreamZoneId}`);
      visit(up);
    }
    state.set(z.id, 'done');
    out.push(z);
  };
  for (const z of zones) visit(z);
  return out;
}
