import type { ForecastHorizon } from '@ecostream/shared';
import { describe, expect, it } from 'vitest';
import { forecastHorizonLabel } from './forecast';

describe('compact forecast presentation', () => {
  it('keeps the timeline labels aligned with the API horizons', () => {
    const horizons: ForecastHorizon[] = ['CURRENT', 'H24', 'H72', 'D7'];
    expect(horizons.map((horizon) => forecastHorizonLabel(horizon))).toEqual([
      'NOW',
      '24H',
      '72H',
      '7D',
    ]);
  });
});
