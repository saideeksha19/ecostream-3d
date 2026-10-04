import { Provenance } from '../ui/Primitives';
import { AppLink } from '../navigation/Router';

const PROVENANCE = [
  {
    value: 'OBSERVED',
    title: 'What was observed',
    text: 'Station sensor readings, radar inputs, and citizen submissions enter the system tagged with device IDs and timestamps.',
    note: 'Observed values in this demonstration are synthetic.',
  },
  {
    value: 'DERIVED',
    title: 'What was calculated',
    text: 'Hydro-spatial risk, anomaly multipliers, trend vectors, and One Health metrics are computed deterministically from inputs.',
    note: 'Derived values are mathematical calculations, not raw direct measurements.',
  },
  {
    value: 'SIMULATED',
    title: 'What was imagined',
    text: 'Scenario perturbations (e.g. Extreme Rainfall Spikes) evaluate hypothetical events through the identical analytical pipeline.',
    note: 'Simulated values are scenario outputs generated on demand.',
  },
  {
    value: 'HUMAN_VERIFIED',
    title: 'What was confirmed',
    text: 'Human verification badges appear only when an environmental custodian or specialist has recorded a formal audit review.',
    note: 'No human verification is implied by default.',
  },
];

export function TrustAndConclusion() {
  return (
    <>
      {/* 11. PROVENANCE */}
      <section className="provenance-story section-wrap" id="provenance" tabIndex={-1}>
        <div className="section-index" data-reveal="left">
          THE TRUST LAYER <span>05 — DATA INTEGRITY & AUDIT</span>
        </div>
        <div className="provenance-heading" data-reveal="left">
          <span className="eyebrow">MAKE THE MODEL LEGIBLE</span>
          <h2>
            Know what you are<br />
            <em>looking at.</em>
          </h2>
          <p>
            EcoStream keeps provenance visible so a compelling visual never disguises the difference between evidence, calculation, and possibility. All data in this public sandbox is clearly labeled.
          </p>
        </div>
        <div className="provenance-grid">
          {PROVENANCE.map((item, index) => (
            <div className={`provenance-card prov-card-${index}`} data-reveal={index % 2 ? 'right' : 'left'} key={item.value}>
              <span>0{index + 1}</span>
              <Provenance value={item.value} />
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <small>{item.note}</small>
            </div>
          ))}
        </div>
      </section>

      {/* 13. CONCLUSION */}
      <section className="conclusion section-wrap" id="conclusion" tabIndex={-1}>
        <div className="conclusion-copy" data-reveal="left">
          <span className="eyebrow">THE TAKEAWAY</span>
          <h2>
            See the watershed as a<br />
            <em>living system.</em>
          </h2>
          <p>
            EcoStream brings environmental observations, spatial analysis, scenario simulation, forecasting and One Health indicators into one interactive model. It helps custodians examine relationships across space, understand evidence and decide what to investigate next.
          </p>
        </div>
        <div className="conclusion-words" data-reveal="right">
          {['OBSERVE', 'UNDERSTAND', 'SIMULATE', 'ANTICIPATE', 'RESPOND'].map((word, index) => (
            <span key={word}>
              <i>0{index + 1}</i>
              {word}
            </span>
          ))}
        </div>
      </section>

      {/* 14. ENTER DIGITAL TWIN (FINAL CTA) */}
      <section className="final-cta section-wrap" id="final-cta" data-reveal="up">
        <div className="final-cta-content">
          <span className="eyebrow">READY TO EXPLORE</span>
          <h2>
            Enter the<br />
            <em>Digital Twin.</em>
          </h2>
          <p>
            Navigate the 3D watershed, inspect telemetry at 13 monitoring stations, test climate scenarios, and explore near-term forecast trajectories.
          </p>
        </div>
        <div className="final-actions">
          <AppLink className="product-button product-button-large" href="/digital-twin">
            ENTER DIGITAL TWIN <span aria-hidden="true">→</span>
          </AppLink>
          <AppLink className="hero-secondary-btn" href="#home">
            BACK TO TOP <span aria-hidden="true">↑</span>
          </AppLink>
        </div>
      </section>
    </>
  );
}
