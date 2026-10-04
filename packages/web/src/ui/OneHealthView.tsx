import type { OneHealthDimension, OneHealthSnapshot, OneHealthWatershedSummary } from '@ecostream/shared';
import { Meter, Provenance } from './Primitives';

const DIMENSION_LABELS: Record<OneHealthDimension['id'], string> = { environment: 'Environmental stress', ecosystem: 'Ecosystem stress', exposure: 'Human exposure', community: 'Community impact' };

export function OneHealthView({ snapshot, watershed }: { snapshot: OneHealthSnapshot | null; watershed: OneHealthWatershedSummary | null }) {
  if (!snapshot) return <div className="empty-hint">No One Health snapshot is available for this zone.</div>;
  return <>
    <h3 className="section-title">Connected impacts <Provenance value="DERIVED" /></h3>
    <p className="intro-copy">Environmental change across ecosystems, human exposure and community impact.</p>
    <div className="data-status">{snapshot.dataStatus}</div>
    <div className="oh-overall"><span>Overall signal</span><strong className={`band-${snapshot.overallSignal.toLowerCase()}`}>{snapshot.overallSignal}</strong><b>{snapshot.overallIndex.toFixed(1)}<small>/ 100</small></b></div>
    <div className="oh-dim-list">{snapshot.dimensions.map((dimension) => <section className="oh-dimension" key={dimension.id}>
      <div className="oh-dim-top"><h4>{DIMENSION_LABELS[dimension.id]}</h4><strong>{dimension.index.toFixed(1)}</strong></div>
      <Meter value={dimension.index} label={DIMENSION_LABELS[dimension.id]} />
      <div className="dimension-meta"><span className={`band-${dimension.band.toLowerCase()}`}>{dimension.band}</span><Provenance value={dimension.provenance} /></div>
      <p className="comp-summary">{dimension.summary}</p>
    </section>)}</div>
    <h4 className="mini-title">Contributing signals</h4><ul className="driver-list">{snapshot.drivers.map((driver) => <li key={driver}>{driver}</li>)}</ul>
    <div className="method-note"><Provenance value="DERIVED" /><p>{snapshot.decisionNote}</p><p>Environmental decision support only. Not a medical assessment.</p></div>
    {watershed && <details className="watershed-health"><summary>Watershed context · {watershed.zoneCount} zones</summary><div className="metadata-row"><span>Environmental stress</span><b>{watershed.environmentalStress.toFixed(1)}</b></div><div className="metadata-row"><span>Ecosystem stress</span><b>{watershed.ecosystemStress.toFixed(1)}</b></div><div className="metadata-row"><span>Human exposure</span><b>{watershed.humanExposure.toFixed(1)}</b></div><div className="metadata-row"><span>Active model alerts</span><b>{watershed.activeAlerts}</b></div>{watershed.highestConcern && <p className="muted-line">Highest concern: {watershed.highestConcern.zoneName} · {watershed.highestConcern.score.toFixed(1)}</p>}<Provenance value={watershed.provenance} /><div className="data-status">{watershed.dataStatus}</div></details>}
  </>;
}
