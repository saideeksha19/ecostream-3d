import { useEffect, useRef } from 'react';
import { useApp } from './store';
import { Router, AppLink, resolveRoute, useLocation } from './navigation/Router';
import { SiteNavigation } from './navigation/SiteNavigation';
import { SiteFooter } from './navigation/SiteFooter';
import { Home } from './pages/Home';
import { DigitalTwin } from './pages/DigitalTwin';
import { useSystemHealth } from './hooks/useSystemHealth';
import './styles.css';
import './product.css';

function Product() {
  const bootstrap = useApp((state) => state.bootstrap);
  const initialized = useRef(false);
  const { location } = useLocation();
  const route = resolveRoute(location.pathname);
  const health = useSystemHealth();
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; void bootstrap(); }
  }, [bootstrap]);
  useEffect(() => {
    document.title = route === 'home' ? 'EcoStream — Immersive Urban Watershed & Resilience Digital Twin' : route === 'digital-twin' ? 'Digital Twin — EcoStream' : 'Page not found — EcoStream';
    document.body.classList.toggle('product-home', route === 'home');
    document.body.classList.toggle('product-digital-twin', route === 'digital-twin');
    return () => { document.body.classList.remove('product-home', 'product-digital-twin'); };
  }, [route]);
  return <div className={`product-shell product-${route}`}>
    <SiteNavigation />
    {route === 'home' ? <Home health={health} /> : route === 'digital-twin' ? <DigitalTwin health={health} /> : <><main id="main-content" tabIndex={-1} className="not-found"><span className="eyebrow">404 / OUTSIDE THE WATERSHED</span><h1>This route is not mapped.</h1><p>Return to the product story or open the interactive Digital Twin.</p><AppLink className="product-button" href="/">Back to home →</AppLink><AppLink href="/digital-twin">Enter Digital Twin →</AppLink></main><SiteFooter /></>}
  </div>;
}

export default function App() { return <Router><Product /></Router>; }
