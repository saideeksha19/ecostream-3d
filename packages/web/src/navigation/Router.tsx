import { createContext, useContext, useEffect, useLayoutEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

export type ProductRoute = 'home' | 'digital-twin' | 'not-found';
export function resolveRoute(pathname: string): ProductRoute {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? 'home' : path === '/digital-twin' ? 'digital-twin' : 'not-found';
}
export function isPlainNavigation(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}
interface LocationState { pathname: string; hash: string; restore: [number, number] | null; revision: number }
const RouterContext = createContext<{ location: LocationState; navigate: (href: string) => void } | null>(null);

function scrollToLocation(location: LocationState) {
  if (location.restore) { window.scrollTo(...location.restore); return; }
  if (location.hash) {
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const element = document.getElementById(id);
    if (element) { element.scrollIntoView({ block: 'start' }); element.focus({ preventScroll: true }); return; }
  }
  window.scrollTo(0, 0);
}

/** Two product routes, native URLs and anchors, no extra routing dependency. */
export function Router({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationState>(() => ({ pathname: window.location.pathname, hash: window.location.hash, restore: null, revision: 0 }));
  useEffect(() => {
    const restoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const onPop = () => setLocation((previous) => ({ pathname: window.location.pathname, hash: window.location.hash, restore: history.state?.ecoScroll ?? null, revision: previous.revision + 1 }));
    const onHash = () => setLocation((previous) => ({ pathname: window.location.pathname, hash: window.location.hash, restore: null, revision: previous.revision + 1 }));
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => { history.scrollRestoration = restoration; window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onHash); };
  }, []);
  useLayoutEffect(() => { scrollToLocation(location); }, [location]);
  function navigate(href: string) {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) { window.location.assign(url.href); return; }
    history.replaceState({ ...history.state, ecoScroll: [window.scrollX, window.scrollY] }, '');
    const destination = url.pathname + url.search + url.hash;
    if (destination !== window.location.pathname + window.location.search + window.location.hash) history.pushState({ ecoScroll: null }, '', destination);
    setLocation((previous) => ({ pathname: url.pathname, hash: url.hash, restore: null, revision: previous.revision + 1 }));
  }
  return <RouterContext.Provider value={{ location, navigate }}>{children}</RouterContext.Provider>;
}

export function useLocation() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('Product navigation must be rendered inside Router.');
  return router;
}

export function AppLink({ href = '/', onClick, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useLocation();
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (!isPlainNavigation(event) || props.target || props.download !== undefined || new URL(href, window.location.href).origin !== window.location.origin) return;
    event.preventDefault();
    navigate(href);
  }}>{children}</a>;
}
