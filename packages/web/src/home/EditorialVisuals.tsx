import type { Forecast, MonitoringPoint, OneHealthWatershedSummary, RiskAssessment, RiskComparison, Vec2, Zone } from '@ecostream/shared';
import { RiskStateLabel } from '../ui/Primitives';

const LAND = '#55604b';
const MOSS = '#7c866c';
const SAGE = '#a5ab91';
const STONE = '#e9e5da';
const INK = '#242620';
const OCHRE = '#aa8150';

function mapPoint(point: Vec2): [number, number] {
  return [(point.x / 840) * 760, 28 + (point.z / 560) * 404];
}

function pathFor(points: Vec2[]): string {
  return points.map((point, index) => {
    const [x, y] = mapPoint(point);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

/** A lightweight editorial aerial composition, intentionally separate from the WebGL twin. */
export function HeroLandscape({ analytical = false }: { analytical?: boolean }) {
  return <svg className={`hero-landscape-svg ${analytical ? 'hero-landscape-analytical' : ''}`} viewBox="0 0 1200 800" role="img" aria-label={analytical ? 'Analytical watershed layer with zones and monitoring stations' : 'Aerial environmental composition of a river, terrain and urban districts'} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id={analytical ? 'hero-sky-detail' : 'hero-sky'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={analytical ? '#6a705e' : '#c7c5ae'} /><stop offset="1" stopColor={analytical ? '#313c32' : '#78806a'} /></linearGradient>
      <linearGradient id={analytical ? 'hero-ground-detail' : 'hero-ground'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={analytical ? '#3f5143' : '#727e62'} /><stop offset="1" stopColor={analytical ? '#202c25' : '#343e32'} /></linearGradient>
      <filter id={analytical ? 'hero-soft-detail' : 'hero-soft'}><feGaussianBlur stdDeviation={analytical ? '0' : '18'} /></filter>
      <pattern id={analytical ? 'hero-grid-detail' : 'hero-grid'} width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke={analytical ? '#d9d8c9' : '#e7e2d2'} strokeOpacity=".15" strokeWidth="1" /></pattern>
    </defs>
    <rect width="1200" height="800" fill={`url(#${analytical ? 'hero-sky-detail' : 'hero-sky'})`} />
    <path d="M0 270C174 180 293 236 437 181S719 128 858 202s205 40 342-72V800H0Z" fill={`url(#${analytical ? 'hero-ground-detail' : 'hero-ground'})`} />
    <path d="M0 470C152 354 265 440 401 350s215-34 315 52 260 118 484-10v408H0Z" fill={analytical ? '#26372e' : '#4f5e48'} opacity=".75" />
    <g fill="none" stroke={analytical ? '#d6d7c2' : '#d8d8bd'} strokeOpacity={analytical ? '.34' : '.22'} strokeWidth="2">
      <path d="M-10 175C186 85 301 192 450 126s246-37 355 13 261 61 412-38" />
      <path d="M-10 206C180 124 297 216 456 154s237-37 349 14 263 58 405-26" />
      <path d="M-10 240C186 163 310 251 458 185s231-24 340 25 259 51 410-10" />
      <path d="M-5 585C172 489 268 558 403 489s229-20 320 48 270 112 488-9" />
      <path d="M-8 620C180 523 274 596 414 523s215-13 313 49 254 100 473-5" />
      <path d="M-8 657C169 566 292 633 419 561s221-8 323 49 252 92 465 0" />
    </g>
    <g fill={analytical ? '#19251f' : '#2f3b2d'} opacity={analytical ? '.8' : '.6'}>
      {([[78,302,112,66],[214,284,96,52],[348,278,136,76],[770,276,132,62],[936,314,155,72],[1081,268,83,50],[146,665,150,62],[397,665,93,45],[861,627,186,74]] as [number, number, number, number][]).map(([x,y,w,h], index) => <rect key={index} x={x} y={y} width={w} height={h} rx="4" transform={`rotate(${index % 2 ? -7 : 5} ${x + w / 2} ${y + h / 2})`} />)}
    </g>
    <g fill={analytical ? '#899778' : '#7f8d6b'} opacity=".9">
      {Array.from({ length: 32 }, (_, index) => { const x = 38 + ((index * 137) % 1120); const y = 240 + ((index * 83) % 480); return <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 15 : 9} />; })}
    </g>
    <path d="M-30 104C126 184 136 279 246 318c120 42 143-40 217 14 73 54 80 185 189 202 127 19 172-96 254-69 109 36 112 174 335 208" fill="none" stroke={analytical ? '#c8d1b7' : '#e5e0c9'} strokeOpacity={analytical ? '.85' : '.72'} strokeWidth={analytical ? '20' : '32'} />
    <path d="M-30 104C126 184 136 279 246 318c120 42 143-40 217 14 73 54 80 185 189 202 127 19 172-96 254-69 109 36 112 174 335 208" fill="none" stroke={analytical ? '#465c4e' : '#7d9275'} strokeWidth={analytical ? '8' : '13'} />
    <path d="M0 0H1200V800H0Z" fill={`url(#${analytical ? 'hero-grid-detail' : 'hero-grid'})`} opacity={analytical ? '.42' : '.24'} />
    {analytical && <g fill="none" stroke="#e0ddc9" strokeWidth="2" strokeDasharray="8 10" opacity=".8"><path d="M128 78V710" /><path d="M452 30V690" /><path d="M796 90V760" /><path d="M1080 0V640" /><path d="M40 376H1140" /></g>}
    {analytical && <g fill="#e9e5da" stroke="#314033" strokeWidth="4">{[[214,274],[397,349],[605,497],[823,432],[1020,571],[307,620]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r="8" />)}</g>}
  </svg>;
}

export function ObservationNetwork({ river, zones, points }: { river: Vec2[]; zones: Zone[]; points: MonitoringPoint[] }) {
  return <div className="observation-network">
    <svg viewBox="0 0 760 460" role="img" aria-label="Monitoring points distributed along the watershed river and zones">
      <defs><pattern id="observe-grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="#68675f" strokeOpacity=".18" /></pattern></defs>
      <rect width="760" height="460" fill="url(#observe-grid)" />
      {zones.map((zone) => <polygon key={zone.id} points={zone.polygon.map((point) => mapPoint(point).join(',')).join(' ')} fill="none" stroke={zone.kind === 'park' || zone.kind === 'riparian' ? MOSS : '#a9a79d'} strokeOpacity=".55" strokeWidth="1" />)}
      <path d={pathFor(river)} fill="none" stroke="#b9ad8f" strokeOpacity=".22" strokeWidth="26" />
      <path d={pathFor(river)} fill="none" stroke="#68745f" strokeWidth="7" />
      {points.map((point, index) => { const [x, y] = mapPoint(point.position); return <g key={point.id} transform={`translate(${x} ${y})`}><circle r="12" fill="#f4f1ea" fillOpacity=".72" /><circle r="5" fill={point.kind === 'SENSOR' ? LAND : OCHRE} /><path d="M0 14V30" stroke="#68675f" strokeWidth="1" /><text x="13" y="4" fill="#68675f" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="1">{point.id.toUpperCase()}</text>{index < 4 && <text x="13" y="17" fill="#a9a79d" fontSize="8" fontFamily="Inter, sans-serif">{point.kind === 'SENSOR' ? 'SENSOR' : 'CITIZEN'}</text>}</g>; })}
      <text x="24" y="30" fill="#68675f" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">OBSERVATION NETWORK / LIVE MODEL INPUTS</text>
    </svg>
    <div className="network-legend"><span><i className="network-dot network-dot-sensor" /> SENSOR</span><span><i className="network-dot network-dot-citizen" /> CITIZEN REPORT</span><span>RIVER / CONNECTED ZONES</span></div>
  </div>;
}

export function RiskComposition({ assessment }: { assessment?: RiskAssessment | undefined }) {
  const score = assessment?.score;
  return <div className="risk-composition" aria-label="Current watershed risk analysis">
    <div className="risk-composition-top"><div><span className="visual-label">CURRENT RISK / {assessment ? 'API ASSESSMENT' : 'WAITING FOR API'}</span><strong>{score === undefined ? '—' : score.toFixed(1)}</strong><span className="risk-scale">OUT OF 100 <span>DERIVED</span></span></div>{assessment && <RiskStateLabel state={assessment.state} />}</div>
    <div className="risk-rule"><span style={{ width: `${score === undefined ? 0 : Math.max(0, Math.min(100, score))}%` }} /></div>
    <div className="analysis-signals">{assessment?.components.slice(0, 4).map((component) => <div key={component.id}><span>{component.id.replaceAll('_', ' ').toUpperCase()}</span><b>{component.score.toFixed(1)}</b><i style={{ width: `${Math.max(0, Math.min(100, component.score))}%` }} /></div>) ?? <div className="analysis-empty">Select a zone in the Digital Twin to inspect current analytical components.</div>}</div>
    <p className="visual-note">Risk is an interpretable synthesis of anomaly, trend, runoff, ecosystem and spatial signals — not a measurement by itself.</p>
  </div>;
}

export function PropagationNetwork({ zones, river, selectedId }: { zones: Zone[]; river: Vec2[]; selectedId?: string | undefined }) {
  const selected = zones.find((zone) => zone.id === selectedId) ?? zones[Math.floor(zones.length / 2)];
  const order = selected ? [zones.find((zone) => zone.id === selected.upstreamZoneId), selected, zones.find((zone) => zone.upstreamZoneId === selected.id)].filter(Boolean) as Zone[] : [];
  return <div className="propagation-network">
    <svg viewBox="0 0 760 380" role="img" aria-label="River network showing upstream to downstream spatial propagation">
      <path d={pathFor(river)} fill="none" stroke="#d8d3c7" strokeWidth="32" opacity=".75" />
      <path d={pathFor(river)} fill="none" stroke="#68745f" strokeWidth="8" />
      {zones.map((zone, index) => { const center = zone.polygon.reduce((acc, point) => ({ x: acc.x + point.x / zone.polygon.length, z: acc.z + point.z / zone.polygon.length }), { x: 0, z: 0 }); const [x, y] = mapPoint(center); const active = zone.id === selected?.id; return <g key={zone.id}><circle cx={x} cy={y} r={active ? 17 : 8} fill={active ? '#aa8150' : '#a9a79d'} fillOpacity={active ? '.95' : '.55'} /><text x={x + 14} y={y + 4} fill={active ? '#242620' : '#68675f'} fontSize={active ? '12' : '9'} fontFamily="ui-monospace, monospace">{zone.id.toUpperCase()}</text>{index < zones.length - 1 && <path d={`M${x + 24} ${y + 32}l6 6-6 6`} fill="none" stroke="#aa8150" strokeWidth="1.5" opacity=".75" />}</g>; })}
      <text x="30" y="44" fill="#68675f" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">UPSTREAM</text><text x="650" y="344" fill="#68675f" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">DOWNSTREAM</text>
    </svg>
    <div className="propagation-chain">{order.length ? order.map((zone, index) => <div className={zone.id === selected?.id ? 'propagation-selected' : ''} key={zone.id}><span>{index === 0 ? 'UPSTREAM' : index === order.length - 1 ? 'DOWNSTREAM' : 'ZONE'}</span><strong>{zone.id.toUpperCase()}</strong><small>{zone.name}</small></div>) : <p className="visual-note">Watershed relationships appear once the API model is ready.</p>}</div>
    <p className="visual-note">Existing watershed relationships show how context can move through connected zones. Not a calibrated hydrological prediction.</p>
  </div>;
}

export function ScenarioComposition({ assessment, comparison, activeRun }: { assessment?: RiskAssessment | undefined; comparison?: RiskComparison | null | undefined; activeRun: boolean }) {
  const baseline = comparison?.baseline;
  const scenario = comparison?.scenario;
  const scenarioScore = scenario?.score ?? (activeRun && assessment?.scenarioRunId ? assessment.score : undefined);
  return <div className="scenario-composition" aria-label="Baseline and heavy urban runoff comparison">
    <div className="scenario-column"><span className="visual-label">BASELINE</span><strong>{baseline?.score.toFixed(1) ?? (assessment && !assessment.scenarioRunId ? assessment.score.toFixed(1) : '—')}</strong><span>{baseline?.state ?? (!assessment?.scenarioRunId ? assessment?.state ?? 'OBSERVED' : 'LOAD FROM API')}</span><i className="scenario-bar scenario-bar-base" style={{ width: `${baseline?.score ?? (!assessment?.scenarioRunId ? assessment?.score : 0)}%` }} /></div>
    <div className="scenario-arrow" aria-hidden="true">→</div>
    <div className="scenario-column scenario-column-after"><span className="visual-label">HEAVY URBAN RUNOFF</span><strong>{scenarioScore === undefined ? '—' : scenarioScore.toFixed(1)}</strong><span>{scenario?.state ?? (activeRun ? 'SIMULATED' : 'RUN IN DIGITAL TWIN')}</span><i className="scenario-bar scenario-bar-scenario" style={{ width: `${scenarioScore ?? 0}%` }} /></div>
    <div className="scenario-footer"><span>{comparison?.scoreDelta !== undefined ? `RISK DELTA ${comparison.scoreDelta > 0 ? '+' : ''}${comparison.scoreDelta.toFixed(1)} PTS` : activeRun ? 'SCENARIO OUTPUT / SYNTHETIC' : 'NO SCENARIO RUN ACTIVE'}</span><span>BASELINE → SCENARIO → CHANGED OBSERVATIONS</span></div>
  </div>;
}

export function ForecastTrajectory({ forecast }: { forecast?: Forecast | null | undefined }) {
  const points = forecast?.points ?? [];
  const path = points.length > 1 ? points.map((point, index) => `${index ? 'L' : 'M'} ${42 + index * (650 / (points.length - 1))} ${208 - point.projectedScore * 1.45}`).join(' ') : 'M42 160 C185 137 286 166 364 132 S545 143 692 94';
  return <div className="forecast-composition" aria-label="Forecast trajectory and uncertainty">
    <svg viewBox="0 0 740 250" role="img" aria-label={forecast ? 'API-derived forecast trajectory' : 'Demonstration forecast trajectory placeholder'}>
      <line x1="42" y1="208" x2="692" y2="208" stroke="#d8d3c7" /><line x1="42" y1="85" x2="692" y2="85" stroke="#aa8150" strokeDasharray="4 7" opacity=".65" /><path d="M42 174C196 143 333 205 692 68" fill="none" stroke="#a9a79d" strokeDasharray="7 8" opacity=".55" />
      <path d={path} fill="none" stroke="#314033" strokeWidth="3" />
      {points.map((point, index) => <circle key={point.horizon} cx={42 + index * (650 / Math.max(1, points.length - 1))} cy={208 - point.projectedScore * 1.45} r="5" fill="#f4f1ea" stroke="#314033" strokeWidth="2" />)}
      {(['CURRENT', 'H24', 'H72', 'D7'] as const).map((label, index) => <text key={label} x={42 + index * (650 / 3)} y="238" textAnchor="middle" fill="#68675f" fontSize="9" fontFamily="ui-monospace, monospace">{label === 'CURRENT' ? 'NOW' : label.replace('H', '+') + (label === 'D7' ? '' : 'H')}</text>)}
      <text x="692" y="78" textAnchor="end" fill="#aa8150" fontSize="8" fontFamily="ui-monospace, monospace">THRESHOLD SIGNAL</text>
    </svg>
    <div className="forecast-readout">{points.length ? points.map((point) => <div key={point.horizon}><span>{point.horizon === 'CURRENT' ? 'NOW' : point.horizon.replace('H', '+').replace('D7', '+7D')}</span><strong>{point.projectedScore.toFixed(1)}</strong><small>{Math.round(point.confidence * 100)}% CONFIDENCE</small></div>) : <p className="visual-note">A zone forecast is available after selecting a zone in the Digital Twin.</p>}</div>
    <p className="forecast-disclaimer">DEMONSTRATION FORECAST / NON-CALIBRATED MODEL{forecast?.disclaimer ? ` · ${forecast.disclaimer}` : ''}</p>
  </div>;
}

export function OneHealthFlow({ summary }: { summary: OneHealthWatershedSummary | null }) {
  const values = summary ? [summary.environmentalStress, summary.ecosystemStress, summary.humanExposure, summary.activeAlerts] : [];
  const labels = ['ENVIRONMENT', 'ECOSYSTEM', 'HUMAN EXPOSURE', 'COMMUNITY'];
  return <div className="one-health-flow" aria-label="One Health relationship from environment to community">
    <div className="health-flow-line" aria-hidden="true" />
    {labels.map((label, index) => <div className="health-flow-node" key={label}><span>0{index + 1}</span><strong>{label}</strong><b>{values[index] === undefined ? '—' : index === 3 ? values[index] : values[index].toFixed(1)}</b><small>{index === 0 ? 'environmental stress' : index === 1 ? 'ecosystem stress' : index === 2 ? 'derived exposure context' : 'active alerts'}</small></div>)}
    <div className="health-flow-note">DERIVED / SYNTHETIC DEMONSTRATION DATA<br /><span>NOT A MEDICAL DIAGNOSIS · NOT A REAL POPULATION-HEALTH MEASUREMENT</span></div>
  </div>;
}

export const visualPalette = { LAND, MOSS, SAGE, STONE, INK };
