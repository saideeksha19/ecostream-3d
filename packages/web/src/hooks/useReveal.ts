import { useEffect } from 'react';

/** Adds one class per visible story item; no animation loop or scroll handler. */
export function useReveal() {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('reveal-visible'); observer.unobserve(entry.target); } }), { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}
