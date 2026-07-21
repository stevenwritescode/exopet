import { buildAffiliateUrl } from '@/data/affiliate';
import type { Part } from '@/data/parts';

export default function PartRow({ part }: { part: Part }) {
  return (
    <div className="part-row" id={part.id}>
      <div className="part-info">
        <div className="part-name">
          {part.name}
          {part.optional && <span className="optional-tag">Optional</span>}
        </div>
        <div className="part-desc">{part.description}</div>
      </div>
      <div className="part-meta">
        <span className="price">{part.priceEstimate}</span>
        Qty: {part.quantity}
      </div>
      <a
        className="btn btn-secondary btn-small"
        href={buildAffiliateUrl(part.vendorUrl)}
        target="_blank"
        rel="noopener sponsored"
      >
        Buy
      </a>
    </div>
  );
}
