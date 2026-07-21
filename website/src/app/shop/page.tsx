import type { Metadata } from 'next';
import KitCard from '@/components/KitCard';
import WaitlistForm from '@/components/WaitlistForm';
import { kits } from '@/data/kits';

export const metadata: Metadata = {
  title: 'Shop — ExoPet',
  description:
    'Pre-made ExoPet kits: pre-flashed, pre-wired, and ready to go. Join the waitlist.',
};

export default function ShopPage() {
  return (
    <main className="container section">
      <span className="eyebrow">Shop</span>
      <h1 className="page-title">Skip the soldering.</h1>
      <p className="lede">
        Kits are in development: the same open-source ExoPet, but pre-flashed,
        pre-wired, and tested before it ships. Join a waitlist and we&rsquo;ll
        email you the moment your kit is ready — no spam, just the one email.
      </p>

      <div className="grid-3" style={{ marginTop: 'var(--space-6)' }}>
        {kits.map((kit) => (
          <KitCard key={kit.id} kit={kit} />
        ))}
      </div>

      <div
        className="card"
        style={{ marginTop: 'var(--space-6)', maxWidth: '36rem' }}
      >
        <h2 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-2)' }}>
          Not sure which kit?
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
          Join the general list and we&rsquo;ll let you know when any kit goes
          on sale.
        </p>
        <WaitlistForm kitName="ExoPet kits (general interest)" />
      </div>
    </main>
  );
}
