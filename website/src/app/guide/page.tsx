import Link from 'next/link';
import type { Metadata } from 'next';
import PartRow from '@/components/PartRow';
import { parts, categoryLabels, type PartCategory } from '@/data/parts';
import { walkthroughs } from '@/data/guide';

export const metadata: Metadata = {
  title: 'Build Guide — ExoPet',
  description:
    'Step-by-step guide to building your own ExoPet habitat automation system, with a complete supplies list.',
};

const categoryOrder: PartCategory[] = [
  'compute',
  'electronics',
  'plumbing',
  'power',
  'tools',
];

export default function GuidePage() {
  return (
    <main className="container section">
      <span className="eyebrow">Build guide</span>
      <h1 className="page-title">Build your own ExoPet</h1>
      <p className="lede">
        Two Raspberry Pis, a relay board, some plumbing, and a free afternoon.
        Start with the supplies below, then follow the two walkthroughs: the
        hub first, then the touchscreen.
      </p>

      <div className="grid-2" style={{ marginTop: 'var(--space-6)' }}>
        {walkthroughs.map((w, i) => (
          <Link
            key={w.slug}
            href={`/guide/${w.slug}`}
            className="card card-hover"
            style={{ color: 'inherit', display: 'block' }}
          >
            <span className="eyebrow">Part {i + 1}</span>
            <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-3)' }}>
              {w.title}
            </h2>
            <p style={{ color: 'var(--ink-soft)', marginBottom: 'var(--space-4)' }}>
              {w.intro}
            </p>
            <div className="badge-row" style={{ margin: 0 }}>
              <span className="badge">{w.duration}</span>
              <span className="badge">{w.difficulty}</span>
              <span className="badge">{w.steps.length} steps</span>
            </div>
          </Link>
        ))}
      </div>

      <section style={{ marginTop: 'var(--space-7)' }} id="supplies">
        <span className="eyebrow">Supplies</span>
        <h2 className="page-title" style={{ fontSize: '2.25rem' }}>
          Everything you&rsquo;ll need
        </h2>
        <p className="lede" style={{ fontSize: '1.0625rem' }}>
          Rough total: about $350 for the full build, less if you already keep
          a parts drawer. Buy links below are affiliate links — purchases
          support the project at no extra cost to you.
        </p>

        {categoryOrder.map((cat) => (
          <div key={cat} className="part-category">
            <h3>{categoryLabels[cat]}</h3>
            {parts
              .filter((p) => p.category === cat)
              .map((p) => (
                <PartRow key={p.id} part={p} />
              ))}
          </div>
        ))}
      </section>
    </main>
  );
}
