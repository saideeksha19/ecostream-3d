import type { HealthDTO } from '../services/api';
import { useApp } from '../store';
import { AppLink } from '../navigation/Router';
import { TwinViewport } from '../components/TwinViewport';

export function Hero({ health }: { health: HealthDTO | null }) {
  const selectedZoneId = useApp((state) => state.selectedZoneId);
  const zones = useApp((state) => state.zones);
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <section className="home-hero-editorial" id="home" aria-labelledby="hero-title" tabIndex={-1}>
      <div className="hero-editorial-wrap">
        <div className="hero-typography">
          <h1 id="hero-title">
            UNDERSTAND<br />
            <em>THE LIVING</em><br />
            WATERSHED.
          </h1>

          <p className="hero-lead">
            Environmental intelligence for understanding, simulating and responding to connected urban watershed conditions.
          </p>

          <div className="hero-cta">
            <AppLink className="hero-primary-link" href="/digital-twin">
              Explore Digital Twin <span aria-hidden="true">→</span>
            </AppLink>
          </div>
        </div>

        <div className="hero-viewport">
          <TwinViewport className="hero-twin-viewport" selectionEnabled={true} />
          {selectedZone && (
            <div className="hero-zone-indicator">
              <span>Selected: {selectedZone.name}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


