import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { useReducedMotion, useVisibility } from '../hooks/useVisibility';

const WatershedScene = lazy(() => import('../three/WatershedScene').then((module) => ({ default: module.WatershedScene })));

/** Reuses the real scene. Offscreen story previews release their WebGL resources. */
export function TwinViewport({ className = '', selectionEnabled = true, children }: { className?: string; selectionEnabled?: boolean; children?: ReactNode }) {
  const { ref, visible } = useVisibility<HTMLDivElement>('80px');
  const ready = useApp((state) => state.ready);
  const error = useApp((state) => state.error);
  const bootstrap = useApp((state) => state.bootstrap);
  const [rotating, setRotating] = useState(true);
  const reduced = useReducedMotion();
  return <div ref={ref} className={`twin-viewport ${className}`} data-scene-visible={visible}>
    <div className="canvas-host">
      {ready && visible ? <Suspense fallback={<SceneLoading />}><WatershedScene active={visible} autoRotate={rotating && !reduced} selectionEnabled={selectionEnabled} /></Suspense> : !ready ? <div className="stage-loading" role="status"><div className="eyebrow">WATERSHED / MODEL INITIALIZATION</div><h2>{error ? 'Watershed unavailable' : 'Preparing the watershed'}</h2><p>{error ? 'The local API could not be reached. The product guide remains available below.' : 'Loading real zone geometry and demonstration assessments…'}</p>{error && <button className="btn" onClick={() => void bootstrap()}>Retry connection</button>}</div> : <div className="offscreen-model" aria-hidden="true">3D WATERSHED / PAUSED OUTSIDE VIEW</div>}
    </div>
    {ready && <div className="model-controls"><span>{reduced ? 'REDUCED MOTION' : rotating ? 'AUTO ORBIT / 55s' : 'MANUAL VIEW'}</span><button disabled={reduced} className="rotation-toggle" aria-pressed={!rotating} aria-label={rotating ? 'Pause automatic rotation' : 'Resume automatic rotation'} title="Camera interaction pauses rotation; it resumes after 3 seconds. You can also pause it here." onClick={() => setRotating(!rotating)}>{rotating && !reduced ? 'Ⅱ Pause' : '▷ Resume'}</button></div>}
    {children}
  </div>;
}

function SceneLoading() { return <div className="stage-loading" role="status"><span className="eyebrow">PREPARING 3D GEOMETRY</span><p>Opening the watershed…</p></div>; }
