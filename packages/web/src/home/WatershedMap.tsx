import { RISK_COLORS } from '@ecostream/shared';
import { useApp } from '../store';

/** An explanatory plan view of the same API polygons, not an invented risk map. */
export function WatershedMap({ selectedId }: { selectedId: string | undefined }) {
  const zones = useApp((state) => state.zones);
  const river = useApp((state) => state.riverPath);
  const points = useApp((state) => state.points);
  const assessments = useApp((state) => state.assessments);
  return <svg className="watershed-plan" viewBox="-20 30 880 510" role="img" aria-label="Plan view of actual watershed zones and monitoring points; highlighted zone shows the current analytical example">
    <defs><pattern id="plan-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#34433d" strokeWidth=".7" /></pattern></defs>
    <rect x="0" y="40" width="840" height="480" fill="url(#plan-grid)" />
    <polyline points={river.map((p) => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#497777" strokeWidth="21" />
    <polyline points={river.map((p) => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#93b6b3" strokeWidth="1" />
    {zones.map((zone) => { const selected = zone.id === selectedId; const state = assessments.get(zone.id)?.state; const x = zone.polygon.reduce((sum, p) => sum + p.x, 0) / zone.polygon.length; const z = Math.max(...zone.polygon.map((p) => p.z)); return <g key={zone.id}><polygon points={zone.polygon.map((p) => `${p.x},${p.z}`).join(' ')} fill={state ? RISK_COLORS[state] : '#8ca897'} fillOpacity={selected ? '.28' : '.08'} stroke={selected ? '#d7e8dc' : '#6e897c'} strokeWidth={selected ? '2.5' : '1'} /><text x={x} y={z + 24} textAnchor="middle" fill={selected ? '#eef3ed' : '#9eaca5'} fontSize="13" fontFamily="monospace">{zone.id.toUpperCase()}</text></g>; })}
    {points.map((point) => <circle key={point.id} cx={point.position.x} cy={point.position.z} r="3.5" fill={point.kind === 'SENSOR' ? '#d0e2d4' : '#b6aacb'} />)}
  </svg>;
}
