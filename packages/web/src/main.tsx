import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useApp } from './store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dev-only debug handle (tree-shaken from production builds).
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__eco = useApp;
}
