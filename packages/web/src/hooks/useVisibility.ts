import { useEffect, useRef, useState } from 'react';

/** Browser intersection notifications only: no per-scroll React updates. */
export function useVisibility<T extends HTMLElement>(rootMargin = '0px') {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const isNearViewport = () => {
      const rect = element.getBoundingClientRect();
      const margin = 160;
      return rect.bottom > -margin && rect.top < window.innerHeight + margin;
    };
    const updateOnResize = () => setVisible(isNearViewport());
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      if (entry) setVisible(entry.isIntersecting || isNearViewport());
    }, { rootMargin });
    observer.observe(element);
    window.addEventListener('resize', updateOnResize);
    updateOnResize();
    return () => { observer.disconnect(); window.removeEventListener('resize', updateOnResize); };
  }, [rootMargin]);
  return { ref, visible };
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
