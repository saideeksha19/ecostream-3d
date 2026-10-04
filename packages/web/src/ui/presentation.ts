import type { ScenarioRun } from '@ecostream/shared';
import type { ZoneDetailDTO } from '../services/api';

export type { ZoneDetailDTO };

/** Do not label a previous run's detail as the current assessment while it refreshes. */
export function currentZoneDetail(
  detail: ZoneDetailDTO | null,
  selectedZoneId: string | null,
  activeRun: ScenarioRun | null,
): ZoneDetailDTO | null {
  if (!detail || detail.zone.id !== selectedZoneId) return null;
  return (detail.activeRun?.id ?? null) === (activeRun?.id ?? null) ? detail : null;
}

export const PROVENANCE_LABELS: Record<string, string> = {
  OBSERVED: 'OBSERVED',
  SIMULATED: 'SIMULATED',
  CITIZEN: 'CITIZEN REPORT',
  DERIVED: 'DERIVED',
  HUMAN_VERIFIED: 'HUMAN VERIFIED',
};

export const PROVENANCE_NOTES: Record<string, string> = {
  OBSERVED: 'Station readings. Synthetic observations in this demonstration, not live measurements.',
  SIMULATED: 'Scenario-generated data, not a measurement.',
  CITIZEN: 'Citizen-report source. Synthetic in this demonstration; not automatically human verified.',
  DERIVED: 'Computed from input data by the demonstration engines.',
  HUMAN_VERIFIED: 'Explicitly confirmed by a human operator.',
};
