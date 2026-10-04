import type { Forecast, ForecastPoint } from '@ecostream/shared';
import { forecastHorizonLabel } from './forecast';
import { Provenance, RiskStateLabel } from './Primitives';

const horizonLabel = (point: ForecastPoint) => `${point.horizon === 'CURRENT' ? '' : '+'}${forecastHorizonLabel(point.horizon)}`;

export function ForecastView({ forecast }: { forecast: Forecast | null }) {
  if (!forecast) return <div className="empty-hint">No forecast is available for this zone.</div>;
  return <>
    <div className="model-disclaimer"><strong>DEMONSTRATION FORECAST</strong><span>NON-CALIBRATED MODEL</span><p>Illustrative risk trajectories, not operational predictions.</p></div>
    <h3 className="section-title">Risk trajectory <Provenance value="DERIVED" /></h3>
    <div className="forecast-chart-wrap"><ForecastChart points={forecast.points} /></div>
    <div className="chart-key"><span><i />Projected risk</span><span><i />Model uncertainty</span></div>
    <div className="forecast-table-head"><span>HORIZON</span><span>SCORE</span><span>STATE</span><span>CONF.</span></div>
    <div className="forecast-list">{forecast.points.map((point) => <div className="forecast-row" key={point.horizon}><span className="forecast-time">{horizonLabel(point)}</span><strong className="forecast-score">{point.projectedScore.toFixed(1)}</strong><RiskStateLabel state={point.projectedState} /><span className="forecast-confidence">{(point.confidence * 100).toFixed(0)}%</span><span className="forecast-range">Range {point.uncertaintyLow.toFixed(1)}–{point.uncertaintyHigh.toFixed(1)} / 100</span></div>)}</div>
    {forecast.thresholdCrossing && <div className="signal-banner"><strong>MODEL THRESHOLD SIGNAL</strong><p>{forecast.thresholdCrossing.message}</p></div>}
    <div className="method-note"><h4 className="mini-title">Method &amp; limitations</h4><p>{forecast.disclaimer}</p><p>{forecast.points[0]?.method}</p><div className="metadata-row"><span>Data completeness</span><b>{(forecast.dataCompleteness * 100).toFixed(0)}%</b></div><div className="metadata-row"><span>Generated</span><time dateTime={forecast.generatedAt}>{new Date(forecast.generatedAt).toISOString().replace('T', ' ').slice(0, 16)} UTC</time></div></div>
  </>;
}

function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const x = (index: number) => 30 + (index / Math.max(1, points.length - 1)) * 234;
  const y = (value: number) => 138 - value * 1.15;
  const line = points.map((point, index) => `${x(index)},${y(point.projectedScore)}`).join(' ');
  const band = [...points.map((point, index) => `${x(index)},${y(point.uncertaintyHigh)}`), ...points.slice().reverse().map((point, reverseIndex) => `${x(points.length - reverseIndex - 1)},${y(point.uncertaintyLow)}`)].join(' ');
  return <svg className="forecast-chart" viewBox="0 0 284 170" role="img" aria-label="Demonstration projected risk score from zero to 100 with uncertainty band">
    {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1="30" x2="264" y1={y(value)} y2={y(value)} className="chart-grid" /><text x="20" y={y(value) + 3} textAnchor="end" className="chart-label">{value}</text></g>)}
    <polygon points={band} className="chart-band" /><polyline points={line} className="chart-line" />
    {points.map((point, index) => <g key={point.horizon}><circle cx={x(index)} cy={y(point.projectedScore)} r="3" className="chart-dot" /><text x={x(index)} y="159" textAnchor="middle" className="chart-label">{horizonLabel(point)}</text></g>)}
  </svg>;
}
