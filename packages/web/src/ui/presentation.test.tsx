import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Forecast, RiskAssessment, ScenarioRun } from '@ecostream/shared';
import type { ZoneDetailDTO } from '../services/api';
import { currentZoneDetail } from './presentation';
import { Provenance } from './Primitives';
import { ForecastView } from './ForecastView';
import { ZoneView } from './ZoneView';

// Test fixtures only: production views receive all values from the existing API/store.
const run: ScenarioRun = { id: 'run-test', scenarioId: 'HEAVY_URBAN_RUNOFF', params: { intensity: 0.7 }, status: 'ACTIVE', startedAt: '2026-04-04T00:00:00Z', endedAt: null, targetZoneIds: ['z04'] };
const assessment: RiskAssessment = { zoneId: 'z04', scenarioRunId: null, score: 67.3, state: 'INVESTIGATE', confidence: 0.82, components: [{ id: 'runoff', score: 39.2, weight: 0.2, summary: 'Test runoff contribution' }], evidence: [], computedAt: '2026-04-04T00:00:00Z' };
const detail: ZoneDetailDTO = {
  zone: { id: 'z04', code: 'ZONE 04', name: 'Test Industrial', kind: 'industrial', imperviousness: 0.8, population: 100, polygon: [], riverDistanceM: 100, upstreamZoneId: 'z03' },
  assessment, points: [], indicators: [], series: {}, activeRun: null, explanation: null, forecast: null, oneHealth: null, comparison: null,
};

describe('current assessment presentation', () => {
  it('shows detail only for the selected zone and current scenario context', () => {
    expect(currentZoneDetail(detail, 'z04', null)).toBe(detail);
    expect(currentZoneDetail(detail, 'z03', null)).toBeNull();
    expect(currentZoneDetail(null, 'z04', null)).toBeNull();
    expect(currentZoneDetail(detail, null, null)).toBeNull();
    expect(currentZoneDetail(detail, 'z04', run)).toBeNull();
    const simulatedDetail = { ...detail, activeRun: run };
    expect(currentZoneDetail(simulatedDetail, 'z04', run)).toBe(simulatedDetail);
    expect(currentZoneDetail(simulatedDetail, 'z04', null)).toBeNull();
    expect(currentZoneDetail(simulatedDetail, 'z04', { ...run, id: 'next-run' })).toBeNull();
  });

  it('renders the supplied risk, state, confidence and component instead of recomputing them', () => {
    const html = renderToStaticMarkup(<ZoneView assessment={assessment} detail={detail} />);
    expect(html).toContain('67.3');
    expect(html).toContain('INVESTIGATE');
    expect(html).toContain('82');
    expect(html).toContain('39.2');
    expect(html).toContain('Runoff exposure');
    expect(html).toContain('Baseline observations and citizen reports are synthetic');
    expect(html).not.toContain('Live indicators');
  });

  it('distinguishes all provenance sources without turning a citizen report into verification', () => {
    const observed = renderToStaticMarkup(<Provenance value="OBSERVED" />);
    const simulated = renderToStaticMarkup(<Provenance value="SIMULATED" />);
    const citizen = renderToStaticMarkup(<Provenance value="CITIZEN" />);
    expect(observed).toContain('prov-observed');
    expect(observed).toContain('not live measurements');
    expect(simulated).toContain('prov-simulated');
    expect(simulated).toContain('not a measurement');
    expect(citizen).toContain('CITIZEN REPORT');
    expect(citizen).not.toContain('prov-human-verified');
    expect(renderToStaticMarkup(<Provenance value="HUMAN_VERIFIED" />)).toContain('HUMAN VERIFIED');
    expect(renderToStaticMarkup(<Provenance value="DERIVED" />)).toContain('prov-derived');
  });
});

describe('demonstration forecast presentation', () => {
  it('keeps backend horizons and values and exposes uncertainty and model limitations', () => {
    const forecast: Forecast = { zoneId: 'z04', scenarioRunId: null, dataCompleteness: 0.91, thresholdCrossing: null, disclaimer: 'Test model disclaimer', generatedAt: '2026-04-04T00:00:00Z', points: ['CURRENT', 'H24', 'H72', 'D7'].map((horizon, index) => ({ horizon: horizon as Forecast['points'][number]['horizon'], projectedScore: 51.2 + index, projectedState: 'WATCH', confidence: 0.8, uncertaintyLow: 40 + index, uncertaintyHigh: 65 + index, method: 'Test persistence method' })) };
    const html = renderToStaticMarkup(<ForecastView forecast={forecast} />);
    for (const label of ['NOW', '+24H', '+72H', '+7D', 'DEMONSTRATION FORECAST', 'NON-CALIBRATED MODEL', '51.2', '54.2', 'Test model disclaimer', 'Test persistence method', '91', '40.0', '68.0']) expect(html).toContain(label);
  });
  it('does not invent a forecast when the API has no result', () => {
    expect(renderToStaticMarkup(<ForecastView forecast={null} />)).toContain('No forecast is available');
  });
});
