import { AppLink } from './Router';
import { Brand, PRODUCT_LINKS } from './SiteNavigation';

export function SiteFooter() {
  return <footer className="site-footer">
    <div><Brand /><p>Immersive Urban Watershed<br />&amp; Resilience Digital Twin</p></div>
    <nav aria-label="Footer navigation">{PRODUCT_LINKS.map((link) => <AppLink key={link.href} href={link.href}>{link.label}</AppLink>)}</nav>
    <div className="footer-disclosure"><span>BUILT FOR UNDERSTANDING, NOT CERTAINTY.</span><p>Synthetic demonstration data.<br />Illustrative geography.<br />Deterministic / non-calibrated analytical demonstration.</p></div>
    <div className="footer-bottom"><span>ECOSTREAM 3D / ENVIRONMENTAL DECISION SUPPORT</span><AppLink href="/#home">Back to top ↑</AppLink></div>
  </footer>;
}
