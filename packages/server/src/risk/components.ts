import type { WaterVariable, Zone } from '@ecostream/shared';
import type { ZoneAnalysis } from '../analysis';

/**
 * Risk component functions. Each returns a 0..100 score plus a human-readable
 * summary; the engine attaches ids, weights and evidence items.
 */

export interface ComponentScore {
  score: number;
  summary: string;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Anomaly: max normalized robust |z| across variables; 100 at |z| = 7.5. */
export function anomalyComponent(analysis: ZoneAnalysis): ComponentScore {
  let worstVar: WaterVariable | null = null;
  let worstZ = 0;
  for (const [variable, res] of analysis.perVariable) {
    const az = Math.abs(res.anomaly.z);
    if (az > worstZ) {
      worstZ = az;
      worstVar = variable;
    }
  }
  const score = clamp100((worstZ / 7.5) * 100);
  const label = worstVar ? `${worstVar} |z| = ${worstZ.toFixed(1)}` : 'no signal';
  return { score, summary: `Max robust z-score (${label})` };
}

/**
 * Runoff exposure: imperviousness × antecedent water-level pressure.
 * Proxy for rainfall-driven runoff until a rainfall input exists (P1):
 *   runoff = imperviousness^0.75 × (0.35 + 0.65 × levelTrend/100) × 100
 */
export function runoffComponent(zone: Zone, analysis: ZoneAnalysis): ComponentScore {
  const level = analysis.perVariable.get('water_level');
  const levelTrend = level ? level.trend.score : 0;
  const imp = Math.pow(zone.imperviousness, 0.75);
  const score = clamp100(imp * (0.35 + 0.65 * (levelTrend / 100)) * 100);
  return {
    score,
    summary: `Imperviousness ${(zone.imperviousness * 100).toFixed(0)}%, water-level pressure ${Math.round(levelTrend)}/100`,
  };
}

/** Trend: max Theil–Sen deterioration pressure across variables. */
export function trendComponent(analysis: ZoneAnalysis): ComponentScore {
  let worstVar: WaterVariable | null = null;
  let worstScore = 0;
  let worstSlope = 0;
  for (const [variable, res] of analysis.perVariable) {
    if (res.trend.score > worstScore) {
      worstScore = res.trend.score;
      worstVar = variable;
      worstSlope = res.trend.slope;
    }
  }
  const label = worstVar ? `${worstVar} slope ${worstSlope.toFixed(3)}/h` : 'stable';
  return { score: clamp100(worstScore), summary: `Strongest deterioration trend: ${label}` };
}

/**
 * Ecosystem stress: DO deficit (40%), temperature excess (30%),
 * turbidity elevation (30%) — each relative to the window median.
 * Absent variables redistribute weight.
 */
export function ecosystemComponent(analysis: ZoneAnalysis): ComponentScore {
  const parts: { w: number; score: number; label: string }[] = [];

  const doRes = analysis.perVariable.get('dissolved_oxygen');
  if (doRes && doRes.window.latest !== null) {
    const med = medianOfWin(doRes);
    const deficit = Math.max(0, med - (doRes.window.latest ?? med));
    parts.push({ w: 0.4, score: clamp100((deficit / 3) * 100), label: `DO deficit ${deficit.toFixed(2)} mg/L` });
  }
  const temp = analysis.perVariable.get('temperature');
  if (temp && temp.window.latest !== null) {
    const med = medianOfWin(temp);
    const excess = Math.max(0, (temp.window.latest ?? med) - med);
    parts.push({ w: 0.3, score: clamp100((excess / 6) * 100), label: `temperature +${excess.toFixed(2)}°C vs median` });
  }
  const turb = analysis.perVariable.get('turbidity');
  if (turb && turb.window.latest !== null) {
    const med = medianOfWin(turb);
    const elev = Math.max(0, (turb.window.latest ?? med) - med);
    parts.push({ w: 0.3, score: clamp100((elev / 25) * 100), label: `turbidity +${elev.toFixed(1)} NTU vs median` });
  }

  if (parts.length === 0) return { score: 0, summary: 'no ecosystem variables available' };
  const wSum = parts.reduce((s, p) => s + p.w, 0);
  const score = parts.reduce((s, p) => s + p.w * p.score, 0) / wSum;
  return { score: clamp100(score), summary: parts.map((p) => p.label).join('; ') };
}

function medianOfWin(res: { window: { values: number[] } }): number {
  const vals = [...res.window.values].sort((a, b) => a - b);
  const n = vals.length;
  if (n === 0) return NaN;
  const mid = n >> 1;
  return n % 2 ? (vals[mid] as number) : ((vals[mid - 1] as number) + (vals[mid] as number)) / 2;
}
