export function FlowTransition({ label, id }: { label?: string; id?: string }) {
  return (
    <div className="flow-transition-wrapper" id={id} aria-hidden="true">
      {label && <span className="flow-label">{label}</span>}
    </div>
  );
}
