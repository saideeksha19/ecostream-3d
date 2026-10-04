import type { RiskAssessment, ScenarioRun } from '@ecostream/shared';
import { EcoStore } from '../db/store';
import { computeWatershedRisk } from '../risk/sweep';
import { nowForRun } from '../risk/engine';
import { createRun, materializeRun, scenarioById } from '../scenario/engine';

/**
 * Application service. Owns the digital-twin state machine:
 *   recompute()   → analysis + risk sweep over effective observations
 *   runScenario() → materialize SIMULATED observations → recompute
 *   reset()       → deactivate run, drop its observations → recompute
 */
export class EcoApp {
  constructor(readonly store: EcoStore) {}

  /** Run the full pipeline over the current effective world state. */
  recompute(): RiskAssessment[] {
    const run = this.store.activeRun() ?? null;
    const assessments = computeWatershedRisk(
      this.store.zones,
      this.store.points,
      (zoneId) => this.store.effectiveObservations(zoneId, run?.id ?? null),
      run,
      nowForRun(run?.id ?? null),
    );
    this.store.setAssessments(run?.id ?? null, assessments);
    return assessments;
  }

  /** Materialize a scenario as SIMULATED observations, then recompute. */
  runScenario(scenarioId: string, params?: Record<string, number>): ScenarioRun {
    const def = scenarioById(scenarioId);
    if (!def) throw new Error(`unknown scenario: ${scenarioId}`);

    const current = this.store.activeRun();
    if (current) {
      current.status = 'RESET';
      current.endedAt = new Date().toISOString();
      this.store.dropRunObservations(current.id);
    }

    const run = createRun(def, params, this.store.scenarioRuns.length + 1);
    const obs = materializeRun(run, this.store.zones, this.store.points);
    this.store.scenarioRuns.push(run);
    this.store.observations.push(...obs);
    this.store.reindex();
    this.recompute();
    this.store.save();
    return run;
  }

  /** Deactivate the active run and recompute back to baseline. */
  reset(): void {
    const current = this.store.activeRun();
    if (!current) return;
    current.status = 'RESET';
    current.endedAt = new Date().toISOString();
    this.store.dropRunObservations(current.id);
    this.recompute();
    this.store.save();
  }
}
