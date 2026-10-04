import { describe, expect, it } from 'vitest';
import type { RiskAssessment, Zone } from '@ecostream/shared';
import { PROPAGATION_DECAY_M, spatialInflowScore, topologicalZones } from '../src/risk/propagation';
import { ctx } from './helpers';

/** Downstream propagation along the river DAG (pure functions). */

function up(zoneId: string, score: number, distanceM: number): { assessment: RiskAssessment; distanceM: number } {
  return { assessment: { zoneId, score } as RiskAssessment, distanceM };
}

describe('spatial inflow', () => {
  it('is zero without upstream zones', () => {
    const r = spatialInflowScore([]);
    expect(r.score).toBe(0);
    expect(r.summary).toContain('headwater');
  });

  it('decays upstream risk with river distance', () => {
    const near = spatialInflowScore([up('z01', 80, PROPAGATION_DECAY_M)]).score;
    expect(near).toBeCloseTo(80 * Math.E ** -1, 5);
    const far = spatialInflowScore([up('z01', 80, PROPAGATION_DECAY_M * 5)]).score;
    expect(far).toBeLessThan(near);
    expect(far).toBeLessThan(1);
  });

  it('takes the strongest inflow, not the sum', () => {
    const one = spatialInflowScore([up('z01', 90, 100)]).score;
    const two = spatialInflowScore([up('z01', 90, 100), up('z02', 20, 500)]).score;
    expect(two).toBeCloseTo(one, 10);
  });
});

describe('topologicalZones', () => {
  it('orders the 12 seeded zones upstream → downstream', () => {
    const { zones } = ctx();
    const sorted = topologicalZones(zones);
    expect(sorted.map((z) => z.id)).toEqual(['z01', 'z02', 'z03', 'z04', 'z05', 'z06', 'z07', 'z08', 'z09', 'z10', 'z11', 'z12']);
  });

  it('handles shuffled input and rejects cycles', () => {
    const { zones } = ctx();
    const shuffled = [...zones].reverse();
    expect(topologicalZones(shuffled).map((z) => z.id)).toEqual(['z01', 'z02', 'z03', 'z04', 'z05', 'z06', 'z07', 'z08', 'z09', 'z10', 'z11', 'z12']);

    // z01 → z03 → z02 → z01: visiting z01 again while still 'visiting' throws.
    const cyclic: Zone[] = ctx().zones.slice(0, 3).map((z): Zone => ({ ...z, upstreamZoneId: null }));
    cyclic[0]!.upstreamZoneId = 'z03';
    cyclic[2]!.upstreamZoneId = 'z02';
    cyclic[1]!.upstreamZoneId = 'z01';
    expect(() => topologicalZones(cyclic)).toThrow(/cycle/);
  });
});
