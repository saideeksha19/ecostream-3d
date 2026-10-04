const STEPS = [
  { index: '01', title: 'Understand', copy: 'Environmental observations become understandable signals.' },
  { index: '02', title: 'Analyze', copy: 'Detect unusual environmental conditions and changing trends.' },
  { index: '03', title: 'Connect', copy: 'Understand relationships between upstream and downstream areas.' },
  { index: '04', title: 'Decide', copy: 'Use scenarios, forecasts and One Health signals to support human decisions.' },
];

export function AboutStory() {
  return (
    <section className="story-section about-story" id="about" aria-labelledby="about-title" tabIndex={-1}>
      <div className="story-head section-wrap" data-reveal="up">
        <span className="section-label">ABOUT ECOSTREAM</span>
        <h2 id="about-title">A living system,<br /><em>read as signals.</em></h2>
      </div>
      <ol className="story-steps">
        {STEPS.map((step) => (
          <li className="story-step" key={step.index} data-reveal="up">
            <span className="story-marker" aria-hidden="true" />
            <div className="story-copy">
              <span className="story-index">{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
