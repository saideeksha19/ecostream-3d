/**
 * Canonical watershed geometry (shared by the seed generator and the 3D scene,
 * so the data model and the visuals can never disagree about the river).
 * Local coordinates: metres, x ∈ [0, 840] plan axis, z ∈ [0, 560], y up.
 */

export const PLANE = { width: 840, depth: 560 } as const;

/** River centre-line z coordinate at plan x (metres). */
export function riverZ(x: number): number {
  return 300 + 90 * Math.sin(x / 130) + 35 * Math.sin(x / 47 + 1.7);
}

/**
 * Terrain height (metres) at plan (x, z): a carved river valley with rolling
 * banks. The channel dips slightly below 0 so the river ribbon can sit at y≈0.6.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.abs(z - riverZ(x));
  const bank = Math.pow(Math.min(1, d / 230), 1.35) * 24;
  const rolling = 6 * Math.sin(x / 190 + 1.3) * Math.sin(z / 150 + 0.4) * Math.min(1, d / 120);
  const channel = -2.5 * Math.exp(-Math.pow(d / 55, 2));
  return bank + rolling + channel + 2.2;
}
