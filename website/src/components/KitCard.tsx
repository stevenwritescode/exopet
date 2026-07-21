import WaitlistForm from '@/components/WaitlistForm';
import type { Kit } from '@/data/kits';

export default function KitCard({ kit }: { kit: Kit }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>
        {kit.name}
      </h3>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
        {kit.tagline}
      </p>
      <div className="kit-price">
        {kit.expectedPrice}
        <small>expected price — kits not yet on sale</small>
      </div>
      <ul className="kit-contents">
        {kit.contents.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <WaitlistForm kitName={kit.name} />
    </div>
  );
}
