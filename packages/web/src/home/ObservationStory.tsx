import { VARIABLE_META, type WaterVariable } from '@ecostream/shared';

const OBSERVATIONS: { variable: WaterVariable; copy: string }[] = [
  { variable: 'turbidity', copy: 'Cloudiness from suspended particles — the first visible response of a river to runoff and erosion.' },
  { variable: 'conductivity', copy: 'Dissolved ions carried by the water — an early trace of what the landscape releases into it.' },
  { variable: 'dissolved_oxygen', copy: 'The oxygen available to aquatic life — what the river can support when conditions change.' },
  { variable: 'water_level', copy: 'The river’s stage — how the same watershed responds, hour by hour, to rain and flow.' },
  { variable: 'temperature', copy: 'The thermal shape of the water — a quiet control on habitat, chemistry and oxygen.' },
];

export function ObservationStory() {
  return (
    <section className="story-section obs-story" id="observation" aria-labelledby="observation-title" tabIndex={-1}>
      <div className="story-head section-wrap" data-reveal="up">
        <span className="section-label">OBSERVE THE WATERSHED</span>
        <h2 id="observation-title">Every signal has<br /><em>a source.</em></h2>
      </div>
      <ol className="story-steps obs-steps">
        {OBSERVATIONS.map(({ variable, copy }, position) => {
          const meta = VARIABLE_META[variable];
          return (
            <li className="story-step" key={variable} data-reveal="up">
              <span className="story-marker" aria-hidden="true" />
              <div className="story-copy">
                <span className="story-index">OBSERVATION {String(position + 1).padStart(2, '0')}</span>
                <h3>{meta.label.toUpperCase()} <small>{meta.unit}</small></h3>
                <p>{copy}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="obs-cascade section-wrap" data-reveal="up" aria-label="From observations to risk">
        <span>OBSERVATIONS</span>
        <i aria-hidden="true">↓</i>
        <span>ANALYSIS</span>
        <i aria-hidden="true">↓</i>
        <span>RISK</span>
      </div>
    </section>
  );
}
