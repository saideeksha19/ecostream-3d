import { useState } from 'react';
import { SCENARIO_CATALOG, useApp, type ScenarioId } from '../store';

/** Display-only controls; parameter definitions and all actions stay in the store. */
export function ScenarioControl() {
  const runScenario = useApp((s) => s.runScenario);
  const reset = useApp((s) => s.reset);
  const activeRun = useApp((s) => s.activeRun);
  const busy = useApp((s) => s.busy);
  const ready = useApp((s) => s.ready);
  const [selectedId, setSelectedId] = useState<ScenarioId>('HEAVY_URBAN_RUNOFF');
  const [params, setParams] = useState<Record<string, Record<string, number>>>({});
  const def = SCENARIO_CATALOG.find((scenario) => scenario.id === selectedId)!;
  const paramValues = params[selectedId] ?? Object.fromEntries(def.params.map((p) => [p.key, p.default]));

  return (
    <section className="rail-section simulation-control" aria-labelledby="simulation-title">
      <div className="section-heading"><h2 id="simulation-title">Scenario simulation</h2><span className="technical-label">WHAT IF</span></div>
      <div className="simulation-flow" aria-label="Baseline to simulation to updated digital twin"><span>BASELINE</span><i>→</i><span>SIMULATE</span><i>→</i><span>TWIN</span></div>
      <label className="sr-only" htmlFor="scenario">Scenario</label>
      <select id="scenario" value={selectedId} disabled={busy || !ready} onChange={(event) => setSelectedId(event.target.value as ScenarioId)}>
        {SCENARIO_CATALOG.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.name}</option>)}
      </select>
      <p className="scenario-desc">{def.description}</p>
      <div className="param-block">
        {def.params.map((p) => (
          <label key={p.key} className="param-row">
            <span>{p.label}<output>{(paramValues[p.key] ?? p.default).toFixed(1)}{p.unit}</output></span>
            <input type="range" min={p.min} max={p.max} step={p.step} value={paramValues[p.key] ?? p.default} disabled={busy || !ready}
              onChange={(event) => setParams((previous) => ({ ...previous, [selectedId]: { ...paramValues, [p.key]: Number(event.target.value) } }))} />
          </label>
        ))}
      </div>
      <div className="action-row">
        <button className="btn btn-primary" disabled={busy || !ready} onClick={() => void runScenario(def.id, paramValues)}>{busy ? 'Updating…' : 'Simulate'}<span aria-hidden="true">↗</span></button>
        <button className="btn btn-reset" disabled={busy || !activeRun} onClick={() => void reset()}>Reset</button>
      </div>
      <p className="fine-print">Scenario outputs are simulated, never measurements.</p>
    </section>
  );
}
