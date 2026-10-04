import { AppLink } from '../navigation/Router';

export function Gateway() {
  return (
    <section className="twin-gateway section-wrap" id="enter-digital-twin" aria-labelledby="gateway-title" tabIndex={-1}>
      <span id="gateway" className="anchor-alias" />
      <div className="gateway-content">
        <span className="section-label">ENTER THE DIGITAL TWIN</span>
        <h2 id="gateway-title">
          Step inside<br />
          <em>the watershed.</em>
        </h2>
        <p className="gateway-description">
          Explore the watershed as a living analytical model — with interactive 3D terrain, spatial zones, monitoring stations, scenario testing, and predictive indicators.
        </p>
        <AppLink className="gateway-cta" href="/digital-twin">
          Explore Digital Twin <span aria-hidden="true">→</span>
        </AppLink>
      </div>
    </section>
  );
}
