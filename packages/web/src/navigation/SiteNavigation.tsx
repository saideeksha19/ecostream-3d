import { useEffect, useState } from 'react';
import { AppLink, resolveRoute, useLocation } from './Router';
import { useVisibility } from '../hooks/useVisibility';

export const PRODUCT_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#observation', label: 'Observation' },
  { href: '/digital-twin', label: 'Digital Twin' },
];

export function Brand() {
  return (
    <AppLink className="product-brand" href="/" aria-label="EcoStream home">
      <svg viewBox="0 0 32 36" fill="none" className="brand-icon" aria-hidden="true">
        <path d="M16 2 3 10v16l13 8 13-8V10L16 2Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 9c-15 5 4 10-10 17M26 14c-15 5 3 9-8 16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="brand-title">
        EcoStream <em>3D</em>
      </span>
    </AppLink>
  );
}

export function SiteNavigation() {
  const { location } = useLocation();
  const twin = resolveRoute(location.pathname) === 'digital-twin';
  const [open, setOpen] = useState(false);
  const { ref, visible } = useVisibility<HTMLDivElement>();

  useEffect(() => setOpen(false), [location]);

  return (
    <>
      <div className="nav-sentinel" ref={ref} aria-hidden="true" />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={`site-nav ${twin ? 'site-nav-twin' : ''} ${!visible ? 'is-compact' : ''}`}>
        <Brand />

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="product-navigation"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen(!open)}
        >
          <span className="nav-toggle-label">{open ? 'Close' : 'Menu'}</span>
          <span aria-hidden="true">{open ? '−' : '☰'}</span>
        </button>

        <nav
          id="product-navigation"
          className={open ? 'nav-open' : ''}
          aria-label="Product navigation"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              document.querySelector<HTMLButtonElement>('.nav-toggle')?.focus();
            }
          }}
        >
          {PRODUCT_LINKS.map((link) => {
            const isTwin = link.href === '/digital-twin' && twin;
            const isHome = link.href === '/' && !twin && !location.hash;
            const isHash = link.href.endsWith(location.hash) && Boolean(location.hash) && !twin;
            const isActive = isTwin || isHome || isHash;

            return (
              <AppLink
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? (isTwin || isHome ? 'page' : 'location') : undefined}
              >
                {link.label}
              </AppLink>
            );
          })}
        </nav>

        <AppLink className="nav-cta" href="/digital-twin">
          Explore Twin <span aria-hidden="true">→</span>
        </AppLink>
      </header>
    </>
  );
}


