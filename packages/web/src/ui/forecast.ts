import type { ForecastHorizon } from '@ecostream/shared';

/** Shared presentation mapping for the compact custom SVG forecast view. */
export function forecastHorizonLabel(horizon: ForecastHorizon): string {
  return ({ CURRENT: 'NOW', H24: '24H', H72: '72H', D7: '7D' })[horizon];
}

export function formatForecastDelta(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
}
