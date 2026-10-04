import type { HealthDTO } from '../services/api';
import { SiteFooter } from '../navigation/SiteFooter';
import { Hero } from '../home/Hero';
import { AboutStory } from '../home/AboutStory';
import { ObservationStory } from '../home/ObservationStory';
import { Gateway } from '../home/Gateway';
import { useReveal } from '../hooks/useReveal';

export function Home({ health }: { health: HealthDTO | null }) {
  useReveal();

  return (
    <main className="home-page" id="main-content">
      {/* 1. HERO — headline beside the real 3D watershed */}
      <Hero health={health} />

      {/* 2. ABOUT — Understand, Analyze, Connect, Decide */}
      <AboutStory />

      {/* 3. OBSERVATION — five environmental variables, ending in risk */}
      <ObservationStory />

      {/* 4. GATEWAY — into the Digital Twin */}
      <Gateway />

      <SiteFooter />
    </main>
  );
}
