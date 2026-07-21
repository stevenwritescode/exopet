import type { StlModel } from '@/data/stls';

export default function StlCard({ model }: { model: StlModel }) {
  return (
    <div className="card card-hover">
      <div className="stl-preview">Render preview coming soon</div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>
        {model.name}
      </h3>
      <p style={{ fontSize: '0.9375rem', color: 'var(--ink-soft)' }}>
        {model.description}
      </p>
      <div className="print-settings">
        <span>
          Material <strong>{model.material}</strong>
        </span>
        <span>
          Infill <strong>{model.infill}</strong>
        </span>
        <span>
          Supports <strong>{model.supports ? 'Yes' : 'No'}</strong>
        </span>
        <span>
          Print time <strong>{model.printTime}</strong>
        </span>
      </div>
      <a href={model.file} download className="btn btn-secondary btn-small">
        ↓ Download STL
      </a>
    </div>
  );
}
